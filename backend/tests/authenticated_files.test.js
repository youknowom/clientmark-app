import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import crypto from "crypto";

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("01234567890123456789012345678901").toString("base64");
process.env.NODE_ENV = "test";
process.env.PORT = "9996";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import ProjectModel from "../models/projectModel.js";
import FileModel from "../models/fileModel.js";
import TimelineModel from "../models/timelineModel.js";
import storageAdapter from "../services/storage/index.js";
import {
  detectFileTypeFromBuffer,
  validateAndSanitizeFile,
} from "../services/fileValidationService.js";

let mongoServer;

// 1x1 transparent PNG buffer
const VALID_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

// Fake image containing HTML/JS payload
const FAKE_IMAGE_EXE_OR_HTML = Buffer.from("<html><script>alert('pwned')</script></html>", "utf8");

// Minimal valid PDF buffer (%PDF-1.4 ...)
const VALID_PDF_BUFFER = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n", "utf8");

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("PART 2: Authenticated Files and Upload Security", () => {
  describe("Upload Validation & Magic Bytes", () => {
    test("detectFileTypeFromBuffer correctly identifies PNG and PDF magic bytes", () => {
      const pngDetected = detectFileTypeFromBuffer(VALID_PNG_BUFFER);
      expect(pngDetected).toBeDefined();
      expect(pngDetected.type).toBe("image");
      expect(pngDetected.ext).toBe(".png");

      const pdfDetected = detectFileTypeFromBuffer(VALID_PDF_BUFFER);
      expect(pdfDetected).toBeDefined();
      expect(pdfDetected.type).toBe("pdf");
      expect(pdfDetected.ext).toBe(".pdf");
    });

    test("Renamed .html or .exe disguised as an image is rejected by magic bytes", async () => {
      await expect(
        validateAndSanitizeFile(FAKE_IMAGE_EXE_OR_HTML, "malicious.png", { isPrivate: true })
      ).rejects.toThrow(/corrupted, unsupported, or disguised executable\/html/);
    });

    test("SVG is rejected for private uploads", async () => {
      const svgBuffer = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><circle/></svg>", "utf8");
      await expect(
        validateAndSanitizeFile(svgBuffer, "diagram.svg", { isPrivate: true })
      ).rejects.toThrow(/SVG files are not permitted for private uploads/);
    });

    test("Valid PNG image passes validation and is sanitized by Sharp", async () => {
      const sanitized = await validateAndSanitizeFile(VALID_PNG_BUFFER, "photo.png", { isPrivate: true });
      expect(sanitized.fileType).toBe("image");
      expect(sanitized.ext).toBe(".png");
      expect(sanitized.buffer).toBeDefined();
      expect(sanitized.size).toBeGreaterThan(0);
    });
  });

  describe("File Access Authorization & Isolation", () => {
    let tenantA, tenantB;
    let userA, userB;
    let tokenA, tokenB;
    let projectA, projectB;
    let portalTokenA, portalTokenB;
    let fileDocA, fileDocB;

    beforeEach(async () => {
      // 1. Tenants
      tenantA = await TenantModel.create({
        companyName: "Tenant Alpha",
        slug: "tenant-alpha",
        email: "alpha@example.com",
        status: "Active",
      });

      tenantB = await TenantModel.create({
        companyName: "Tenant Beta",
        slug: "tenant-beta",
        email: "beta@example.com",
        status: "Active",
      });

      // 2. Roles
      const roleA = await RoleModel.create({
        roleName: "Staff",
        priority: 2,
        tenantId: tenantA._id,
        permissions: ["view:project"],
      });

      const roleB = await RoleModel.create({
        roleName: "Staff",
        priority: 2,
        tenantId: tenantB._id,
        permissions: ["view:project"],
      });

      // 3. Staff Users
      userA = await UserModel.create({
        fullName: "User Alpha",
        userName: "useralpha",
        email: "alpha@user.com",
        password: "hashed_password",
        tenantId: tenantA._id,
        roleId: roleA._id,
        status: "Active",
        tokenVersion: 1,
      });

      userB = await UserModel.create({
        fullName: "User Beta",
        userName: "userbeta",
        email: "beta@user.com",
        password: "hashed_password",
        tenantId: tenantB._id,
        roleId: roleB._id,
        status: "Active",
        tokenVersion: 1,
      });

      tokenA = jwt.sign(
        { userId: userA._id, tenantId: tenantA._id, role: "Staff", tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      tokenB = jwt.sign(
        { userId: userB._id, tenantId: tenantB._id, role: "Staff", tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // 4. Projects
      projectA = await ProjectModel.create({
        ProjectId: "PRJ-ALPHA-01",
        ProjectName: "Project Alpha",
        ClientName: "Client Alpha",
        slug: "proj-alpha-1234",
        tenantId: tenantA._id,
        clientMobile: "1111111111",
      });

      projectB = await ProjectModel.create({
        ProjectId: "PRJ-BETA-02",
        ProjectName: "Project Beta",
        ClientName: "Client Beta",
        slug: "proj-beta-5678",
        tenantId: tenantB._id,
        clientMobile: "2222222222",
      });

      portalTokenA = jwt.sign(
        { projectId: projectA._id, tenantId: tenantA._id, purpose: "portal" },
        process.env.PORTAL_JWT_SECRET,
        { expiresIn: "2h" }
      );

      portalTokenB = jwt.sign(
        { projectId: projectB._id, tenantId: tenantB._id, purpose: "portal" },
        process.env.PORTAL_JWT_SECRET,
        { expiresIn: "2h" }
      );

      // 5. Store files for Tenant A & Tenant B on disk via storageAdapter
      const fileIdA = crypto.randomUUID();
      const fileIdB = crypto.randomUUID();

      const savedA = await storageAdapter.saveFile(tenantA._id, `${fileIdA}.png`, VALID_PNG_BUFFER);
      const savedB = await storageAdapter.saveFile(tenantB._id, `${fileIdB}.png`, VALID_PNG_BUFFER);

      fileDocA = await FileModel.create({
        fileId: fileIdA,
        tenantId: tenantA._id,
        projectId: projectA._id,
        uploadedBy: userA._id,
        originalName: "alpha_blueprint.png",
        storedFileName: `${fileIdA}.png`,
        storagePath: savedA.storagePath,
        mimeType: "image/png",
        size: VALID_PNG_BUFFER.length,
        fileCategory: "timeline",
        isPublic: false,
      });

      fileDocB = await FileModel.create({
        fileId: fileIdB,
        tenantId: tenantB._id,
        projectId: projectB._id,
        uploadedBy: userB._id,
        originalName: "beta_secret.png",
        storedFileName: `${fileIdB}.png`,
        storagePath: savedB.storagePath,
        mimeType: "image/png",
        size: VALID_PNG_BUFFER.length,
        fileCategory: "timeline",
        isPublic: false,
      });
    });

    test("Unauthenticated request returns 401", async () => {
      const res = await request(app).get(`/files/${fileDocA.fileId}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Authentication required");
    });

    test("Staff of Tenant A can fetch Tenant A's file with security headers", async () => {
      const res = await request(app)
        .get(`/files/${fileDocA.fileId}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["content-disposition"]).toContain("alpha_blueprint.png");
      expect(res.body.length).toBeGreaterThan(0);
    });

    test("Staff of Tenant B CANNOT fetch Tenant A's file (returns 403)", async () => {
      const res = await request(app)
        .get(`/files/${fileDocA.fileId}`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Access denied. File belongs to another tenant.");
    });

    test("Portal token for Project A can fetch Project A's file", async () => {
      const res = await request(app)
        .get(`/files/${fileDocA.fileId}`)
        .set("Authorization", `Bearer ${portalTokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    test("Portal token for Project B CANNOT fetch Project A's file (returns 403)", async () => {
      const res = await request(app)
        .get(`/files/${fileDocA.fileId}`)
        .set("Authorization", `Bearer ${portalTokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Access denied");
    });

    test("Query token parameter ?token=... is supported for browser media tags", async () => {
      const res = await request(app).get(`/files/${fileDocA.fileId}?token=${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
    });

    test("Path traversal attempt in fileId is rejected", async () => {
      const res = await request(app)
        .get(`/files/..%2F..%2Fpackage.json`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect([400, 404]).toContain(res.status);
    });
  });

  describe("Demo Tenant Timeline Upload Guardrail", () => {
    test("Demo tenant timeline upload is blocked with 403", async () => {
      const demoTenant = await TenantModel.create({
        companyName: "Demo Agency",
        slug: "demo",
        email: "demo@example.com",
        status: "Active",
        isDemo: true,
      });

      const demoRole = await RoleModel.create({
        roleName: "Admin",
        priority: 1,
        tenantId: demoTenant._id,
      });

      const demoUser = await UserModel.create({
        fullName: "Demo Admin",
        userName: "demouser",
        email: "demo@user.com",
        password: "hashed_password",
        tenantId: demoTenant._id,
        roleId: demoRole._id,
        status: "Active",
        tokenVersion: 1,
        isDemo: true,
      });

      const demoToken = jwt.sign(
        { userId: demoUser._id, tenantId: demoTenant._id, role: "Admin", tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const demoProject = await ProjectModel.create({
        ProjectId: "PRJ-DEMO-01",
        ProjectName: "Demo Project",
        ClientName: "Demo Client",
        slug: "demo-proj-999",
        tenantId: demoTenant._id,
        clientMobile: "9999999999",
      });

      const res = await request(app)
        .post(`/project/${demoProject._id}/timeline`)
        .set("Authorization", `Bearer ${demoToken}`)
        .field("moduleName", "Design")
        .field("phase", "Wireframes")
        .field("description", "Testing demo upload block")
        .attach("attachments", VALID_PNG_BUFFER, "test.png");

      expect(res.status).toBe(403);
      expect(res.body.isDemoBlocked).toBe(true);
    });
  });
});
