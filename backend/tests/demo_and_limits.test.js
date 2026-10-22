import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("01234567890123456789012345678901").toString("base64");
process.env.NODE_ENV = "test";
process.env.PORT = "9998";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PlanModel from "../models/planModel.js";
import LeadModel from "../models/leadModel.js";
import ProjectModel from "../models/projectModel.js";
import TimelineModel from "../models/timelineModel.js";
import NotificationModel from "../models/notificationModel.js";
import { sendWATextServ } from "../services/whatsappService.js";
import { sendTextMail } from "../services/mailService.js";
import { seedDemoTenant, resetDemoData } from "../config/seedDemoTenant.js";
import { runDemoResetJob } from "../workers/demoResetJob.js";

let mongoServer;

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

describe("PART 3: Demo Workspace Protections & Race-Safe Resource Limits", () => {
  describe("Demo Outbound Message Blocking", () => {
    test("sendWATextServ simulates sending for demo tenant without contacting external API", async () => {
      const demoTenant = await TenantModel.create({
        companyName: "Acme Demo Agency",
        slug: "demo-test",
        email: "demo@acme.test",
        isDemo: true,
        status: "Active",
      });

      const res = await sendWATextServ("+919999999999", "Test Hello", demoTenant._id);
      expect(res.success).toBe(true);
      expect(res.simulated).toBe(true);
    });

    test("sendTextMail simulates sending for demo tenant without contacting SMTP", async () => {
      const demoTenant = await TenantModel.create({
        companyName: "Acme Demo Agency",
        slug: "demo-test-mail",
        email: "demo@acme.test",
        isDemo: true,
        status: "Active",
      });

      const res = await sendTextMail({
        subject: "Welcome",
        toEmails: "lead@example.com",
        textMessage: "Hello demo user",
        tenantId: demoTenant._id,
      });

      expect(res.success).toBe(true);
      expect(res.simulated).toBe(true);
      expect(res.messageId).toMatch(/demo-simulated/);
    });
  });

  describe("Demo User Lockout Protection", () => {
    test("updateUser blocks password change on demo tenants", async () => {
      const demoTenant = await TenantModel.create({
        companyName: "Acme Demo Agency",
        slug: "demo-workspace",
        email: "demo@acme.test",
        isDemo: true,
        status: "Active",
      });

      const adminUser = await UserModel.create({
        tenantId: demoTenant._id,
        fullName: "Demo Admin",
        userName: "demo_admin",
        email: "admin@demo.test",
        status: "Active",
      });

      const token = jwt.sign(
        { userId: adminUser._id, tenantId: demoTenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET
      );

      const res = await request(app)
        .put(`/user/update-user`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          id: adminUser._id,
          fullName: "Demo Admin Renamed",
          email: "admin@demo.test",
          password: "newPassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/(Demo|disabled in Live Demo)/i);
    });

    test("updateUser blocks account deactivation on demo tenants", async () => {
      const demoTenant = await TenantModel.create({
        companyName: "Acme Demo Agency",
        slug: "demo-workspace",
        email: "demo@acme.test",
        isDemo: true,
        status: "Active",
      });

      const adminUser = await UserModel.create({
        tenantId: demoTenant._id,
        fullName: "Demo Admin",
        userName: "demo_admin",
        email: "admin@demo.test",
        status: "Active",
      });

      const token = jwt.sign(
        { userId: adminUser._id, tenantId: demoTenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET
      );

      const res = await request(app)
        .put(`/user/update-user`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          id: adminUser._id,
          fullName: "Demo Admin",
          email: "admin@demo.test",
          status: "Inactive",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/(Demo|disabled in Live Demo)/i);
    });

    test("updateProfile blocks password modification on demo tenants", async () => {
      const demoTenant = await TenantModel.create({
        companyName: "Acme Demo Agency",
        slug: "demo-workspace",
        email: "demo@acme.test",
        isDemo: true,
        status: "Active",
      });

      const adminUser = await UserModel.create({
        tenantId: demoTenant._id,
        fullName: "Demo Admin",
        userName: "demo_admin",
        email: "admin@demo.test",
        status: "Active",
      });

      const token = jwt.sign(
        { userId: adminUser._id, tenantId: demoTenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET
      );

      const res = await request(app)
        .put(`/user/update-self-profile`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          fullName: "Demo Admin",
          email: "admin@demo.test",
          password: "newPassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/(Profile updates are disabled|disabled in Live Demo|Password modification is disabled)/i);
    });
  });

  describe("Demo Reset Job", () => {
    test("runDemoResetJob seeds demo tenant, clears user-created records, and re-establishes clean sample data", async () => {
      // 1. Initial seed
      await seedDemoTenant();

      const demoTenant = await TenantModel.findOne({ slug: "demo-workspace" });
      expect(demoTenant).not.toBeNull();
      expect(demoTenant.isDemo).toBe(true);

      // Verify initial sample leads exist
      const initialLeads = await LeadModel.countDocuments({ tenantId: demoTenant._id });
      expect(initialLeads).toBeGreaterThan(0);

      // 2. Add extra user-created lead
      await LeadModel.create({
        tenantId: demoTenant._id,
        fullName: "User Created Lead",
        mobileNo: "9000000000",
        email: "user@created.com",
      });

      const beforeResetLeads = await LeadModel.countDocuments({ tenantId: demoTenant._id });
      expect(beforeResetLeads).toBe(initialLeads + 1);

      // 3. Execute demo reset job
      await runDemoResetJob();

      // 4. Verify user-created lead is purged and sample leads remain
      const userLead = await LeadModel.findOne({
        tenantId: demoTenant._id,
        email: "user@created.com",
      });
      expect(userLead).toBeNull();

      const afterResetLeads = await LeadModel.countDocuments({ tenantId: demoTenant._id });
      expect(afterResetLeads).toBe(initialLeads);
    });

    test("resetDemoData leaves real tenant data completely untouched", async () => {
      // 1. Create a real production tenant with leads, projects, and users
      const realTenant = await TenantModel.create({
        companyName: "Acme Real Production Corp",
        slug: "acme-real-corp",
        email: "contact@acmereal.com",
        isDemo: false,
        status: "Active",
      });

      const realLead = await LeadModel.create({
        tenantId: realTenant._id,
        fullName: "VIP Real Customer",
        mobileNo: "9123456789",
        email: "vip@real.com",
      });

      const realProject = await ProjectModel.create({
        tenantId: realTenant._id,
        ProjectId: "PRJ-REAL-001",
        ProjectName: "Critical Enterprise Project",
        ClientName: "Enterprise Client",
      });

      // 2. Run resetDemoData
      await seedDemoTenant();
      const resetResult = await resetDemoData();
      expect(resetResult.success).toBe(true);

      // 3. Assert real tenant data is completely untouched
      const verifiedRealLead = await LeadModel.findById(realLead._id);
      expect(verifiedRealLead).not.toBeNull();
      expect(verifiedRealLead.fullName).toBe("VIP Real Customer");

      const verifiedRealProject = await ProjectModel.findById(realProject._id);
      expect(verifiedRealProject).not.toBeNull();
      expect(verifiedRealProject.ProjectName).toBe("Critical Enterprise Project");

      const realTenantCount = await LeadModel.countDocuments({ tenantId: realTenant._id });
      expect(realTenantCount).toBe(1);
    });

    test("resetDemoData refuses to run if targeted at non-demo tenant or wrong slug", async () => {
      const realTenant = await TenantModel.create({
        companyName: "Non Demo Tenant",
        slug: "non-demo-tenant",
        email: "real@test.com",
        isDemo: false,
        status: "Active",
      });

      await expect(resetDemoData(realTenant._id)).rejects.toThrow(
        /Refusing to reset: tenant must have isDemo: true and slug: "demo-workspace"/
      );
    });

    test("resetDemoData skips reset if demo session was active in the last 10 minutes", async () => {
      await seedDemoTenant();
      const demoTenant = await TenantModel.findOne({ slug: "demo-workspace" });

      // Simulate recent active session 2 minutes ago
      demoTenant.lastActiveAt = new Date(Date.now() - 2 * 60 * 1000);
      await demoTenant.save();

      const result = await resetDemoData();
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/Demo session was active in the last 10 minutes/i);
    });
  });

  describe("Race-Safe Resource Limits", () => {
    test("createUser enforces plan maxUsers limit", async () => {
      const plan = await PlanModel.create({
        planName: "Capped Plan",
        price: 49,
        limits: {
          maxUsers: 1,
          maxLeads: 100,
          maxProjects: 10,
          maxBranches: 5,
        },
      });

      const tenant = await TenantModel.create({
        companyName: "Capped Tenant",
        slug: "capped-tenant",
        email: "cap@tenant.com",
        planId: plan._id,
        status: "Active",
      });

      const adminRole = await RoleModel.create({
        tenantId: tenant._id,
        roleName: "Admin",
        priority: 1,
        permissions: ["add:user"],
      });

      const adminUser = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Owner User",
        userName: "owner_user",
        email: "owner@tenant.com",
        roleId: adminRole._id,
        status: "Active",
      });

      const token = jwt.sign(
        { userId: adminUser._id, tenantId: tenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET
      );

      // Attempt to create a 2nd user (currentUsers = 1, maxUsers = 1)
      const res = await request(app)
        .post("/user/create-user")
        .set("Authorization", `Bearer ${token}`)
        .send({
          fullName: "Second User",
          userName: "second_user",
          email: "second@tenant.com",
          mobileNo: "9111111111",
          password: "Password123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.limitReached).toBe(true);
      expect(res.body.message).toMatch(/maximum of 1 users/i);
    });

    test("createProject enforces plan maxProjects limit", async () => {
      const plan = await PlanModel.create({
        planName: "Single Project Plan",
        price: 29,
        limits: {
          maxUsers: 5,
          maxLeads: 100,
          maxProjects: 1,
          maxBranches: 5,
        },
      });

      const tenant = await TenantModel.create({
        companyName: "Project Cap Tenant",
        slug: "project-cap-tenant",
        email: "prj@tenant.com",
        planId: plan._id,
        status: "Active",
      });

      const adminRole = await RoleModel.create({
        tenantId: tenant._id,
        roleName: "Admin",
        priority: 1,
        permissions: ["add:project"],
      });

      const adminUser = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Project Owner",
        userName: "prj_owner",
        email: "prj@tenant.com",
        roleId: adminRole._id,
        status: "Active",
      });

      await ProjectModel.create({
        tenantId: tenant._id,
        ProjectId: "PRJ-001",
        ProjectName: "Existing Project 1",
        ClientName: "Client A",
      });

      const token = jwt.sign(
        { userId: adminUser._id, tenantId: tenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET
      );

      // Attempt to create a 2nd project (currentProjects = 1, maxProjects = 1)
      const res = await request(app)
        .post("/project/create-project")
        .set("Authorization", `Bearer ${token}`)
        .send({
          ProjectName: "Second Project",
          ClientName: "Client B",
        });

      expect(res.status).toBe(403);
      expect(res.body.limitReached).toBe(true);
      expect(res.body.message).toMatch(/maximum of 1 projects/i);
    });
  });
});
