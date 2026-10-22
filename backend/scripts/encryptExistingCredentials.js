/**
 * scripts/encryptExistingCredentials.js
 *
 * Idempotently encrypts existing plaintext credentials at rest:
 * - WhatsappCredModel (instanceId, token)
 * - SoftwareSettingModel (password -> SMTP password, geminiApiKey)
 *
 * Marks already-bcrypted SMTP passwords as "needs re-entry" (smtpNeedsReentry: true)
 * since bcrypt hashes cannot be decrypted.
 *
 * Usage:
 *   node scripts/encryptExistingCredentials.js [--dry-run]
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import WhatsappCredModel from "../models/whatsappCredModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import { encryptCredential, isEncrypted } from "../services/crypto.js";

async function encryptExistingCredentials() {
  const isDryRun = process.argv.includes("--dry-run");
  const mongoUri = process.env.urlDB || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm";

  console.log(`[Credential Encryption] Connecting to MongoDB... (dry-run: ${isDryRun})`);
  await mongoose.connect(mongoUri);

  // 1. Process WhatsApp credentials
  const waCreds = await WhatsappCredModel.find({});
  console.log(`[Credential Encryption] Found ${waCreds.length} WhatsApp credential records.`);

  let waEncryptedCount = 0;
  for (const cred of waCreds) {
    let modified = false;
    const update = {};

    if (cred.instanceId && !isEncrypted(cred.instanceId)) {
      update.instanceId = encryptCredential(cred.instanceId);
      modified = true;
    }

    if (cred.token && !isEncrypted(cred.token)) {
      update.token = encryptCredential(cred.token);
      modified = true;
    }

    if (modified) {
      waEncryptedCount++;
      if (!isDryRun) {
        await WhatsappCredModel.updateOne({ _id: cred._id }, { $set: update });
      }
    }
  }
  console.log(`[Credential Encryption] WhatsApp credentials encrypted: ${waEncryptedCount}`);

  // 2. Process Software Settings (SMTP password and geminiApiKey)
  const settings = await SoftwareSettingModel.find({});
  console.log(`[Credential Encryption] Found ${settings.length} SoftwareSetting records.`);

  let smtpNeedsReentryCount = 0;
  let smtpEncryptedCount = 0;
  let geminiEncryptedCount = 0;

  for (const setting of settings) {
    let modified = false;
    const update = {};

    if (setting.password) {
      if (setting.password.startsWith("$2a$") || setting.password.startsWith("$2b$")) {
        // Bcrypt hash cannot be reversed — flag for re-entry
        update.smtpNeedsReentry = true;
        smtpNeedsReentryCount++;
        modified = true;
      } else if (!isEncrypted(setting.password)) {
        update.password = encryptCredential(setting.password);
        update.smtpNeedsReentry = false;
        smtpEncryptedCount++;
        modified = true;
      }
    }

    if (setting.geminiApiKey && !isEncrypted(setting.geminiApiKey)) {
      update.geminiApiKey = encryptCredential(setting.geminiApiKey);
      geminiEncryptedCount++;
      modified = true;
    }

    if (modified && !isDryRun) {
      await SoftwareSettingModel.updateOne({ _id: setting._id }, { $set: update });
    }
  }

  console.log(`[Credential Encryption] SMTP passwords marked 'needs re-entry': ${smtpNeedsReentryCount}`);
  console.log(`[Credential Encryption] Plaintext SMTP passwords encrypted: ${smtpEncryptedCount}`);
  console.log(`[Credential Encryption] Gemini API keys encrypted: ${geminiEncryptedCount}`);

  if (isDryRun) {
    console.log("[Credential Encryption] Dry-run completed. No database documents were modified.");
  } else {
    console.log("[Credential Encryption] Migration completed successfully.");
  }

  await mongoose.disconnect();
}

if (process.env.NODE_ENV !== "test") {
  encryptExistingCredentials().catch((err) => {
    console.error("[Credential Encryption] Error:", err);
    process.exit(1);
  });
}

export default encryptExistingCredentials;
