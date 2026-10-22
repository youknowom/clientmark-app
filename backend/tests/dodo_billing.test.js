import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Webhook } from "standardwebhooks";

const TEST_WEBHOOK_KEY = "whsec_" + Buffer.from("test_dodo_secret_32_bytes_12345").toString("base64");

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("01234567890123456789012345678901").toString("hex");
process.env.DODO_PAYMENTS_API_KEY = "test_dodo_api_key_placeholder";
process.env.DODO_PAYMENTS_WEBHOOK_KEY = TEST_WEBHOOK_KEY;
process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
process.env.NODE_ENV = "test";
process.env.PORT = "9997";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import WebhookEventModel from "../models/webhookEventModel.js";

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

// Helper to generate signed Dodo webhook requests
function createSignedDodoWebhook({ type, data = {}, eventId = `evt_${Date.now()}` }) {
  const payload = {
    event_id: eventId,
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const now = new Date();
  const wh = new Webhook(TEST_WEBHOOK_KEY);
  const signature = wh.sign(eventId, now, payloadString);

  return {
    payload,
    payloadString,
    headers: {
      "content-type": "application/json",
      "webhook-id": eventId,
      "webhook-timestamp": Math.floor(now.getTime() / 1000).toString(),
      "webhook-signature": signature,
    },
  };
}

describe("Dodo Payments Billing & Webhook Suite", () => {
  let adminUser, devUser, testTenant, freePlan, starterPlan;
  let adminToken, devToken;

  beforeEach(async () => {
    testTenant = await TenantModel.create({
      companyName: "Acme Agency",
      email: "billing-owner@acme.com",
      status: "Active",
      slug: "acme-agency",
    });

    const adminRole = await RoleModel.create({
      roleName: "Admin",
      priority: 1,
      tenantId: testTenant._id,
      permissions: ["view:lead", "view:project", "manage:billing"],
    });

    const devRole = await RoleModel.create({
      roleName: "Developer",
      priority: 2,
      tenantId: testTenant._id,
      permissions: ["view:project", "update:timeline"],
    });

    adminUser = await UserModel.create({
      fullName: "Alice Owner",
      userName: "alice_admin",
      email: "alice@acme.com",
      password: "hashedpassword",
      tenantId: testTenant._id,
      roleId: adminRole._id,
      status: "Active",
    });

    devUser = await UserModel.create({
      fullName: "Bob Dev",
      userName: "bob_dev",
      email: "bob@acme.com",
      password: "hashedpassword",
      tenantId: testTenant._id,
      roleId: devRole._id,
      status: "Active",
    });

    freePlan = await PlanModel.create({
      planName: "Free",
      slug: "free",
      price: 0,
      yearlyPrice: 0,
      isActive: true,
      limits: { maxUsers: 3, maxLeads: 100, maxBranches: 1, maxProjects: 5 },
    });

    starterPlan = await PlanModel.create({
      planName: "Starter",
      slug: "starter",
      price: 999,
      yearlyPrice: 9990,
      isActive: true,
      dodoProductIdMonthly: "pdt_starter_m_test",
      dodoProductIdYearly: "pdt_starter_y_test",
      limits: { maxUsers: 10, maxLeads: 1000, maxBranches: 2, maxProjects: 20 },
    });

    adminToken = jwt.sign(
      { userId: adminUser._id, tenantId: testTenant._id, tokenVersion: 1 },
      process.env.JWT_SECRET
    );

    devToken = jwt.sign(
      { userId: devUser._id, tenantId: testTenant._id, tokenVersion: 1 },
      process.env.JWT_SECRET
    );
  });

  describe("Checkout Session Creation", () => {
    it("rejects unauthorized non-admin staff from creating checkout sessions", async () => {
      const res = await request(app)
        .post("/subscription/dodo/create-checkout-session")
        .set("Authorization", `Bearer ${devToken}`)
        .send({ planId: starterPlan._id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Administrators or billing managers/);
    });

    it("allows admin to create a Dodo checkout session", async () => {
      const res = await request(app)
        .post("/subscription/dodo/create-checkout-session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: starterPlan._id, billingCycle: "monthly" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.url).toBeDefined();
    });

    it("handles switching to free plan without external checkout", async () => {
      const res = await request(app)
        .post("/subscription/dodo/create-checkout-session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: freePlan._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isFreePlan).toBe(true);
    });
  });

  describe("Checkout Session Verification", () => {
    it("activates subscription upon session verification", async () => {
      const res = await request(app)
        .get(`/subscription/dodo/verify-session?sessionId=dodo_mock_sess_12345&planId=${starterPlan._id}&billingCycle=monthly`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("active");
      expect(res.body.data.billingProvider).toBe("dodo");

      // Verify tenant updated
      const updatedTenant = await TenantModel.findById(testTenant._id);
      expect(updatedTenant.status).toBe("Active");
      expect(updatedTenant.planId.toString()).toBe(starterPlan._id.toString());
      expect(updatedTenant.isTrialActive).toBe(false);
    });
  });

  describe("Customer Portal Session", () => {
    it("creates customer portal session for active tenant", async () => {
      await SubscriptionModel.create({
        tenantId: testTenant._id,
        planId: starterPlan._id,
        dodoCustomerId: "cus_mock_dodo_123",
        status: "active",
        billingProvider: "dodo",
      });

      const res = await request(app)
        .post("/subscription/dodo/create-portal-session")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toBeDefined();
    });
  });

  describe("Webhook Security & Verification", () => {
    it("rejects webhook requests with forged or invalid signatures", async () => {
      const res = await request(app)
        .post("/subscription/dodo/webhook")
        .set("content-type", "application/json")
        .set("webhook-id", "msg_test_invalid")
        .set("webhook-timestamp", Math.floor(Date.now() / 1000).toString())
        .set("webhook-signature", "v1,invalid_signature_string_here")
        .send(JSON.stringify({ type: "subscription.active", data: {} }));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("verifies and processes subscription.active webhook", async () => {
      await SubscriptionModel.create({
        tenantId: testTenant._id,
        planId: freePlan._id,
        status: "trial",
      });

      const webhookData = createSignedDodoWebhook({
        type: "subscription.active",
        eventId: "dodo_test_evt_active_1",
        data: {
          subscription_id: "sub_dodo_live_777",
          customer: { customer_id: "cus_dodo_999" },
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            tenantId: testTenant._id.toString(),
            planId: starterPlan._id.toString(),
          },
        },
      });

      const res = await request(app)
        .post("/subscription/dodo/webhook")
        .set(webhookData.headers)
        .send(webhookData.payloadString);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const sub = await SubscriptionModel.findOne({ tenantId: testTenant._id });
      expect(sub.status).toBe("active");
      expect(sub.billingProvider).toBe("dodo");
      expect(sub.dodoSubscriptionId).toBe("sub_dodo_live_777");

      const tenant = await TenantModel.findById(testTenant._id);
      expect(tenant.status).toBe("Active");
      expect(tenant.planId.toString()).toBe(starterPlan._id.toString());
    });

    it("enforces webhook idempotency for duplicate deliveries", async () => {
      const webhookData = createSignedDodoWebhook({
        type: "subscription.active",
        eventId: "dodo_test_evt_duplicate_check",
        data: {
          subscription_id: "sub_dodo_dup_1",
          metadata: { tenantId: testTenant._id.toString() },
        },
      });

      // First delivery
      const res1 = await request(app)
        .post("/subscription/dodo/webhook")
        .set(webhookData.headers)
        .send(webhookData.payloadString);
      expect(res1.status).toBe(200);
      expect(res1.body.received).toBe(true);

      // Duplicate delivery with same event ID
      const res2 = await request(app)
        .post("/subscription/dodo/webhook")
        .set(webhookData.headers)
        .send(webhookData.payloadString);
      expect(res2.status).toBe(200);
      expect(res2.body.received).toBe(true);
      expect(res2.body.duplicate).toBe(true);
    });

    it("handles subscription.failed and transitions status to PastDue with grace period", async () => {
      await SubscriptionModel.create({
        tenantId: testTenant._id,
        planId: starterPlan._id,
        dodoSubscriptionId: "sub_dodo_to_fail",
        status: "active",
        billingProvider: "dodo",
      });

      const webhookData = createSignedDodoWebhook({
        type: "subscription.failed",
        eventId: "dodo_test_evt_failed_1",
        data: {
          subscription_id: "sub_dodo_to_fail",
        },
      });

      const res = await request(app)
        .post("/subscription/dodo/webhook")
        .set(webhookData.headers)
        .send(webhookData.payloadString);

      expect(res.status).toBe(200);

      const sub = await SubscriptionModel.findOne({ dodoSubscriptionId: "sub_dodo_to_fail" });
      expect(sub.status).toBe("past_due");
      expect(sub.gracePeriodStartedAt).toBeDefined();

      const tenant = await TenantModel.findById(testTenant._id);
      expect(tenant.status).toBe("PastDue");
    });

    it("handles subscription.cancelled and marks cancelAtPeriodEnd", async () => {
      await SubscriptionModel.create({
        tenantId: testTenant._id,
        planId: starterPlan._id,
        dodoSubscriptionId: "sub_dodo_to_cancel",
        status: "active",
        billingProvider: "dodo",
      });

      const webhookData = createSignedDodoWebhook({
        type: "subscription.cancelled",
        eventId: "dodo_test_evt_cancel_1",
        data: {
          subscription_id: "sub_dodo_to_cancel",
        },
      });

      const res = await request(app)
        .post("/subscription/dodo/webhook")
        .set(webhookData.headers)
        .send(webhookData.payloadString);

      expect(res.status).toBe(200);

      const sub = await SubscriptionModel.findOne({ dodoSubscriptionId: "sub_dodo_to_cancel" });
      expect(sub.status).toBe("cancelled");
      expect(sub.cancelAtPeriodEnd).toBe(true);
      expect(sub.cancelledAt).toBeDefined();
    });
  });
});
