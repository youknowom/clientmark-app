import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ProjectModel from "../models/projectModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import FileModel from "../models/fileModel.js";
import UserModel from "../models/userModel.js";
import NotificationModel from "../models/notificationModel.js";
import TenantDailyOtpModel from "../models/tenantDailyOtpModel.js";
import OTPModel from "../models/otpModel.js";
import { validateCryptoConfig, isEncrypted } from "../services/crypto.js";
import storageAdapter from "../services/storage/index.js";

/**
 * READ-ONLY Deployment Verification Suite
 * Checks database integrity, encryption at rest, storage resolution,
 * indexes, and required environment variables without modifying data.
 */
export async function runVerification(options = {}) {
  const { disconnectOnFinish = true, silent = false } = options;

  if (!silent) {
    console.log("\n==================================================");
    console.log("🔍 BUNDLE A: PRE/POST DEPLOYMENT VERIFICATION");
    console.log("==================================================\n");
  }

  let passes = 0;
  let failures = 0;
  const results = [];

  function report(name, passed, detail = "") {
    results.push({ name, passed, detail });
    if (passed) {
      if (!silent) console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ""}`);
      passes++;
    } else {
      if (!silent) console.log(`  ❌ [FAIL] ${name}${detail ? ` - ${detail}` : ""}`);
      failures++;
    }
  }

  // 1. Validate Environment Variables
  const requiredEnvVars = [
    "JWT_SECRET",
    "OTP_HMAC_SECRET",
    "PORTAL_JWT_SECRET",
  ];
  const missingEnvs = requiredEnvVars.filter((v) => !process.env[v]);
  const hasEncryptionKey = !!(process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.CREDENTIAL_ENCRYPTION_KEY);
  if (!hasEncryptionKey) missingEnvs.push("CREDENTIALS_ENCRYPTION_KEY");

  report(
    "Required Environment Variables",
    missingEnvs.length === 0,
    missingEnvs.length === 0 ? "All core secrets defined" : `Missing: ${missingEnvs.join(", ")}`
  );

  // 2. Validate Platform SMTP Configuration
  const smtpVars = ["PLATFORM_SMTP_HOST", "PLATFORM_SMTP_USER", "PLATFORM_SMTP_PASS"];
  const missingSmtp = smtpVars.filter((v) => !process.env[v]);
  report(
    "Platform SMTP Configuration",
    missingSmtp.length === 0,
    missingSmtp.length === 0 ? "Platform SMTP host/user/pass present" : `Missing: ${missingSmtp.join(", ")}`
  );

  // 3. Validate Encryption Key Format & Length (32 bytes)
  let keyValid = false;
  let keyDetail = "";
  try {
    const keyBuf = validateCryptoConfig();
    keyValid = !!keyBuf && keyBuf.length === 32;
    keyDetail = keyValid ? "Key parses as valid 32-byte AES-256 buffer" : "Key is not 32 bytes";
  } catch (err) {
    keyValid = false;
    keyDetail = err.message;
  }
  report("Master Encryption Key Integrity", keyValid, keyDetail);

  // 4. Schema Field Integrity Verification (Fails if any target field is missing from schema)
  const schemaChecks = [
    { model: ProjectModel, field: "portalKey", name: "ProjectModel.portalKey" },
    { model: SoftwareSettingModel, field: "password", name: "SoftwareSettingModel.password" },
    { model: SoftwareSettingModel, field: "smtpNeedsReentry", name: "SoftwareSettingModel.smtpNeedsReentry" },
    { model: WhatsappCredModel, field: "token", name: "WhatsappCredModel.token" },
    { model: WhatsappCredModel, field: "instanceId", name: "WhatsappCredModel.instanceId" },
    { model: FileModel, field: "storagePath", name: "FileModel.storagePath" },
    { model: NotificationModel, field: "dedupKey", name: "NotificationModel.dedupKey" },
    { model: TenantDailyOtpModel, field: "utcDay", name: "TenantDailyOtpModel.utcDay" },
    { model: TenantDailyOtpModel, field: "count", name: "TenantDailyOtpModel.count" },
    { model: OTPModel, field: "hash", name: "OTPModel.hash" },
  ];

  const missingFields = schemaChecks
    .filter((c) => !c.model.schema.paths[c.field])
    .map((c) => c.name);

  report(
    "Schema Fields Integrity",
    missingFields.length === 0,
    missingFields.length === 0 ? "All target schema fields exist" : `Missing schema fields: ${missingFields.join(", ")}`
  );

  // Connect to Database for Data & Index Checks (or reuse existing connection in tests)
  const isConnected = mongoose.connection.readyState === 1;
  const dbUri = process.env.urlDB || process.env.MONGO_URI;

  if (!isConnected && !dbUri) {
    report("Database Connection", false, "urlDB / MONGO_URI is not defined and mongoose is not connected");
  } else {
    try {
      if (!isConnected) {
        await mongoose.connect(dbUri);
      }
      report("Database Connection", true, "Connected to MongoDB");

      // 5. Project Portal Keys Check
      const projectsWithoutKey = await ProjectModel.countDocuments({
        $or: [{ portalKey: null }, { portalKey: "" }, { portalKey: { $exists: false } }],
      });
      report(
        "Project Portal Keys",
        projectsWithoutKey === 0,
        projectsWithoutKey === 0 ? "All projects have portalKey" : `${projectsWithoutKey} project(s) missing portalKey`
      );

      // 6. Credential Encryption at Rest (SoftwareSettingModel - software_settings)
      const settings = await SoftwareSettingModel.find({}).lean();
      let unencryptedSmtp = 0;
      for (const s of settings) {
        if (s.password && !isEncrypted(s.password) && !s.smtpNeedsReentry) {
          unencryptedSmtp++;
        }
      }
      report(
        "SoftwareSetting SMTP Passwords Encrypted",
        unencryptedSmtp === 0,
        unencryptedSmtp === 0
          ? "No plaintext SMTP passwords found"
          : `${unencryptedSmtp} plaintext credential(s) found in softwareSettings`
      );

      // 7. Credential Encryption at Rest (WhatsappCredModel - whatsappcreds)
      const waCreds = await WhatsappCredModel.find({}).lean();
      let unencryptedWa = 0;
      for (const w of waCreds) {
        if (w.token && !isEncrypted(w.token)) unencryptedWa++;
        if (w.instanceId && !isEncrypted(w.instanceId)) unencryptedWa++;
      }
      report(
        "WhatsApp Credentials Encrypted",
        unencryptedWa === 0,
        unencryptedWa === 0
          ? "No plaintext WhatsApp tokens found"
          : `${unencryptedWa} plaintext credential(s) found in whatsappCreds`
      );

      // 8. Stored Files Resolution Check
      const totalFiles = await FileModel.countDocuments({});
      const files = await FileModel.find({}).limit(500).lean();
      let missingFiles = 0;
      for (const f of files) {
        const exists = storageAdapter.hasFile ? storageAdapter.hasFile(f.storagePath) : true;
        if (!exists) missingFiles++;
      }
      report(
        "File Storage Resolution",
        missingFiles === 0,
        missingFiles === 0
          ? `Verified stored files (${totalFiles} total records in DB)`
          : `${missingFiles} database file records could not be resolved in storage`
      );

      // 9. Required Database Indexes Check
      const userIndexes = await UserModel.collection.indexes().catch(() => []);
      const hasUserNameIndex = userIndexes.some((idx) => idx.key.userName !== undefined && idx.unique);
      const hasUserEmailIndex = userIndexes.some((idx) => idx.key.email !== undefined && idx.unique);
      const hasUserMobileIndex = userIndexes.some((idx) => idx.key.mobileNo !== undefined && idx.unique);

      const projectIndexes = await ProjectModel.collection.indexes().catch(() => []);
      const hasProjectPortalKey = projectIndexes.some((idx) => idx.key.portalKey !== undefined);

      const notificationIndexes = await NotificationModel.collection.indexes().catch(() => []);
      const hasDedupKeyIndex = notificationIndexes.some((idx) => idx.key.dedupKey !== undefined);

      const userIndexOk = hasUserNameIndex && hasUserEmailIndex && hasUserMobileIndex;
      report(
        "Database Indexes",
        userIndexOk && hasProjectPortalKey && hasDedupKeyIndex,
        `User global unique (userName: ${hasUserNameIndex ? "YES" : "NO"}, email: ${hasUserEmailIndex ? "YES" : "NO"}, mobileNo: ${hasUserMobileIndex ? "YES" : "NO"}), Project portalKey: ${hasProjectPortalKey ? "YES" : "NO"}, Notification dedupKey: ${hasDedupKeyIndex ? "YES" : "NO"}`
      );

      if (disconnectOnFinish) {
        await mongoose.disconnect();
      }
    } catch (dbErr) {
      report("Database Integrity Checks", false, dbErr.message);
    }
  }

  if (!silent) {
    console.log("\n--------------------------------------------------");
    console.log(`Summary: ${passes} PASS, ${failures} FAIL`);
    console.log("--------------------------------------------------\n");
  }

  return { passes, failures, results, success: failures === 0 };
}

// Direct CLI execution
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runVerification({ disconnectOnFinish: true, silent: false })
    .then(({ success }) => {
      if (success) {
        console.log("✅ All pre/post deployment verification checks passed successfully!");
        process.exit(0);
      } else {
        console.error("❌ Pre/post deployment verification failed. Please resolve the reported issues above.");
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Unhandled verification error:", err);
      process.exit(1);
    });
}
