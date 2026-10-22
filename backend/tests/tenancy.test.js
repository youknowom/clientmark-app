import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Environment setup for testing
process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.NODE_ENV = "test";
process.env.PORT = "9999";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import LeadModel from "../models/leadModel.js";
import ProjectModel from "../models/projectModel.js";
import BranchModel from "../models/branchModel.js";
import NotificationModel from "../models/notificationModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import { sendTextMail } from "../services/mailService.js";
import { sendWATextServ } from "../services/whatsappService.js";

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

  // If already connected elsewhere, disconnect first
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

// Helper to create tenant and authenticated user token
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";

// Helper to create tenant, plan, subscription, and authenticated user token
async function createTenantAndUser({
  companyName = "Tenant Test",
  slug = "tenant-test",
  status = "Active",
  isDemo = false,
  userName = "adminuser",
  email = "admin@tenant.com",
  roleName = "Admin",
  permissions = [
    "view:lead",
    "add:lead",
    "update:lead",
    "delete:lead",
    "view:project",
    "add:project",
    "update:project",
    "delete:project",
    "view:project-master",
    "view:user",
    "add:user",
    "update:user",
    "delete:user",
    "view:branch",
    "add:branch",
    "update:branch",
    "delete:branch",
    "view:whatsapp-setting",
  ],
}) {
  const tenant = await TenantModel.create({
    companyName,
    slug,
    email,
    status,
    isDemo,
  });

  let plan = await PlanModel.findOne({ planName: "Standard" });
  if (!plan) {
    plan = await PlanModel.create({
      planName: "Standard",
      price: 29,
      limits: { maxUsers: 10, maxLeads: 100, maxProjects: 20, maxBranches: 5 },
      features: [],
    });
  }

  await SubscriptionModel.create({
    tenantId: tenant._id,
    planId: plan._id,
    status: status === "Active" ? "active" : "past_due",
    startDate: new Date(),
  });

  const role = await RoleModel.create({
    tenantId: tenant._id,
    roleName,
    permissions,
    priority: 1,
  });

  const user = await UserModel.create({
    tenantId: tenant._id,
    fullName: `${companyName} Admin`,
    userName,
    email,
    mobileNo: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
    password: "hashedpassword123",
    roleId: role._id,
    status: "Active",
  });

  const token = jwt.sign(
    { userId: user._id, tenantId: tenant._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { tenant, role, user, token };
}

describe("Phase 1A: Tenancy Foundation & Isolation Tests", () => {
  // ── 1. CROSS-TENANT ISOLATION ──────────────────────────────────────────
  describe("Cross-Tenant Data Isolation (Tenant A vs Tenant B)", () => {
    test("Tenant A cannot read, update, or delete Tenant B leads", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "admin_a", email: "a@test.com" });
      const b = await createTenantAndUser({ companyName: "Tenant B", slug: "tenant-b", userName: "admin_b", email: "b@test.com" });

      // Create lead in Tenant A and Tenant B
      const leadA = await LeadModel.create({
        tenantId: a.tenant._id,
        fullName: "Visible Lead A",
        mobileNo: "9111111111",
        email: "leada@example.com",
        leadNo: 100,
      });

      const leadB = await LeadModel.create({
        tenantId: b.tenant._id,
        fullName: "Confidential Lead B",
        mobileNo: "9876543210",
        email: "leadb@example.com",
        leadNo: 101,
      });

      // Tenant A tries to read lead list — must only contain Lead A, not Lead B
      const listRes = await request(app)
        .get("/lead/get-leads")
        .set("Authorization", `Bearer ${a.token}`);
      expect(listRes.status).toBe(200);
      const leadIds = (listRes.body.data || []).map((l) => l._id.toString());
      expect(leadIds).toContain(leadA._id.toString());
      expect(leadIds).not.toContain(leadB._id.toString());

      // Tenant A tries to read Tenant B's single lead
      const getRes = await request(app)
        .get(`/lead/get-lead/${leadB._id}`)
        .set("Authorization", `Bearer ${a.token}`);
      expect([400, 404]).toContain(getRes.status);

      // Tenant A tries to update Tenant B's lead
      const updateRes = await request(app)
        .put("/lead/update-lead")
        .set("Authorization", `Bearer ${a.token}`)
        .send({ leadId: leadB._id, fullName: "Hijacked by A" });
      expect(updateRes.status).toBe(400);

      // Verify Tenant B's lead was not altered
      const unmodified = await LeadModel.findById(leadB._id);
      expect(unmodified.fullName).toBe("Confidential Lead B");

      // Tenant A tries to delete Tenant B's lead
      const delRes = await request(app)
        .delete(`/lead/delete-lead/${leadB._id}`)
        .set("Authorization", `Bearer ${a.token}`);
      expect([400, 404]).toContain(delRes.status);
      expect(await LeadModel.findById(leadB._id)).not.toBeNull();
    });

    test("Tenant A cannot read, update, or delete Tenant B projects", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "admin_a", email: "a@test.com" });
      const b = await createTenantAndUser({ companyName: "Tenant B", slug: "tenant-b", userName: "admin_b", email: "b@test.com" });

      const projectB = await ProjectModel.create({
        tenantId: b.tenant._id,
        ProjectId: "PRJ-B-001",
        ProjectName: "Secret Project B",
        ClientName: "Client B",
        mobileNo: "9988776655",
        slug: "secret-project-b",
      });

      // Tenant A tries to fetch Tenant B's project by ID
      const getRes = await request(app)
        .get(`/project/get-project?_id=${projectB._id}`)
        .set("Authorization", `Bearer ${a.token}`);
      expect([400, 404]).toContain(getRes.status);

      // Tenant A tries to update Tenant B's project
      const updateRes = await request(app)
        .put("/project/update-project")
        .set("Authorization", `Bearer ${a.token}`)
        .send({ _id: projectB._id, ProjectName: "Hijacked Project" });
      expect([400, 404]).toContain(updateRes.status);

      // Tenant A tries to delete Tenant B's project
      const delRes = await request(app)
        .delete(`/project/delete-project/${projectB._id}`)
        .set("Authorization", `Bearer ${a.token}`);
      expect([400, 404]).toContain(delRes.status);
      expect(await ProjectModel.findById(projectB._id)).not.toBeNull();
    });

    test("Tenant A cannot read, update, or delete Tenant B branches", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "admin_a", email: "a@test.com" });
      const b = await createTenantAndUser({ companyName: "Tenant B", slug: "tenant-b", userName: "admin_b", email: "b@test.com" });

      const branchB = await BranchModel.create({
        tenantId: b.tenant._id,
        branchCode: "BR01",
        branchName: "Branch B",
        branchAddress: "123 B St",
      });

      // Tenant A gets branches
      const listRes = await request(app)
        .get("/branch/get-branches")
        .set("Authorization", `Bearer ${a.token}`);
      expect(listRes.status).toBe(200);
      const branchIds = (listRes.body.data || []).map((br) => br._id.toString());
      expect(branchIds).not.toContain(branchB._id.toString());

      // Tenant A tries to update Tenant B branch
      const updateRes = await request(app)
        .put("/branch/update-branch")
        .set("Authorization", `Bearer ${a.token}`)
        .send({ branchId: branchB._id, branchName: "Hijacked Branch", branchCode: "BR01" });
      expect(updateRes.status).toBe(400);

      // Tenant A tries to delete Tenant B branch
      const delRes = await request(app)
        .delete("/branch/delete-branch")
        .set("Authorization", `Bearer ${a.token}`)
        .send({ branchId: branchB._id });
      expect(delRes.status).toBe(400);
      expect(await BranchModel.findById(branchB._id)).not.toBeNull();
    });

    test("Tenant A cannot read, update, or delete Tenant B users", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "admin_a", email: "a@test.com" });
      const b = await createTenantAndUser({ companyName: "Tenant B", slug: "tenant-b", userName: "admin_b", email: "b@test.com" });

      // Tenant A gets user list
      const listRes = await request(app)
        .get("/user/get-user-list")
        .set("Authorization", `Bearer ${a.token}`);
      expect(listRes.status).toBe(200);
      const userIds = (listRes.body.data || []).map((u) => u._id.toString());
      expect(userIds).not.toContain(b.user._id.toString());

      // Tenant A tries to update Tenant B's user
      const updateRes = await request(app)
        .put("/user/update-user")
        .set("Authorization", `Bearer ${a.token}`)
        .send({
          userId: b.user._id,
          fullName: "Hacked Admin B",
          userName: "hacked_b",
          email: "hacked_b@test.com",
          mobileNo: "+911111111111",
          roleId: a.role._id,
        });
      expect(updateRes.status).toBe(404);

      // Tenant A tries to delete Tenant B's user
      const delRes = await request(app)
        .delete("/user/delete-user")
        .set("Authorization", `Bearer ${a.token}`)
        .send({ userId: b.user._id });
      expect(delRes.status).toBe(400);
      expect(await UserModel.findById(b.user._id)).not.toBeNull();
    });

    test("Tenant A cannot see or mark Tenant B notifications", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "admin_a", email: "a@test.com" });
      const b = await createTenantAndUser({ companyName: "Tenant B", slug: "tenant-b", userName: "admin_b", email: "b@test.com" });

      const notifB = await NotificationModel.create({
        tenantId: b.tenant._id,
        userId: b.user._id,
        notificationType: "system",
        title: "Secret Alert B",
        message: "Financial records ready",
      });

      // Tenant A fetches notifications
      const notifRes = await request(app)
        .get("/notification/get-notification")
        .set("Authorization", `Bearer ${a.token}`);
      expect(notifRes.status).toBe(200);
      const notifIds = (notifRes.body.data?.notifications || []).map((n) => n._id.toString());
      expect(notifIds).not.toContain(notifB._id.toString());

      // Tenant A tries to mark Tenant B's notification read
      const markRes = await request(app)
        .put("/notification/mark-single-read")
        .set("Authorization", `Bearer ${a.token}`)
        .send({ notificationId: notifB._id });
      expect(markRes.status).toBe(400);
    });
  });

  // ── 2. SUSPENDED & EXPIRED TENANTS ──────────────────────────────────────
  describe("Suspended and Expired Tenant Enforcement", () => {
    test("Suspended tenant is rejected with 403 on all protected routes", async () => {
      const suspended = await createTenantAndUser({
        companyName: "Suspended Corp",
        slug: "suspended-corp",
        status: "Suspended",
        userName: "suspended_user",
        email: "suspended@test.com",
      });

      const routes = [
        { method: "get", path: "/lead/get-leads" },
        { method: "get", path: "/project/get-projects" },
        { method: "get", path: "/user/get-login-user-detail" },
        { method: "get", path: "/branch/get-branches" },
        { method: "get", path: "/notification/get-notification" },
        { method: "get", path: "/subscription/my-plan" },
      ];

      for (const r of routes) {
        const res = await request(app)[r.method](r.path)
          .set("Authorization", `Bearer ${suspended.token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/suspended/i);
      }
    });

    test("Expired / PastDue tenant is blocked on CRM routes but allowed on billing/profile", async () => {
      const expired = await createTenantAndUser({
        companyName: "Expired Corp",
        slug: "expired-corp",
        status: "Expired",
        userName: "expired_user",
        email: "expired@test.com",
      });

      // Blocked on CRM operations
      const leadRes = await request(app)
        .get("/lead/get-leads")
        .set("Authorization", `Bearer ${expired.token}`);
      expect(leadRes.status).toBe(403);
      expect(leadRes.body.isBillingRestricted).toBe(true);

      // Allowed on billing and login user detail
      const billingRes = await request(app)
        .get("/subscription/my-plan")
        .set("Authorization", `Bearer ${expired.token}`);
      expect(billingRes.status).not.toBe(403);

      const userRes = await request(app)
        .get("/user/get-login-user-detail")
        .set("Authorization", `Bearer ${expired.token}`);
      expect(userRes.status).toBe(200);
    });
  });

  // ── 3. DEMO GUARDRAILS ──────────────────────────────────────────────────
  describe("Demo Guardrails (Exact Allow-list)", () => {
    test("Demo tenant can create leads but cannot create users or delete", async () => {
      const demo = await createTenantAndUser({
        companyName: "Demo Workspace",
        slug: "demo-workspace",
        status: "Active",
        isDemo: true,
        userName: "demo_admin",
        email: "demo@test.com",
      });

      // Allowlisted: POST /lead/create-lead
      const leadRes = await request(app)
        .post("/lead/create-lead")
        .set("Authorization", `Bearer ${demo.token}`)
        .send({
          fullName: "Demo Lead",
          mobileNo: "9123456780",
          email: "demolead@test.com",
        });
      expect(leadRes.status).toBe(201);

      // Blocked: POST /user/create-user
      const userRes = await request(app)
        .post("/user/create-user")
        .set("Authorization", `Bearer ${demo.token}`)
        .send({
          fullName: "New Team Member",
          userName: "new_demo_user",
          email: "newdemo@test.com",
          mobileNo: "+919988776655",
          password: "password123",
          roleId: demo.role._id,
        });
      expect(userRes.status).toBe(403);
      expect(userRes.body.isDemoBlocked).toBe(true);

      // Blocked: DELETE /lead/delete-lead/:id
      const delRes = await request(app)
        .delete(`/lead/delete-lead/64b1f2e3d4c5b6a708192837`)
        .set("Authorization", `Bearer ${demo.token}`);
      expect(delRes.status).toBe(403);
      expect(delRes.body.isDemoBlocked).toBe(true);

      // Blocked: PUT /user/update-self-profile
      const profileRes = await request(app)
        .put("/user/update-self-profile")
        .set("Authorization", `Bearer ${demo.token}`)
        .send({ fullName: "New Name", email: "new@demo.com", mobileNo: "+919876543210" });
      expect(profileRes.status).toBe(403);
      expect(profileRes.body.isDemoBlocked).toBe(true);
    });
  });

  // ── 4. TENANT-SCOPED SERVICES ──────────────────────────────────────────
  describe("Tenant-Scoped Services (mailService and whatsappService)", () => {
    test("mailService fails cleanly when tenant has no credentials and does not fall back", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "a_user", email: "a@test.com" });
      const b = await createTenantAndUser({ companyName: "Tenant B", slug: "tenant-b", userName: "b_user", email: "b@test.com" });

      // Configure SMTP for Tenant B only
      await SoftwareSettingModel.create({
        tenantId: b.tenant._id,
        host: "smtp.tenantb.com",
        email: "notifications@tenantb.com",
        password: "tenantb_password",
      });

      // Tenant A tries to send email — must fail and NOT use Tenant B's credentials
      const resultA = await sendTextMail({
        subject: "Hello",
        toEmails: "client@test.com",
        textMessage: "Msg",
        tenantId: a.tenant._id,
        isPlatform: false,
      });

      expect(resultA.success).toBe(false);
      expect(resultA.message).toMatch(/not configured/i);
    });

    test("whatsappService fails cleanly when tenant has no credentials", async () => {
      const a = await createTenantAndUser({ companyName: "Tenant A", slug: "tenant-a", userName: "a_user", email: "a@test.com" });

      const result = await sendWATextServ("9876543210", "Hello", a.tenant._id);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not configured/i);
    });
  });

  // ── 5. WEBHOOK SIGNATURE VERIFICATION & GATEWAY ISOLATION ─────────────
  describe("Webhook Security (Fail Closed on Bad/Missing Signature)", () => {
    test("Razorpay webhook returns 404 when RAZORPAY_ENABLED is false (default)", async () => {
      const origFlag = process.env.RAZORPAY_ENABLED;
      delete process.env.RAZORPAY_ENABLED;

      const res = await request(app)
        .post("/subscription/webhook")
        .set("x-razorpay-signature", "invalid_forged_signature_123")
        .send({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123" } } } });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/disabled/i);

      process.env.RAZORPAY_ENABLED = origFlag;
    });

    test("Razorpay webhook fails closed (400) on invalid signature when RAZORPAY_ENABLED is true", async () => {
      const origFlag = process.env.RAZORPAY_ENABLED;
      process.env.RAZORPAY_ENABLED = "true";

      const res = await request(app)
        .post("/subscription/webhook")
        .set("x-razorpay-signature", "invalid_forged_signature_123")
        .send({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123" } } } });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      if (origFlag) process.env.RAZORPAY_ENABLED = origFlag;
      else delete process.env.RAZORPAY_ENABLED;
    });

    test("Stripe webhook fails closed (400) on missing signature without processing", async () => {
      const res = await request(app)
        .post("/subscription/stripe/webhook")
        .send({ id: "evt_test", type: "checkout.session.completed" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
