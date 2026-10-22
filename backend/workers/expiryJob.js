import cron from "node-cron";
import TenantModel from "../models/tenantModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import PlanModel from "../models/planModel.js";
import { withLock } from "../services/lockService.js";
import { TENANT_STATUS, SUBSCRIPTION_STATUS } from "../constants/billingStatuses.js";

/**
 * Daily subscription & trial expiry processing.
 *
 * Rules:
 * 1. Checks trialEnd / currentPeriodEnd against current UTC time.
 * 2. If expired within GRACE_DAYS (env, default 5) -> status becomes "PastDue"
 * 3. If past grace period -> downgrades to Free plan, keeps data readable,
 *    and sets tenant status to "Active" on Free plan (or "Expired" if no Free plan exists).
 */
export const runExpiryCheck = async () => {
  const graceDays = parseInt(process.env.GRACE_DAYS || "5", 10);
  const now = new Date();

  console.log(`[ExpiryJob] Starting subscription expiry run (Grace days: ${graceDays})`);

  const subscriptions = await SubscriptionModel.find({
    status: { $in: ["active", "trial", "past_due"] },
  }).populate("planId");

  let pastDueCount = 0;
  let downgradedCount = 0;

  const freePlan = await PlanModel.findOne({
    $or: [{ price: 0 }, { name: { $regex: /free/i } }],
    isActive: true,
  });

  for (const sub of subscriptions) {
    const periodEnd = sub.currentPeriodEnd || sub.endDate || sub.trialEndsAt;
    if (!periodEnd) continue;

    const endDate = new Date(periodEnd);
    if (now > endDate) {
      const daysPastEnd = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysPastEnd <= graceDays) {
        // Within grace window -> PastDue
        if (sub.status !== "past_due") {
          sub.status = "past_due";
          if (!sub.gracePeriodStartedAt) {
            sub.gracePeriodStartedAt = now;
          }
          await sub.save();
          await TenantModel.findByIdAndUpdate(sub.tenantId, {
            status: "PastDue",
            gracePeriodStartedAt: sub.gracePeriodStartedAt,
          });
          pastDueCount++;
        }
      } else {
        // Beyond grace window -> Downgrade to Free plan
        if (freePlan) {
          sub.status = "cancelled";
          sub.cancelledAt = now;
          sub.gracePeriodStartedAt = null;
          await sub.save();

          await TenantModel.findByIdAndUpdate(sub.tenantId, {
            planId: freePlan._id,
            status: "Active", // Keep active so existing data remains readable
            subscriptionEnd: null,
            isTrialActive: false,
            gracePeriodStartedAt: null,
          });

          // Create free subscription record
          await SubscriptionModel.create({
            tenantId: sub.tenantId,
            planId: freePlan._id,
            billingCycle: "monthly",
            amount: 0,
            currency: "USD",
            status: "active",
            startDate: now,
            currentPeriodStart: now,
            currentPeriodEnd: null,
          });

          downgradedCount++;
        } else {
          // If no Free plan exists, transition to Expired
          sub.status = "expired";
          await sub.save();
          await TenantModel.findByIdAndUpdate(sub.tenantId, { status: "Expired" });
          downgradedCount++;
        }
      }
    }
  }

  // Also check tenants without subscription records whose trial/subscription dates expired
  const expiredTenants = await TenantModel.find({
    status: { $in: ["Active", "PastDue"] },
    isDemo: { $ne: true },
    $or: [
      { subscriptionEnd: { $lt: now } },
      { trialEndsAt: { $lt: now }, isTrialActive: true },
    ],
  });

  for (const tenant of expiredTenants) {
    const endDate = tenant.subscriptionEnd || tenant.trialEndsAt;
    if (!endDate) continue;

    const daysPast = Math.floor((now.getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysPast <= graceDays) {
      if (tenant.status !== "PastDue") {
        tenant.status = "PastDue";
        if (!tenant.gracePeriodStartedAt) {
          tenant.gracePeriodStartedAt = now;
        }
        await tenant.save();
        pastDueCount++;
      }
    } else {
      if (freePlan) {
        tenant.planId = freePlan._id;
        tenant.status = "Active";
        tenant.subscriptionEnd = null;
        tenant.isTrialActive = false;
        tenant.gracePeriodStartedAt = null;
        await tenant.save();
        downgradedCount++;
      } else {
        tenant.status = "Expired";
        tenant.gracePeriodStartedAt = null;
        await tenant.save();
        downgradedCount++;
      }
    }
  }

  console.log(`[ExpiryJob] Completed run. Moved to PastDue: ${pastDueCount}, Downgraded/Expired: ${downgradedCount}`);
  return { pastDueCount, downgradedCount };
};

export const initExpiryCron = () => {
  // Run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    await withLock("daily_expiry_job", 300, async () => {
      await runExpiryCheck();
    });
  });
};

export default {
  runExpiryCheck,
  initExpiryCron,
};
