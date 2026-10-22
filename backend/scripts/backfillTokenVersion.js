/**
 * scripts/backfillTokenVersion.js
 *
 * Idempotently backfills `tokenVersion: 1` on all UserModel documents
 * where tokenVersion is missing, null, or undefined.
 *
 * Usage:
 *   node scripts/backfillTokenVersion.js [--dry-run]
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import UserModel from "../models/userModel.js";

async function backfillTokenVersion() {
  const isDryRun = process.argv.includes("--dry-run");
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm";

  console.log(`[Backfill] Connecting to MongoDB... (dry-run: ${isDryRun})`);
  await mongoose.connect(mongoUri);

  const query = {
    $or: [
      { tokenVersion: { $exists: false } },
      { tokenVersion: null },
      { tokenVersion: { $lt: 1 } },
    ],
  };

  const countMissing = await UserModel.countDocuments(query);
  console.log(`[Backfill] Found ${countMissing} users needing tokenVersion backfill.`);

  if (countMissing === 0) {
    console.log("[Backfill] All users already have valid tokenVersion. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  if (isDryRun) {
    console.log("[Backfill] Dry-run enabled. No documents were modified.");
    await mongoose.disconnect();
    return;
  }

  const result = await UserModel.updateMany(query, {
    $set: { tokenVersion: 1 },
  });

  console.log(`[Backfill] Successfully updated ${result.modifiedCount} users to tokenVersion: 1.`);
  await mongoose.disconnect();
}

if (process.env.NODE_ENV !== "test") {
  backfillTokenVersion().catch((err) => {
    console.error("[Backfill] Error running backfillTokenVersion:", err);
    process.exit(1);
  });
}

export default backfillTokenVersion;
