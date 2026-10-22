import crypto from "crypto";
import OTPModel from "../models/otpModel.js";
import OTPRateLimitModel from "../models/otpRateLimitModel.js";
import TenantDailyOtpModel from "../models/tenantDailyOtpModel.js";

const COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_TTL_MINUTES = 10;

const getHmacSecret = () => {
  return process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET || "fallback_otp_secret_replace_in_prod";
};

export const computeHmacHash = (purpose, subject, otp) => {
  const secret = getHmacSecret();
  const normalizedSubject = subject.toLowerCase().trim();
  const payload = `${purpose}:${normalizedSubject}:${otp}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Validates rate limit cooldown and hourly send cap using OTPRateLimitModel.
 * Also enforces atomic per-tenant daily send cap per UTC day using TenantDailyOtpModel.
 * Survives OTP document expiration.
 */
export const checkAndRecordSendRateLimit = async ({ subject, purpose, tenantId = null }) => {
  const normalizedSubject = subject.toLowerCase().trim();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const cooldownThreshold = new Date(now.getTime() - COOLDOWN_SECONDS * 1000);
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24hr retention

  // 1. Atomic per-tenant UTC day send cap with findOneAndUpdate and limit condition
  if (tenantId) {
    const tenantDailyCap = parseInt(process.env.TENANT_DAILY_OTP_CAP || "200", 10);
    const utcDay = now.toISOString().slice(0, 10);
    const ttlExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const counter = await TenantDailyOtpModel.findOneAndUpdate(
      { tenantId, utcDay, count: { $lt: tenantDailyCap } },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: ttlExpiresAt } },
      { new: true }
    );

    if (!counter) {
      const existing = await TenantDailyOtpModel.findOne({ tenantId, utcDay });
      if (existing && existing.count >= tenantDailyCap) {
        return {
          allowed: false,
          dailyCapped: true,
          message: "Organization daily OTP quota exceeded. Please contact your administrator.",
        };
      }

      try {
        await TenantDailyOtpModel.create({
          tenantId,
          utcDay,
          count: 1,
          expiresAt: ttlExpiresAt,
        });
      } catch (dupErr) {
        const retry = await TenantDailyOtpModel.findOneAndUpdate(
          { tenantId, utcDay, count: { $lt: tenantDailyCap } },
          { $inc: { count: 1 } },
          { new: true }
        );
        if (!retry) {
          return {
            allowed: false,
            dailyCapped: true,
            message: "Organization daily OTP quota exceeded. Please contact your administrator.",
          };
        }
      }
    }
  }

  const record = await OTPRateLimitModel.findOne({
    subject: normalizedSubject,
    purpose,
  });

  if (record) {
    // 1. Check 60s cooldown
    if (record.lastSentAt && record.lastSentAt > cooldownThreshold) {
      const waitSeconds = Math.ceil((record.lastSentAt.getTime() + COOLDOWN_SECONDS * 1000 - now.getTime()) / 1000);
      return {
        allowed: false,
        cooldown: true,
        waitSeconds: Math.max(waitSeconds, 1),
        message: `Please wait ${Math.max(waitSeconds, 1)} seconds before requesting a new code.`,
      };
    }

    // 2. Check 1-hour send cap
    const recentSends = (record.sendTimestamps || []).filter((t) => t > oneHourAgo);
    if (recentSends.length >= MAX_SENDS_PER_HOUR) {
      return {
        allowed: false,
        hourlyCapped: true,
        message: "Maximum OTP request limit reached for this hour. Please try again later.",
      };
    }

    // Update rate limit doc with current send
    recentSends.push(now);
    await OTPRateLimitModel.updateOne(
      { _id: record._id },
      {
        $set: {
          lastSentAt: now,
          sendTimestamps: recentSends,
          expiresAt,
          ...(tenantId ? { tenantId } : {}),
        },
      }
    );
  } else {
    // First send for this subject + purpose
    await OTPRateLimitModel.create({
      subject: normalizedSubject,
      purpose,
      tenantId,
      lastSentAt: now,
      sendTimestamps: [now],
      expiresAt,
    });
  }

  return { allowed: true };
};

/**
 * Generates a 6-digit OTP, stores its HMAC-SHA256 hash in OTPModel,
 * and records the send in OTPRateLimitModel.
 * One active OTP per subject + purpose.
 */
export const generateAndSaveOTP = async ({ subject, purpose, tenantId = null }) => {
  const normalizedSubject = subject.toLowerCase().trim();

  // 1. Enforce cooldown and hourly cap
  const limitCheck = await checkAndRecordSendRateLimit({
    subject: normalizedSubject,
    purpose,
    tenantId,
  });

  if (!limitCheck.allowed) {
    return {
      success: false,
      message: limitCheck.message,
      cooldown: limitCheck.cooldown || false,
      hourlyCapped: limitCheck.hourlyCapped || false,
      dailyCapped: limitCheck.dailyCapped || false,
      waitSeconds: limitCheck.waitSeconds || 0,
    };
  }

  // 2. Generate cryptographically random 6-digit code
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const hash = computeHmacHash(purpose, normalizedSubject, plainOtp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  // 3. Invalidate previous active unconsumed OTPs for same subject + purpose
  await OTPModel.deleteMany({
    subject: normalizedSubject,
    purpose,
  });

  // 4. Save new OTP record
  await OTPModel.create({
    purpose,
    subject: normalizedSubject,
    tenantId,
    hash,
    attempts: 0,
    maxAttempts: MAX_VERIFY_ATTEMPTS,
    isLocked: false,
    consumedAt: null,
    lastSentAt: now,
    expiresAt,
  });

  // Return plainOtp solely for the immediate caller to send (never log or store it)
  return {
    success: true,
    plainOtp,
    expiresAt,
  };
};

/**
 * Atomically increments attempts and verifies candidate OTP with constant-time equality.
 * Locks after 5 failed attempts.
 */
export const verifyOTP = async ({ subject, purpose, otp }) => {
  if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
    return {
      success: false,
      message: "Please provide a valid 6-digit verification code.",
    };
  }

  const normalizedSubject = subject.toLowerCase().trim();
  const candidateOtp = otp.trim();
  const now = new Date();

  // Atomic findOneAndUpdate: increments attempts only if attempts < 5 and not locked/consumed
  const activeRecord = await OTPModel.findOneAndUpdate(
    {
      subject: normalizedSubject,
      purpose,
      isLocked: false,
      consumedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_VERIFY_ATTEMPTS },
    },
    {
      $inc: { attempts: 1 },
    },
    {
      new: true,
    }
  );

  // If no record matched the atomic update criteria
  if (!activeRecord) {
    // Check if locked or reached max attempts
    const lockedOrMax = await OTPModel.findOne({
      subject: normalizedSubject,
      purpose,
      $or: [{ isLocked: true }, { attempts: { $gte: MAX_VERIFY_ATTEMPTS } }],
    });

    if (lockedOrMax) {
      if (!lockedOrMax.isLocked) {
        await OTPModel.updateOne({ _id: lockedOrMax._id }, { $set: { isLocked: true } });
      }
      return {
        success: false,
        locked: true,
        message: "Too many failed attempts. This verification code has been locked.",
      };
    }

    return {
      success: false,
      message: "Invalid or expired verification code.",
    };
  }

  // If atomic increment brought attempts to max, lock it
  if (activeRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
    await OTPModel.updateOne({ _id: activeRecord._id }, { $set: { isLocked: true } });
  }

  // Constant-time hash comparison
  const candidateHash = computeHmacHash(purpose, normalizedSubject, candidateOtp);
  let matches = false;
  try {
    matches = crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(activeRecord.hash, "hex")
    );
  } catch (err) {
    matches = false;
  }

  if (matches) {
    // Success: mark consumed
    await OTPModel.updateOne(
      { _id: activeRecord._id },
      { $set: { consumedAt: new Date(), isLocked: false } }
    );
    return {
      success: true,
      message: "Verification successful.",
      tenantId: activeRecord.tenantId,
    };
  }

  if (activeRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
    return {
      success: false,
      locked: true,
      message: "Too many failed attempts. This verification code has been locked.",
    };
  }

  const attemptsLeft = MAX_VERIFY_ATTEMPTS - activeRecord.attempts;
  return {
    success: false,
    locked: false,
    attemptsRemaining: attemptsLeft,
    message: `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
  };
};
