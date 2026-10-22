import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.NODE_ENV = "test";
process.env.PORT = "9998";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import ProjectModel from "../models/projectModel.js";
import TimelineModel from "../models/timelineModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import OTPModel from "../models/otpModel.js";
import OTPRateLimitModel from "../models/otpRateLimitModel.js";
import PasswordResetTokenModel from "../models/passwordResetTokenModel.js";
import PlanModel from "../models/planModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import { generateAndSaveOTP, verifyOTP } from "../services/otpService.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Safety Assertion: Refuse to run against any non-local / non-memory database
  if (
    !uri.includes("127.0.0.1") &&
    !uri.includes("localhost") &&
    !uri.startsWith("mongodb://")
  ) {
    throw new Error(
      `CRITICAL SECURITY ABORT: Refusing to execute tests against non-local database URI: ${uri}`
    );
  }

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

// Helper: Seed tenant, role, and staff user
async function createTenantAndStaff({
  companyName = "Agency X",
  slug = "agency-x",
  userName = "staff_user",
  email = "staff@agency.com",
  password = "Password@123",
}) {
  const tenant = await TenantModel.create({
    companyName,
    slug,
    email,
    status: "Active",
  });

  const role = await RoleModel.create({
    tenantId: tenant._id,
    roleName: "Admin",
    priority: 1,
    permissions: ["view:project", "update:project", "view:project-master"],
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    tenantId: tenant._id,
    roleId: role._id,
    fullName: "Staff Admin",
    userName,
    email,
    mobileNo: "+919876543210",
    password: hashedPassword,
    status: "Active",
  });

  const token = jwt.sign(
    { userId: user._id, role: role.roleName, tenantId: tenant._id, tokenVersion: user.tokenVersion || 1 },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { tenant, role, user, token };
}

describe("Phase 1B: OTP, Password Reset, and Client Portal Security", () => {
  // ─── PART A: Shared OTP Service Tests ─────────────────────────────────────
  describe("Shared OTP Service (services/otpService.js)", () => {
    test("5 wrong OTP attempts locks the subject; correct OTP afterwards fails", async () => {
      const subject = "test@example.com";
      const purpose = "password_reset";

      const otpResult = await generateAndSaveOTP({ subject, purpose });
      expect(otpResult.success).toBe(true);
      const realOtp = otpResult.plainOtp;

      // 5 wrong attempts
      for (let i = 1; i <= 5; i++) {
        const v = await verifyOTP({ subject, purpose, otp: "000000" });
        expect(v.success).toBe(false);
        if (i === 5) {
          expect(v.locked).toBe(true);
        }
      }

      // 6th attempt with the REAL correct OTP must fail because subject is locked
      const finalTry = await verifyOTP({ subject, purpose, otp: realOtp });
      expect(finalTry.success).toBe(false);
      expect(finalTry.locked).toBe(true);
    });

    test("Atomic attempt counting: parallel concurrent wrong guesses lock after 5", async () => {
      const subject = "parallel@example.com";
      const purpose = "password_reset";

      await generateAndSaveOTP({ subject, purpose });

      // Fire 10 parallel wrong guesses simultaneously
      const results = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          verifyOTP({ subject, purpose, otp: "111111" })
        )
      );

      // All 10 must fail
      results.forEach((r) => expect(r.success).toBe(false));

      // Check DB record: attempts must not exceed 5 and must be locked
      const doc = await OTPModel.findOne({ subject, purpose });
      expect(doc.attempts).toBe(5);
      expect(doc.isLocked).toBe(true);
    });

    test("Expired and reused OTPs fail; OTP for subject X never works for subject Y", async () => {
      const x = "userx@test.com";
      const y = "usery@test.com";
      const purpose = "password_reset";

      const xResult = await generateAndSaveOTP({ subject: x, purpose });

      // Trying X's code on Y must fail
      const crossSubject = await verifyOTP({ subject: y, purpose, otp: xResult.plainOtp });
      expect(crossSubject.success).toBe(false);

      // Verify X's code successfully
      const successVerify = await verifyOTP({ subject: x, purpose, otp: xResult.plainOtp });
      expect(successVerify.success).toBe(true);

      // Reusing already consumed OTP must fail
      const reused = await verifyOTP({ subject: x, purpose, otp: xResult.plainOtp });
      expect(reused.success).toBe(false);
    });

    test("Resend cooldown (60s) and hourly cap (3/hr) survive OTP document expiration", async () => {
      const subject = "cooldown@test.com";
      const purpose = "password_reset";

      // 1st send
      const first = await generateAndSaveOTP({ subject, purpose });
      expect(first.success).toBe(true);

      // Immediate 2nd send should be blocked by 60s cooldown
      const immediateSecond = await generateAndSaveOTP({ subject, purpose });
      expect(immediateSecond.success).toBe(false);
      expect(immediateSecond.cooldown).toBe(true);

      // Simulate TTL expiration of the OTP document: delete OTP document from collection
      await OTPModel.deleteMany({ subject, purpose });

      // Even with OTP document expired/deleted, rate limit state in OTPRateLimitModel still enforces cooldown
      const stillCooldown = await generateAndSaveOTP({ subject, purpose });
      expect(stillCooldown.success).toBe(false);
      expect(stillCooldown.cooldown).toBe(true);

      // Fast-forward cooldown by updating lastSentAt in OTPRateLimitModel
      const pastTime = new Date(Date.now() - 70 * 1000);
      await OTPRateLimitModel.updateOne({ subject, purpose }, { $set: { lastSentAt: pastTime } });

      // 2nd send succeeds
      const second = await generateAndSaveOTP({ subject, purpose });
      expect(second.success).toBe(true);

      // Fast-forward cooldown again
      await OTPRateLimitModel.updateOne({ subject, purpose }, { $set: { lastSentAt: pastTime } });

      // 3rd send succeeds
      const third = await generateAndSaveOTP({ subject, purpose });
      expect(third.success).toBe(true);

      // Fast-forward cooldown again
      await OTPRateLimitModel.updateOne({ subject, purpose }, { $set: { lastSentAt: pastTime } });

      // 4th send in the same hour must be blocked by hourly cap
      const fourth = await generateAndSaveOTP({ subject, purpose });
      expect(fourth.success).toBe(false);
      expect(fourth.hourlyCapped).toBe(true);
    });
  });

  // ─── PART B: Staff Password Reset & Login Hardening ─────────────────────────
  describe("Staff Password Reset & Login Hardening", () => {
    test("send-mail-otp returns identical response for existing vs non-existing email", async () => {
      await createTenantAndStaff({ email: "real@test.com", userName: "real_user" });

      const realRes = await request(app)
        .post("/user/send-mail-otp")
        .send({ email: "real@test.com" });

      const fakeRes = await request(app)
        .post("/user/send-mail-otp")
        .send({ email: "ghost@test.com" });

      expect(realRes.status).toBe(200);
      expect(fakeRes.status).toBe(200);
      expect(realRes.body.message).toEqual(fakeRes.body.message);
      expect(realRes.body.message).toContain("If that email is registered");
    });

    test("Password reset workflow: single-use resetToken, password update, and session invalidation", async () => {
      const { user, token: oldToken } = await createTenantAndStaff({
        email: "resetme@test.com",
        userName: "reset_user",
        password: "OldPassword@123",
      });

      // 1. Generate OTP
      const otpRes = await generateAndSaveOTP({ subject: "resetme@test.com", purpose: "password_reset" });

      // 2. Verify OTP -> Returns resetToken, not a login JWT
      const verifyRes = await request(app)
        .post("/user/verify-email-otp")
        .send({ email: "resetme@test.com", otp: otpRes.plainOtp });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.resetToken).toBeDefined();
      expect(verifyRes.body.token).toBeUndefined(); // Crucial: must NOT return login JWT!

      const resetToken = verifyRes.body.resetToken;

      // 3. Reset password using resetToken
      const resetRes = await request(app)
        .post("/user/reset-password")
        .send({ resetToken, newPassword: "NewSecretPassword@999" });

      expect(resetRes.status).toBe(200);

      // 4. ResetToken cannot be reused (single-use)
      const reuseRes = await request(app)
        .post("/user/reset-password")
        .send({ resetToken, newPassword: "AnotherPassword@999" });
      expect(reuseRes.status).toBe(400);

      // 5. Old JWT issued before password change is rejected by authUser
      const testProtectedRes = await request(app)
        .get("/user/get-login-user-detail")
        .set("Authorization", `Bearer ${oldToken}`);
      expect(testProtectedRes.status).toBe(401);
      expect(testProtectedRes.body.message).toContain("Session expired");

      // 6. Login with new password succeeds
      const newLoginRes = await request(app)
        .post("/user/login-by-pass")
        .send({ userName: "reset_user", password: "NewSecretPassword@999" });
      expect(newLoginRes.status).toBe(200);
    });

    test("Login lockout: 5 consecutive failed login attempts locks account for 15 minutes", async () => {
      await createTenantAndStaff({
        email: "lockout@test.com",
        userName: "lockout_user",
        password: "ValidPass@123",
      });

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post("/user/login-by-pass")
          .send({ userName: "lockout_user", password: "WrongPassword" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid username or password.");
      }

      // 5th failed attempt triggers lock
      const fifthRes = await request(app)
        .post("/user/login-by-pass")
        .send({ userName: "lockout_user", password: "WrongPassword" });
      expect(fifthRes.status).toBe(401);

      // 6th attempt even with CORRECT password returns 429 lockout
      const sixthRes = await request(app)
        .post("/user/login-by-pass")
        .send({ userName: "lockout_user", password: "ValidPass@123" });
      expect(sixthRes.status).toBe(429);
      expect(sixthRes.body.message).toContain("Account is temporarily locked");
    });
  });

  // ─── PART C: Client Portal Access Security Tests ────────────────────────────
  describe("Client Portal Access Security", () => {
    test("Public lookup leaks NO confidential project data (only name, branding, last 2 digits of phone)", async () => {
      const { tenant } = await createTenantAndStaff({ companyName: "Tenant A", slug: "tenant-a" });

      const project = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-000001",
        ProjectName: "Confidential Redesign",
        ClientName: "Secret Client Corp",
        mobileNo: "+919876543299",
        whatsappNo: "+919876543299",
        ProjectCost: 50000,
        ProjectDescription: "Internal highly sensitive specs",
        portalKey: "pk_test_sample_key_12345",
        slug: "confidential-redesign-prj-000001",
        portalVersion: 1,
      });

      const lookupRes = await request(app)
        .get(`/project/lookup-portal?identifier=${project.portalKey}`);

      expect(lookupRes.status).toBe(200);
      const data = lookupRes.body.data;

      // Whitelisted public fields present
      expect(data.projectName).toBe("Confidential Redesign");
      expect(data.maskedPhone).toContain("99"); // last 2 digits
      expect(data.otpRequired).toBe(true);

      // Leaked confidential fields must be ABSENT
      expect(data.ProjectCost).toBeUndefined();
      expect(data.ProjectDescription).toBeUndefined();
      expect(data.ClientName).toBeUndefined();
      expect(data.mobileNo).toBeUndefined();
      expect(data.whatsappNo).toBeUndefined();
    });

    test("Timeline and project detail return 401 without portal session token", async () => {
      const { tenant } = await createTenantAndStaff({ companyName: "Tenant A", slug: "tenant-a" });

      const project = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-000002",
        ProjectName: "Brand Identity",
        ClientName: "Client Two",
        mobileNo: "+919876543211",
        portalKey: "pk_brand_identity_777",
        slug: "brand-identity-prj-000002",
        portalVersion: 1,
      });

      const unauthTimeline = await request(app)
        .get(`/project/get-timeline-by-slug?slug=${project.portalKey}`);
      expect(unauthTimeline.status).toBe(401);

      const unauthProject = await request(app)
        .get(`/project/get-project-by-slug?slug=${project.portalKey}`);
      expect(unauthProject.status).toBe(401);
    });

    test("Portal session token for Project A cannot access Project B", async () => {
      const { tenant } = await createTenantAndStaff({ companyName: "Tenant A", slug: "tenant-a" });

      const projectA = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-000003",
        ProjectName: "Project A",
        ClientName: "Client A",
        mobileNo: "+919876543201",
        portalKey: "pk_proj_a_111",
        slug: "project-a-prj-000003",
        portalVersion: 1,
      });

      const projectB = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-000004",
        ProjectName: "Project B",
        ClientName: "Client B",
        mobileNo: "+919876543202",
        portalKey: "pk_proj_b_222",
        slug: "project-b-prj-000004",
        portalVersion: 1,
      });

      // Sign valid portal token specifically for Project A
      const tokenA = jwt.sign(
        { purpose: "portal", projectId: projectA._id, tenantId: tenant._id, portalVersion: 1 },
        process.env.PORTAL_JWT_SECRET,
        { expiresIn: "12h" }
      );

      // Accessing Project A with token A succeeds
      const okRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${projectA.portalKey}`)
        .set("x-portal-token", tokenA);
      expect(okRes.status).toBe(200);

      // Trying to access Project B with token A is rejected with 403
      const crossRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${projectB.portalKey}`)
        .set("x-portal-token", tokenA);
      expect(crossRes.status).toBe(403);
    });

    test("Staff access to portal endpoint verifies cross-tenant isolation (Tenant A staff cannot access Tenant B project)", async () => {
      const tenantA = await createTenantAndStaff({ companyName: "Tenant A", slug: "t-a", userName: "staff_a", email: "a@corp.com" });
      const tenantB = await createTenantAndStaff({ companyName: "Tenant B", slug: "t-b", userName: "staff_b", email: "b@corp.com" });

      const projectB = await ProjectModel.create({
        tenantId: tenantB.tenant._id,
        ProjectId: "PRJ-000005",
        ProjectName: "Tenant B Project",
        ClientName: "Client B",
        mobileNo: "+919876543205",
        portalKey: "pk_tenant_b_project",
        slug: "tenant-b-project-prj-000005",
        portalVersion: 1,
      });

      // Staff A attempts to view Tenant B's project preview using Staff A JWT
      const crossTenantRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${projectB.portalKey}`)
        .set("Authorization", `Bearer ${tenantA.token}`);

      expect(crossTenantRes.status).toBe(403);
      expect(crossTenantRes.body.message).toContain("Cross-tenant access forbidden");
    });

    test("Regenerating portal link rotates portalKey and invalidates previous portal sessions", async () => {
      const { tenant, token } = await createTenantAndStaff({ companyName: "Tenant A", slug: "tenant-a" });

      const project = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-000006",
        ProjectName: "Portal Rotate Test",
        ClientName: "Client Rotate",
        mobileNo: "+919876543206",
        portalKey: "pk_original_key",
        slug: "portal-rotate-prj-000006",
        portalVersion: 1,
      });

      // Active portal token for version 1
      const v1Token = jwt.sign(
        { purpose: "portal", projectId: project._id, tenantId: tenant._id, portalVersion: 1 },
        process.env.PORTAL_JWT_SECRET,
        { expiresIn: "12h" }
      );

      // Verify v1Token works
      const v1Res = await request(app)
        .get(`/project/get-project-by-slug?slug=${project.portalKey}`)
        .set("x-portal-token", v1Token);
      expect(v1Res.status).toBe(200);

      // Staff regenerates portal link
      const regenRes = await request(app)
        .post("/project/regenerate-portal-key")
        .set("Authorization", `Bearer ${token}`)
        .send({ projectId: project._id });

      expect(regenRes.status).toBe(200);
      expect(regenRes.body.portalKey).not.toBe("pk_original_key");
      expect(regenRes.body.portalVersion).toBe(2);

      const newKey = regenRes.body.portalKey;

      // Old v1Token using new portalKey returns 401 PORTAL_ROTATED
      const oldTokenRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${newKey}`)
        .set("x-portal-token", v1Token);

      expect(oldTokenRes.status).toBe(401);
      expect(oldTokenRes.body.code).toBe("PORTAL_ROTATED");
    });

    test("Whitelisted DTOs: Project and timeline return zero financial costs, internal history, or staff emails", async () => {
      const { tenant } = await createTenantAndStaff({ companyName: "Tenant A", slug: "tenant-a" });

      const project = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-000007",
        ProjectName: "DTO Verification",
        ClientName: "Client DTO",
        mobileNo: "+919876543207",
        whatsappNo: "+919876543207",
        address: "123 Classified Street",
        ProjectCost: 999999,
        statusHistory: [{ oldStatus: "Created", newStatus: "In Progress", budgetAtChange: 50000, changedBy: new mongoose.Types.ObjectId() }],
        portalKey: "pk_dto_verify",
        slug: "dto-verify-prj-000007",
        portalVersion: 1,
      });

      const staffAuthor = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Senior Architect",
        userName: "sr_arch",
        email: "architect_private@corp.com",
        mobileNo: "+919876543290",
        password: "hash",
        status: "Active",
      });

      await TimelineModel.create({
        projectId: project._id,
        tenantId: tenant._id,
        moduleName: "Authentication Module",
        phase: "Phase 1",
        description: "Delivered JWT encryption",
        addById: staffAuthor._id,
        attachements: ["/uploads/invoice.pdf"],
      });

      const portalToken = jwt.sign(
        { purpose: "portal", projectId: project._id, tenantId: tenant._id, portalVersion: 1 },
        process.env.PORTAL_JWT_SECRET,
        { expiresIn: "12h" }
      );

      // Verify Project DTO
      const projRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${project.portalKey}`)
        .set("x-portal-token", portalToken);

      expect(projRes.status).toBe(200);
      const projData = projRes.body.data;
      expect(projData.ProjectCost).toBeUndefined();
      expect(projData.statusHistory).toBeUndefined();
      expect(projData.address).toBeUndefined();
      expect(projData.tenantId).toBeUndefined();

      // Verify Timeline DTO
      const timeRes = await request(app)
        .get(`/project/get-timeline-by-slug?slug=${project.portalKey}`)
        .set("x-portal-token", portalToken);

      expect(timeRes.status).toBe(200);
      const post = timeRes.body.data[0];
      expect(post.author.fullName).toBe("Senior Architect");
      expect(post.author.email).toBeUndefined();
      expect(post.tenantId).toBeUndefined();
    });

    test("Portal contract test: Assert exact key sets of projectDTO and timelineDTO", async () => {
      const { tenant } = await createTenantAndStaff({ companyName: "Contract Corp", slug: "contract-corp" });

      const project = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-CONTRACT",
        ProjectName: "Contract Project",
        ClientName: "Contract Client",
        ProjectType: "Web App",
        ProjectDescription: "Contract description",
        ProjectStartDate: new Date(),
        ProjectEndDate: new Date(),
        ProjectPriority: "High",
        ProjectStatus: "In Progress",
        TechnologyStack: "React, Node",
        EstimatedHours: 120,
        mobileNo: "+919876543209",
        whatsappNo: "+919876543209",
        portalKey: "pk_contract_assert_123",
        portalVersion: 1,
        PhaseDetails: [
          {
            PhaseName: "Phase Alpha",
            PhaseDescription: "Alpha desc",
            PhaseDays: 10,
            PhaseStatus: "Completed",
            PhaseStartDate: new Date(),
            PhaseEndDate: new Date(),
          },
        ],
      });

      const role = await RoleModel.create({
        tenantId: tenant._id,
        roleName: "Lead Developer",
        priority: 2,
        permissions: ["all"],
      });

      const staffAuthor = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Contract Author",
        userName: "contract_auth",
        email: "auth@contract.test",
        password: "hash",
        roleId: role._id,
        status: "Active",
      });

      await TimelineModel.create({
        projectId: project._id,
        tenantId: tenant._id,
        moduleName: "Core Module",
        phase: "Phase Alpha",
        description: "Post content details",
        addById: staffAuthor._id,
        attachements: ["/uploads/photo.png"],
      });

      const portalToken = jwt.sign(
        { purpose: "portal", projectId: project._id, tenantId: tenant._id, portalVersion: 1 },
        process.env.PORTAL_JWT_SECRET,
        { expiresIn: "12h" }
      );

      const projRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${project.portalKey}`)
        .set("x-portal-token", portalToken);

      expect(projRes.status).toBe(200);
      const projDTO = projRes.body.data;

      // Exact projectDTO keys (13 keys: no EstimatedHours, ProjectPriority, or alias ProjectDescription)
      const expectedProjectKeys = [
        "_id",
        "ProjectId",
        "ProjectName",
        "ClientName",
        "ProjectType",
        "description",
        "ProjectStartDate",
        "ProjectEndDate",
        "ProjectStatus",
        "TechnologyStack",
        "PhaseDetails",
        "maskedPhone",
        "portalKey",
      ].sort();
      expect(Object.keys(projDTO).sort()).toEqual(expectedProjectKeys);

      // Canonical description present, alias ProjectDescription removed
      expect(projDTO.description).toBe("Contract description");
      expect(projDTO.ProjectDescription).toBeUndefined();
      expect(projDTO.EstimatedHours).toBeUndefined();
      expect(projDTO.ProjectPriority).toBeUndefined();

      // Exact PhaseDetails keys (7 keys: canonical description, PhaseDescription alias removed)
      const expectedPhaseKeys = [
        "_id",
        "PhaseName",
        "description",
        "PhaseDays",
        "PhaseStatus",
        "PhaseStartDate",
        "PhaseEndDate",
      ].sort();
      expect(Object.keys(projDTO.PhaseDetails[0]).sort()).toEqual(expectedPhaseKeys);
      expect(projDTO.PhaseDetails[0].description).toBe("Alpha desc");
      expect(projDTO.PhaseDetails[0].PhaseDescription).toBeUndefined();

      // Exact timelineDTO keys (8 keys: description, attachments, author { fullName only })
      const timeRes = await request(app)
        .get(`/project/get-timeline-by-slug?slug=${project.portalKey}`)
        .set("x-portal-token", portalToken);

      expect(timeRes.status).toBe(200);
      const timeItem = timeRes.body.data[0];

      const expectedTimelineKeys = [
        "_id",
        "moduleName",
        "phase",
        "description",
        "attachments",
        "author",
        "createdAt",
        "updatedAt",
      ].sort();
      expect(Object.keys(timeItem).sort()).toEqual(expectedTimelineKeys);

      // Canonical description present, alias content removed
      expect(timeItem.description).toBe("Post content details");
      expect(timeItem.content).toBeUndefined();

      // Canonical attachments present, alias attachements removed
      expect(timeItem.attachments).toEqual(["/uploads/photo.png"]);
      expect(timeItem.attachements).toBeUndefined();

      // Author shape: fullName ONLY (no roleName, roleId, _id, or name)
      expect(timeItem.author).toEqual({
        fullName: "Contract Author",
      });
    });
  });

  // ─── PART 0 CLEANUP: Portal Slug Gate, WhatsApp Checks, & tokenVersion ────
  describe("Part 0 Cleanup: Portal Slug Gate, WhatsApp Checks, & tokenVersion", () => {
    test("Legacy slug lookups are rejected when PORTAL_LEGACY_SLUG_ENABLED is false; staff access by slug works", async () => {
      delete process.env.PORTAL_LEGACY_SLUG_ENABLED; // default false

      const { tenant, token } = await createTenantAndStaff({
        companyName: "Slug Gate Corp",
        userName: "gate_admin",
        email: "gate@corp.com",
      });

      const legacyProject = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectName: "Legacy Slug Project",
        ClientName: "Test Client Corp",
        slug: "legacy-client-slug-xyz",
        portalKey: "pk_valid_64_character_unique_portal_key_value_gate_corp_1234567890abcdef",
        portalVersion: 1,
        whatsappNo: "+919876543201",
        ProjectCost: 50000,
        ProjectStatus: "In Progress",
      });

      // 1. lookup-portal by legacy slug must return 400 with generic error and NO client/tenant data
      const lookupRes = await request(app).get(`/project/lookup-portal?slug=${legacyProject.slug}`);
      expect(lookupRes.status).toBe(400);
      expect(lookupRes.body.message).toBe("This link is no longer valid. Please ask your agency for a new link.");
      expect(lookupRes.body.data).toBeUndefined();

      // 1b. Unknown portalKey produces IDENTICAL response status, shape, and message
      const unknownPkLookup = await request(app).get("/project/lookup-portal?portalKey=pk_unknown_nonexistent_key_12345");
      expect(unknownPkLookup.status).toBe(lookupRes.status);
      expect(unknownPkLookup.body).toEqual(lookupRes.body);

      // 2. send-whatsapp-otp by legacy slug must return 400 and NOT send OTP
      const sendRes = await request(app)
        .post("/project/send-whatsapp-otp")
        .send({ slug: legacyProject.slug });
      expect(sendRes.status).toBe(400);
      expect(sendRes.body.message).toBe("This link is no longer valid. Please ask your agency for a new link.");

      // 2b. Unknown portalKey produces IDENTICAL response on send-whatsapp-otp
      const unknownPkSend = await request(app)
        .post("/project/send-whatsapp-otp")
        .send({ portalKey: "pk_unknown_nonexistent_key_12345" });
      expect(unknownPkSend.status).toBe(sendRes.status);
      expect(unknownPkSend.body).toEqual(sendRes.body);

      // 3. verify-whatsapp-otp by legacy slug must return 400
      const verifyRes = await request(app)
        .post("/project/verify-whatsapp-otp")
        .send({ slug: legacyProject.slug, otp: "123456" });
      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.message).toBe("This link is no longer valid. Please ask your agency for a new link.");

      // 3b. Unknown portalKey produces IDENTICAL response on verify-whatsapp-otp
      const unknownPkVerify = await request(app)
        .post("/project/verify-whatsapp-otp")
        .send({ portalKey: "pk_unknown_nonexistent_key_12345", otp: "123456" });
      expect(unknownPkVerify.status).toBe(verifyRes.status);
      expect(unknownPkVerify.body).toEqual(verifyRes.body);

      // 4. Staff access by slug keeps working
      const staffRes = await request(app)
        .get(`/project/get-project-by-slug?slug=${legacyProject.slug}`)
        .set("Authorization", `Bearer ${token}`);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.ProjectName).toBe("Legacy Slug Project");

      // 5. Lookup by portalKey succeeds
      const pkLookupRes = await request(app).get(`/project/lookup-portal?portalKey=${legacyProject.portalKey}`);
      expect(pkLookupRes.status).toBe(200);
      expect(pkLookupRes.body.data.projectName).toBe("Legacy Slug Project");
    });

    test("WhatsApp OTP send fails clearly when tenant lacks WhatsApp credentials or plan lacks WhatsApp", async () => {
      const { tenant } = await createTenantAndStaff({
        companyName: "WA Cred Test Corp",
        userName: "wacred_admin",
        email: "wacred@corp.com",
      });

      const project = await ProjectModel.create({
        tenantId: tenant._id,
        ProjectName: "WA Test Project",
        ClientName: "WA Test Client",
        slug: "wa-test-proj-slug",
        portalKey: "pk_wa_credentials_test_portal_key_1234567890abcdef0123456789abcdef",
        portalVersion: 1,
        whatsappNo: "+919876543202",
        ProjectCost: 30000,
        ProjectStatus: "In Progress",
      });

      // 1. Assign plan with whatsappEnabled: true so plan check passes, but credentials are missing
      const waPlan = await PlanModel.create({
        planName: "WA Active Plan",
        slug: "wa-active-plan-test",
        price: 999,
        billingCycle: "monthly",
        isActive: true,
        limits: { whatsappEnabled: true, maxUsers: 5, maxProjects: 5, maxLeads: 50 },
      });
      await TenantModel.updateOne({ _id: tenant._id }, { $set: { planId: waPlan._id } });

      // Without credentials configured, send-whatsapp-otp must fail with 400
      const noCredsRes = await request(app)
        .post("/project/send-whatsapp-otp")
        .send({ portalKey: project.portalKey });
      expect(noCredsRes.status).toBe(400);
      expect(noCredsRes.body.message).toBe("WhatsApp service is not configured for this organization.");

      // 2. Configure credentials, but assign a plan with limits.whatsappEnabled = false
      await WhatsappCredModel.create({
        tenantId: tenant._id,
        token: "test_wa_token_1234567890",
        instanceId: "inst_test_123",
      });

      const restrictedPlan = await PlanModel.create({
        planName: "Restricted Plan",
        slug: "restricted-plan-wa",
        price: 10,
        billingCycle: "monthly",
        isActive: true,
        limits: { whatsappEnabled: false, maxUsers: 5, maxProjects: 5, maxLeads: 50 },
      });

      await TenantModel.updateOne({ _id: tenant._id }, { $set: { planId: restrictedPlan._id } });

      const planLacksWaRes = await request(app)
        .post("/project/send-whatsapp-otp")
        .send({ portalKey: project.portalKey });
      expect(planLacksWaRes.status).toBe(403);
      expect(planLacksWaRes.body.message).toBe("WhatsApp messaging is not included in the current subscription plan.");
    });

    test("Per-tenant daily OTP send cap blocks OTP generation when exceeded", async () => {
      process.env.TENANT_DAILY_OTP_CAP = "2";

      const { tenant } = await createTenantAndStaff({
        companyName: "Cap Corp",
        userName: "cap_admin",
        email: "cap@corp.com",
      });

      // Send 2 OTPs under this tenant
      const r1 = await generateAndSaveOTP({ subject: "cap1@test.com", purpose: "portal_access", tenantId: tenant._id });
      expect(r1.success).toBe(true);

      const r2 = await generateAndSaveOTP({ subject: "cap2@test.com", purpose: "portal_access", tenantId: tenant._id });
      expect(r2.success).toBe(true);

      // 3rd send exceeds tenant daily cap of 2
      const r3 = await generateAndSaveOTP({ subject: "cap3@test.com", purpose: "portal_access", tenantId: tenant._id });
      expect(r3.success).toBe(false);
      expect(r3.dailyCapped).toBe(true);
      expect(r3.message).toMatch(/daily OTP quota exceeded/i);

      delete process.env.TENANT_DAILY_OTP_CAP;
    });

    test("jwt.sign in registerTenant and demoLogin includes tokenVersion", async () => {
      // 1. Test registerTenant
      const regRes = await request(app).post("/tenant/register").send({
        companyName: "Versioned Corp",
        fullName: "Versioned Admin",
        userName: "versioned_admin",
        email: "versioned@corp.com",
        password: "Password@123",
        mobileNo: "+919876543299",
      });

      expect(regRes.status).toBe(201);
      expect(regRes.body.token).toBeDefined();

      const decodedReg = jwt.decode(regRes.body.token);
      expect(decodedReg).toBeDefined();
      expect(decodedReg.tokenVersion).toBe(1);

      // 2. Test demoLogin
      // Ensure demo tenant and user exist
      const demoTenant = await TenantModel.findOneAndUpdate(
        { slug: "demo-workspace" },
        {
          $setOnInsert: {
            companyName: "Clientmark Demo",
            slug: "demo-workspace",
            status: "Active",
            isDemo: true,
          },
        },
        { upsert: true, new: true }
      );

      const adminRole = await RoleModel.findOne({ roleName: "Admin" });
      await UserModel.findOneAndUpdate(
        { userName: "demo_admin", tenantId: demoTenant._id },
        {
          $setOnInsert: {
            tenantId: demoTenant._id,
            roleId: adminRole._id,
            fullName: "Demo Admin",
            userName: "demo_admin",
            email: "demo@clientmark.com",
            mobileNo: "+919999999999",
            password: await bcrypt.hash("Demo1234!", 10),
            status: "Active",
            tokenVersion: 1,
            isDemo: true,
          },
        },
        { upsert: true, new: true }
      );

      const demoRes = await request(app).post("/tenant/demo-login");
      expect(demoRes.status).toBe(200);
      expect(demoRes.body.token).toBeDefined();

      const decodedDemo = jwt.decode(demoRes.body.token);
      expect(decodedDemo).toBeDefined();
      expect(decodedDemo.tokenVersion).toBe(1);
    });
  });
});
