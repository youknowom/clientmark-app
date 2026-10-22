import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("01234567890123456789012345678901").toString("hex");
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key_for_testing";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret_for_cryptographic_verification_123";
process.env.NODE_ENV = "test";
process.env.PORT = "9998";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import WebhookEventModel from "../models/webhookEventModel.js";
import * as stripeService from "../services/stripeService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-08-26.dahlia",
});

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  stripeService.setStripeInstance(stripe);
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

// Helper to generate real Stripe test webhook signatures
function createSignedStripeWebhookRequest(payload) {
  const payloadString = JSON.stringify(payload);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: payloadString,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  return request(app)
    .post("/subscription/stripe/webhook")
    .set("stripe-signature", signature)
    .set("Content-Type", "application/json")
    .send(payloadString);
}

// Helper to create tenant and authenticated admin
async function setupTenantAndAdmin(overrides = {}) {
  const plan = await PlanModel.create({
    planName: overrides.planName || "Pro Plan",
    price: overrides.price !== undefined ? overrides.price : 999,
    yearlyPrice: overrides.yearlyPrice !== undefined ? overrides.yearlyPrice : 9990,
    stripePriceIdMonthly: "price_monthly_123",
    stripePriceIdYearly: "price_yearly_456",
    limits: {
      maxUsers: 10,
      maxLeads: 1000,
      maxProjects: 20,
      maxBranches: 5,
    },
  });

  const tenant = await TenantModel.create({
    companyName: overrides.companyName || "Acme Stripe Corp",
    slug: overrides.slug || "acme-stripe",
    email: overrides.email || "billing@acmestripe.test",
    status: overrides.tenantStatus || "Active",
    planId: plan._id,
    subscriptionStart: new Date(),
    subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const adminRole = await RoleModel.create({
    tenantId: tenant._id,
    roleName: "Admin",
    priority: 1,
    permissions: ["all"],
  });

  const memberRole = await RoleModel.create({
    tenantId: tenant._id,
    roleName: "Member",
    priority: 3,
    permissions: ["view:lead"],
  });

  const adminUser = await UserModel.create({
    tenantId: tenant._id,
    fullName: "Stripe Admin",
    userName: "stripe_admin",
    email: "admin@acmestripe.test",
    roleId: adminRole._id,
    status: "Active",
  });

  const memberUser = await UserModel.create({
    tenantId: tenant._id,
    fullName: "Regular Member",
    userName: "reg_member",
    email: "member@acmestripe.test",
    roleId: memberRole._id,
    status: "Active",
  });

  const adminToken = jwt.sign(
    { userId: adminUser._id, tenantId: tenant._id, tokenVersion: 1 },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const memberToken = jwt.sign(
    { userId: memberUser._id, tenantId: tenant._id, tokenVersion: 1 },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { tenant, plan, adminUser, memberUser, adminRole, memberRole, adminToken, memberToken };
}

describe("STRIPE BILLING & GATEWAY ISOLATION TEST SUITE", () => {
  // ── 1. GUARD AGAINST SECOND ACTIVE STRIPE SUBSCRIPTION ────────────────
  describe("0.2 Duplicate Subscription Prevention & Mode Check", () => {
    test("rejects new checkout session (HTTP 400) when tenant already has an active Stripe subscription", async () => {
      const { tenant, plan, adminToken } = await setupTenantAndAdmin();

      // Existing active subscription in DB
      await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        billingCycle: "monthly",
        status: "active",
        stripeCustomerId: "cus_existing123",
        stripeSubscriptionId: "sub_existing123",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post("/subscription/stripe/create-checkout-session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: plan._id.toString(), billingCycle: "monthly" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.hasActiveSubscription).toBe(true);
      expect(res.body.message).toMatch(/active stripe subscription already exists/i);
    });

    test("allows switching to Free plan directly without creating second active Stripe subscription", async () => {
      const { tenant, adminToken } = await setupTenantAndAdmin();

      const freePlan = await PlanModel.create({
        planName: "Free Plan",
        price: 0,
        limits: { maxUsers: 2, maxLeads: 50, maxProjects: 2, maxBranches: 1 },
      });

      const res = await request(app)
        .post("/subscription/stripe/create-checkout-session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: freePlan._id.toString(), billingCycle: "monthly" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isFreePlan).toBe(true);

      const activeSub = await SubscriptionModel.findOne({ tenantId: tenant._id, status: "active" });
      expect(activeSub).toBeDefined();
      expect(activeSub.planId.toString()).toBe(freePlan._id.toString());
    });

    test("creates checkout session with mode 'subscription' when tenant has no active Stripe subscription", async () => {
      const { plan, adminToken } = await setupTenantAndAdmin();

      const customerSpy = jest
        .spyOn(stripe.customers, "create")
        .mockResolvedValue({ id: "cus_new_test_123" });
      const customerListSpy = jest
        .spyOn(stripe.customers, "list")
        .mockResolvedValue({ data: [] });
      const checkoutSpy = jest
        .spyOn(stripe.checkout.sessions, "create")
        .mockResolvedValue({
          id: "cs_new_test_123",
          url: "https://checkout.stripe.com/c/pay/cs_new_test_123",
        });

      const res = await request(app)
        .post("/subscription/stripe/create-checkout-session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: plan._id.toString(), billingCycle: "monthly" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBe("cs_new_test_123");
      expect(res.body.url).toBe("https://checkout.stripe.com/c/pay/cs_new_test_123");

      // Verify that mode: "subscription" was passed to Stripe
      expect(checkoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
        })
      );

      customerSpy.mockRestore();
      customerListSpy.mockRestore();
      checkoutSpy.mockRestore();
    });

    test("POST /subscription/stripe/change-plan updates existing subscription with proration", async () => {
      const { tenant, plan, adminToken } = await setupTenantAndAdmin();

      const upgradePlan = await PlanModel.create({
        planName: "Enterprise Plan",
        price: 4999,
        yearlyPrice: 49990,
        stripePriceIdMonthly: "price_enterprise_monthly",
        limits: { maxUsers: 100, maxLeads: 10000, maxProjects: 200, maxBranches: 50 },
      });

      await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        stripeCustomerId: "cus_change_test",
        stripeSubscriptionId: "sub_change_test",
      });

      const retrieveSpy = jest
        .spyOn(stripe.subscriptions, "retrieve")
        .mockResolvedValue({
          id: "sub_change_test",
          items: { data: [{ id: "si_mock_item_1" }] },
        });

      const updateSpy = jest
        .spyOn(stripe.subscriptions, "update")
        .mockResolvedValue({
          id: "sub_change_test",
        });

      const res = await request(app)
        .post("/subscription/stripe/change-plan")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: upgradePlan._id.toString(), billingCycle: "monthly" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/proration/i);

      expect(updateSpy).toHaveBeenCalledWith(
        "sub_change_test",
        expect.objectContaining({
          proration_behavior: "create_prorations",
          items: [{ id: "si_mock_item_1", price: "price_enterprise_monthly" }],
        })
      );

      retrieveSpy.mockRestore();
      updateSpy.mockRestore();
    });
  });

  // ── 2. STRIPE BILLING PORTAL SESSION (0.4) ───────────────────────────
  describe("0.4 Stripe Billing Customer Portal Endpoint", () => {
    test("rejects non-admin role with 403 Forbidden", async () => {
      const { memberToken } = await setupTenantAndAdmin();

      const res = await request(app)
        .post("/subscription/stripe/create-portal-session")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/administrators/i);
    });

    test("creates portal session for tenant with customer id", async () => {
      const { tenant, plan, adminToken } = await setupTenantAndAdmin();

      await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        stripeCustomerId: "cus_mock_portal_123",
        stripeSubscriptionId: "sub_mock_portal_123",
      });

      // Spy on billing portal session creation
      const portalSpy = jest
        .spyOn(stripe.billingPortal.sessions, "create")
        .mockResolvedValue({ url: "https://billing.stripe.com/p/session/test_portal_123" });

      const res = await request(app)
        .post("/subscription/stripe/create-portal-session")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toBe("https://billing.stripe.com/p/session/test_portal_123");

      portalSpy.mockRestore();
    });
  });

  // ── 3. STRIPE WEBHOOK EVENTS (0.3) ────────────────────────────────────
  describe("0.3 Stripe Webhook Events & Lifecycle Handling", () => {
    test("checkout.session.completed: activates subscription and records stripeCustomerId & stripeSubscriptionId", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const eventPayload = {
        id: "evt_checkout_completed_test",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_session_123",
            mode: "subscription",
            payment_status: "paid",
            status: "complete",
            amount_total: 99900,
            currency: "inr",
            customer: "cus_stripe_customer_789",
            subscription: "sub_stripe_sub_456",
            payment_intent: "pi_stripe_pi_111",
            metadata: {
              tenantId: tenant._id.toString(),
              planId: plan._id.toString(),
              billingCycle: "monthly",
            },
          },
        },
      };

      const res = await createSignedStripeWebhookRequest(eventPayload);
      expect(res.status).toBe(200);

      // Verify DB records
      const subscription = await SubscriptionModel.findOne({ tenantId: tenant._id, status: "active" });
      expect(subscription).toBeDefined();
      expect(subscription.stripeCustomerId).toBe("cus_stripe_customer_789");
      expect(subscription.stripeSubscriptionId).toBe("sub_stripe_sub_456");
      expect(subscription.stripeSessionId).toBe("cs_test_session_123");
      expect(subscription.paymentHistory.length).toBe(1);
      expect(subscription.paymentHistory[0].method).toBe("stripe");

      // Tenant updated to Active
      const updatedTenant = await TenantModel.findById(tenant._id);
      expect(updatedTenant.status).toBe("Active");
      expect(updatedTenant.planId.toString()).toBe(plan._id.toString());
    });

    test("mid-period paying tenant sees failed checkout attempt: changes NOTHING", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const origPeriodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const activeSub = await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        stripeCustomerId: "cus_midperiod_123",
        stripeSubscriptionId: "sub_midperiod_123",
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: origPeriodEnd,
        paymentHistory: [{ amount: 999, currency: "INR", status: "success", method: "stripe", paidAt: new Date() }],
      });

      // Failed or incomplete checkout attempt
      const failedCheckoutPayload = {
        id: "evt_failed_checkout_attempt",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_failed_session",
            mode: "subscription",
            payment_status: "unpaid", // Unpaid / failed
            status: "open",
            metadata: {
              tenantId: tenant._id.toString(),
              planId: plan._id.toString(),
            },
          },
        },
      };

      const res = await createSignedStripeWebhookRequest(failedCheckoutPayload);
      expect(res.status).toBe(200);

      // Verify active subscription and tenant state are COMPLETELY UNTOUCHED
      const subAfter = await SubscriptionModel.findById(activeSub._id);
      expect(subAfter.status).toBe("active");
      expect(subAfter.currentPeriodEnd.getTime()).toBe(origPeriodEnd.getTime());
      expect(subAfter.paymentHistory.length).toBe(1);

      const tenantAfter = await TenantModel.findById(tenant._id);
      expect(tenantAfter.status).toBe("Active");
    });

    test("invoice.paid: updates period end from line item end Unix timestamp", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const futureEndSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const sub = await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "past_due",
        gracePeriodStartedAt: new Date(),
        stripeCustomerId: "cus_renew_123",
        stripeSubscriptionId: "sub_renew_123",
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 1000),
      });

      const invoicePaidPayload = {
        id: "evt_invoice_paid_test",
        type: "invoice.paid",
        data: {
          object: {
            id: "in_invoice_paid_123",
            subscription: "sub_renew_123",
            customer: "cus_renew_123",
            amount_paid: 99900,
            currency: "inr",
            payment_intent: "pi_renew_paid_555",
            lines: {
              data: [
                {
                  period: {
                    start: Math.floor(Date.now() / 1000),
                    end: futureEndSeconds,
                  },
                },
              ],
            },
          },
        },
      };

      const res = await createSignedStripeWebhookRequest(invoicePaidPayload);
      expect(res.status).toBe(200);

      const updatedSub = await SubscriptionModel.findById(sub._id);
      expect(updatedSub.status).toBe("active");
      expect(updatedSub.gracePeriodStartedAt).toBeNull();
      expect(Math.floor(updatedSub.currentPeriodEnd.getTime() / 1000)).toBe(futureEndSeconds);

      const updatedTenant = await TenantModel.findById(tenant._id);
      expect(updatedTenant.status).toBe("Active");
      expect(updatedTenant.gracePeriodStartedAt).toBeNull();
    });

    test("invoice.payment_failed: marks past_due, records gracePeriodStartedAt, updates tenant to PastDue", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const sub = await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        stripeCustomerId: "cus_fail_123",
        stripeSubscriptionId: "sub_fail_123",
      });

      const invoiceFailedPayload = {
        id: "evt_invoice_payment_failed_test",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "in_failed_456",
            subscription: "sub_fail_123",
            customer: "cus_fail_123",
            amount_due: 99900,
            currency: "inr",
            payment_intent: "pi_failed_777",
          },
        },
      };

      const res = await createSignedStripeWebhookRequest(invoiceFailedPayload);
      expect(res.status).toBe(200);

      const updatedSub = await SubscriptionModel.findById(sub._id);
      expect(updatedSub.status).toBe("past_due");
      expect(updatedSub.gracePeriodStartedAt).toBeInstanceOf(Date);
      expect(updatedSub.paymentHistory.some((p) => p.status === "failed")).toBe(true);

      const updatedTenant = await TenantModel.findById(tenant._id);
      expect(updatedTenant.status).toBe("PastDue");
      expect(updatedTenant.gracePeriodStartedAt).toBeInstanceOf(Date);
    });

    test("customer.subscription.updated: syncs status past_due / active from Stripe", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const sub = await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        stripeSubscriptionId: "sub_sync_test",
      });

      const updatedPayload = {
        id: "evt_sub_updated_test",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_sync_test",
            status: "past_due",
            cancel_at_period_end: true,
            current_period_end: Math.floor(Date.now() / 1000) + 86400 * 5,
            metadata: { tenantId: tenant._id.toString() },
          },
        },
      };

      const res = await createSignedStripeWebhookRequest(updatedPayload);
      expect(res.status).toBe(200);

      const subAfter = await SubscriptionModel.findById(sub._id);
      expect(subAfter.status).toBe("past_due");
      expect(subAfter.cancelAtPeriodEnd).toBe(true);

      const tenantAfter = await TenantModel.findById(tenant._id);
      expect(tenantAfter.status).toBe("PastDue");
    });

    test("customer.subscription.deleted: marks cancelled and downgrades tenant to Free plan", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const freePlan = await PlanModel.create({
        planName: "Free",
        price: 0,
        limits: { maxUsers: 3, maxLeads: 100, maxProjects: 5, maxBranches: 1 },
      });

      const sub = await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        stripeSubscriptionId: "sub_del_test",
      });

      const deletedPayload = {
        id: "evt_sub_deleted_test",
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_del_test",
            metadata: { tenantId: tenant._id.toString() },
          },
        },
      };

      const res = await createSignedStripeWebhookRequest(deletedPayload);
      expect(res.status).toBe(200);

      const subAfter = await SubscriptionModel.findById(sub._id);
      expect(subAfter.status).toBe("cancelled");
      expect(subAfter.cancelledAt).toBeInstanceOf(Date);

      const tenantAfter = await TenantModel.findById(tenant._id);
      expect(tenantAfter.status).toBe("Active");
      expect(tenantAfter.planId.toString()).toBe(freePlan._id.toString());
    });

    test("webhook idempotency: duplicate event is safely acknowledged without duplicate actions", async () => {
      const { tenant, plan } = await setupTenantAndAdmin();

      const eventPayload = {
        id: "evt_idempotency_duplicate_test",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_duplicate_session",
            mode: "subscription",
            payment_status: "paid",
            status: "complete",
            amount_total: 99900,
            currency: "inr",
            customer: "cus_idemp_1",
            subscription: "sub_idemp_1",
            metadata: {
              tenantId: tenant._id.toString(),
              planId: plan._id.toString(),
            },
          },
        },
      };

      // First delivery
      const res1 = await createSignedStripeWebhookRequest(eventPayload);
      expect(res1.status).toBe(200);

      // Second delivery with identical event ID
      const res2 = await createSignedStripeWebhookRequest(eventPayload);
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe("already_processed");

      // DB should have exactly 1 webhook event record
      const events = await WebhookEventModel.find({ eventId: "evt_idempotency_duplicate_test" });
      expect(events.length).toBe(1);
    });
  });

  // ── 4. RAZORPAY GATING BEHIND RAZORPAY_ENABLED (0.5) ──────────────────
  describe("0.5 Razorpay Route Gating Behind RAZORPAY_ENABLED", () => {
    test("when RAZORPAY_ENABLED is false (default), all Razorpay endpoints return 404", async () => {
      const { adminToken } = await setupTenantAndAdmin();
      delete process.env.RAZORPAY_ENABLED;

      const orderRes = await request(app)
        .post("/subscription/create-order")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ planId: new mongoose.Types.ObjectId() });
      expect(orderRes.status).toBe(404);
      expect(orderRes.body.message).toMatch(/disabled/i);

      const verifyRes = await request(app)
        .post("/subscription/verify-payment")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(verifyRes.status).toBe(404);
      expect(verifyRes.body.message).toMatch(/disabled/i);

      const webhookRes = await request(app)
        .post("/subscription/webhook")
        .send({});
      expect(webhookRes.status).toBe(404);
      expect(webhookRes.body.message).toMatch(/disabled/i);
    });
  });
});
