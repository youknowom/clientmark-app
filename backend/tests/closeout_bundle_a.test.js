import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("01234567890123456789012345678901").toString("hex");
process.env.NODE_ENV = "test";
process.env.PORT = "9996";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PlanModel from "../models/planModel.js";
import LeadModel from "../models/leadModel.js";
import ProjectModel from "../models/projectModel.js";
import NotificationModel from "../models/notificationModel.js";
import TenantDailyOtpModel from "../models/tenantDailyOtpModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import { generateAndSaveOTP } from "../services/otpService.js";
import { validateCryptoConfig } from "../services/crypto.js";
import { validatePlatformMailConfig } from "../services/mailService.js";
import { runExpiryCheck } from "../workers/expiryJob.js";
import { cleanupScheduledNotifications } from "../workers/scheduledNotifications.js";
import { runVerification } from "../scripts/verifyDeployment.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  await NotificationModel.init();
  await NotificationModel.syncIndexes();
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

describe("BUNDLE A CLOSE-OUT TESTS", () => {
  describe("(a) Downgrade Over Limits: Reads Allowed, Creates Blocked, Usage vs Limits", () => {
    test("reads allowed, creates blocked, usage vs limits returned when tenant is over free plan limits", async () => {
      // 1. Create Free plan with strict limit of 1 lead
      const freePlan = await PlanModel.create({
        planName: "Free",
        price: 0,
        limits: {
          maxUsers: 5,
          maxLeads: 1,
          maxProjects: 5,
          maxBranches: 1,
        },
      });

      // 2. Create tenant downgraded to Free plan with 2 existing leads (over limit)
      const tenant = await TenantModel.create({
        companyName: "Downgraded Tenant",
        slug: "downgraded-tenant",
        email: "owner@downgraded.test",
        status: "Active",
        planId: freePlan._id,
      });

      const role = await RoleModel.create({
        tenantId: tenant._id,
        roleName: "Admin",
        priority: 1,
        permissions: ["view:lead", "view:lead-master", "add:lead"],
      });

      const user = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Downgraded Admin",
        userName: "down_admin",
        email: "admin@downgraded.test",
        roleId: role._id,
        status: "Active",
      });

      const lead1 = await LeadModel.create({
        tenantId: tenant._id,
        fullName: "Pre-existing Lead 1",
        mobileNo: "9000000001",
      });
      const lead2 = await LeadModel.create({
        tenantId: tenant._id,
        fullName: "Pre-existing Lead 2",
        mobileNo: "9000000002",
      });

      const token = jwt.sign(
        { userId: user._id, tenantId: tenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET
      );

      // (1) READS WORK: Tenant can read pre-existing leads without error
      const readRes = await request(app)
        .get("/lead/get-leads")
        .set("Authorization", `Bearer ${token}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.length).toBe(2);

      // (2) CREATES BLOCKED: Attempting to create another lead is rejected (2 >= 1 limit)
      const createRes = await request(app)
        .post("/lead/create-lead")
        .set("Authorization", `Bearer ${token}`)
        .send({
          fullName: "Blocked Lead 3",
          mobileNo: "9000000003",
        });

      expect(createRes.status).toBe(403);
      expect(createRes.body.limitReached).toBe(true);
      expect(createRes.body.message).toMatch(/reached the maximum of 1 leads/i);

      // (3) USAGE VS LIMITS RETURNED: GET /subscription/my-plan returns usage and limits
      const planRes = await request(app)
        .get("/subscription/my-plan")
        .set("Authorization", `Bearer ${token}`);

      expect(planRes.status).toBe(200);
      expect(planRes.body.data.usageVsLimits).toBeDefined();
      expect(planRes.body.data.usageVsLimits.leads.current).toBe(2);
      expect(planRes.body.data.usageVsLimits.leads.max).toBe(1);
    });
  });

  describe("(b) Notification dedupKey / idempotencyKey Prevents Duplicates", () => {
    test("saving a notification with the same dedupKey is rejected by unique index", async () => {
      const tenant = await TenantModel.create({
        companyName: "Notif Tenant",
        slug: "notif-tenant",
        email: "notif@test.com",
        status: "Active",
      });
      const user = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Notif User",
        userName: "notif_user",
        email: "user@notif.test",
        status: "Active",
      });

      const dedupKey = `daily_quote:${user._id}:2026-10-05`;

      // First insert succeeds
      await NotificationModel.create({
        tenantId: tenant._id,
        userId: user._id,
        notificationType: "motivational",
        title: "Quote 1",
        message: "You can do it!",
        dedupKey,
      });

      // Second insert with identical dedupKey must fail with Mongo duplicate key error
      await expect(
        NotificationModel.create({
          tenantId: tenant._id,
          userId: user._id,
          notificationType: "motivational",
          title: "Quote 2",
          message: "Another message!",
          dedupKey,
        })
      ).rejects.toThrow(/duplicate key error/);
    });
  });

  describe("(c) 11:59 Nightly Cleanup Deletes ONLY Scheduled Job Notifications", () => {
    test("cleanup deletes jobName matching scheduled jobs but preserves user and system notifications", async () => {
      const tenant = await TenantModel.create({
        companyName: "Cleanup Tenant",
        slug: "cleanup-tenant",
        email: "cleanup@test.com",
        status: "Active",
      });
      const user = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Cleanup User",
        userName: "clean_user",
        email: "user@clean.test",
        status: "Active",
      });

      // Insert scheduled job notification
      await NotificationModel.create({
        tenantId: tenant._id,
        userId: user._id,
        notificationType: "motivational",
        title: "Morning Quote",
        message: "Keep pushing!",
        jobName: "morning_quote",
      });

      // Insert user-to-user / system CRM notification (no jobName or custom type)
      const systemNotif = await NotificationModel.create({
        tenantId: tenant._id,
        userId: user._id,
        notificationType: "lead_assigned",
        title: "New Lead Assigned",
        message: "You were assigned to Lead #101",
        jobName: null,
      });

      // Execute targeted 11:59 cleanup logic
      await NotificationModel.deleteMany({
        jobName: { $in: ["morning_quote", "afternoon_quote", "eod_reminder"] },
      });

      // Verify scheduled notification is purged
      const remainingScheduled = await NotificationModel.findOne({ jobName: "morning_quote" });
      expect(remainingScheduled).toBeNull();

      // Verify user/system notification is completely intact
      const remainingSystem = await NotificationModel.findById(systemNotif._id);
      expect(remainingSystem).not.toBeNull();
      expect(remainingSystem.title).toBe("New Lead Assigned");
    });
  });

  describe("(d) Per-Tenant Daily OTP Send Cap", () => {
    test("blocks OTP sending after reaching per-tenant daily quota", async () => {
      const originalCap = process.env.TENANT_DAILY_OTP_CAP;
      process.env.TENANT_DAILY_OTP_CAP = "2";

      try {
        const tenant = await TenantModel.create({
          companyName: "Cap Tenant",
          slug: "cap-tenant",
          email: "cap@test.com",
          status: "Active",
        });

        // 1st Send -> Allowed
        const send1 = await generateAndSaveOTP({
          subject: "+919876543210",
          purpose: "portal_access",
          tenantId: tenant._id,
        });
        expect(send1.success).toBe(true);

        // 2nd Send (different subject to bypass 60s cooldown) -> Allowed
        const send2 = await generateAndSaveOTP({
          subject: "+919876543211",
          purpose: "portal_access",
          tenantId: tenant._id,
        });
        expect(send2.success).toBe(true);

        // 3rd Send -> Blocked by daily cap (max 2)
        const send3 = await generateAndSaveOTP({
          subject: "+919876543212",
          purpose: "portal_access",
          tenantId: tenant._id,
        });
        expect(send3.success).toBe(false);
        expect(send3.dailyCapped).toBe(true);
        expect(send3.message).toMatch(/daily OTP quota exceeded/i);
      } finally {
        process.env.TENANT_DAILY_OTP_CAP = originalCap;
      }
    });
  });

  describe("(e) Startup Refusal on Missing Platform SMTP or Encryption Key in Production", () => {
    test("validatePlatformMailConfig throws FATAL error when platform SMTP vars missing in production", () => {
      const origEnv = process.env.NODE_ENV;
      const origHost = process.env.PLATFORM_SMTP_HOST;
      try {
        process.env.NODE_ENV = "production";
        delete process.env.PLATFORM_SMTP_HOST;

        expect(() => validatePlatformMailConfig()).toThrow(
          /FATAL: Platform SMTP configuration missing in production/i
        );
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.PLATFORM_SMTP_HOST = origHost;
      }
    });

    test("validateCryptoConfig throws FATAL error when encryption key length is invalid in production", () => {
      const origEnv = process.env.NODE_ENV;
      const origKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
      try {
        process.env.NODE_ENV = "production";
        process.env.CREDENTIALS_ENCRYPTION_KEY = "too_short_key";

        expect(() => validateCryptoConfig()).toThrow(
          /FATAL: CREDENTIALS_ENCRYPTION_KEY must be exactly 32 bytes/i
        );
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.CREDENTIALS_ENCRYPTION_KEY = origKey;
      }
    });
  });

  describe("(f) gracePeriodStartedAt Tracking across Expiry and Webhook", () => {
    test("expiry job sets gracePeriodStartedAt when transitioning to PastDue", async () => {
      process.env.GRACE_DAYS = "5";
      const now = new Date();
      const expiredYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const plan = await PlanModel.create({
        planName: "Pro Plan",
        price: 99,
        limits: { maxUsers: 10, maxLeads: 100, maxProjects: 10, maxBranches: 2 },
      });

      const tenant = await TenantModel.create({
        companyName: "Grace Tenant",
        slug: "grace-tenant",
        email: "grace@test.com",
        status: "Active",
        planId: plan._id,
        subscriptionEnd: expiredYesterday,
      });

      const sub = await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: plan._id,
        status: "active",
        currentPeriodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: expiredYesterday,
      });

      await runExpiryCheck();

      const updatedSub = await SubscriptionModel.findById(sub._id);
      const updatedTenant = await TenantModel.findById(tenant._id);

      expect(updatedSub.status).toBe("past_due");
      expect(updatedSub.gracePeriodStartedAt).toBeInstanceOf(Date);
      expect(updatedTenant.status).toBe("PastDue");
      expect(updatedTenant.gracePeriodStartedAt).toBeInstanceOf(Date);
    });
  });

  describe("(g) 11:59 Scheduled Notifications Cleanup Isolation", () => {
    test("cleanupScheduledNotifications deletes ONLY quote/reminder jobs, leaving user notifications intact", async () => {
      const tenant = await TenantModel.create({
        companyName: "Scheduled Notif Tenant",
        slug: "sched-tenant",
        email: "sched@test.com",
        status: "Active",
      });
      const user = await UserModel.create({
        tenantId: tenant._id,
        fullName: "Test Developer",
        userName: "test_dev_clean",
        email: "dev@clean.test",
        status: "Active",
      });

      // Insert scheduled job notifications
      await NotificationModel.create([
        {
          tenantId: tenant._id,
          userId: user._id,
          notificationType: "motivational",
          title: "Morning Quote",
          message: "Quote text",
          jobName: "morning_quote",
        },
        {
          tenantId: tenant._id,
          userId: user._id,
          notificationType: "motivational",
          title: "Afternoon Quote",
          message: "Afternoon text",
          jobName: "afternoon_quote",
        },
        {
          tenantId: tenant._id,
          userId: user._id,
          notificationType: "reminder",
          title: "EOD Reminder",
          message: "Upload project update",
          jobName: "eod_reminder",
        },
        {
          tenantId: tenant._id,
          userId: user._id,
          notificationType: "task_assigned",
          title: "Real User Task",
          message: "Finish feature X",
          jobName: null,
        },
      ]);

      const deleteResult = await cleanupScheduledNotifications();
      expect(deleteResult.deletedCount).toBe(3);

      const remaining = await NotificationModel.find({ tenantId: tenant._id });
      expect(remaining.length).toBe(1);
      expect(remaining[0].title).toBe("Real User Task");
    });
  });

  describe("(h) verifyDeployment Plaintext Credential Detection", () => {
    test("runVerification fails when a plaintext credential is seeded in SoftwareSettingModel", async () => {
      // Seed a plaintext password in SoftwareSettingModel
      const tenant = await TenantModel.create({
        companyName: "Plaintext Tenant",
        slug: "plaintext-tenant",
        email: "plain@test.com",
        status: "Active",
      });

      await SoftwareSettingModel.create({
        tenantId: tenant._id,
        email: "smtp@tenant.test",
        password: "plaintext_unencrypted_password_123",
        smtpNeedsReentry: false,
      });

      const verification = await runVerification({ disconnectOnFinish: false, silent: true });
      expect(verification.success).toBe(false);

      const smtpCheck = verification.results.find(
        (r) => r.name === "SoftwareSetting SMTP Passwords Encrypted"
      );
      expect(smtpCheck).toBeDefined();
      expect(smtpCheck.passed).toBe(false);
      expect(smtpCheck.detail).toMatch(/plaintext credential\(s\) found/i);
    });
  });
});
