import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import UserModel from "../models/userModel.js";

/**
 * Normalizes phone number to E.164 format.
 * Defaults to +91 if exactly 10 digits without country code.
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}

async function run() {
  console.log("Connecting to database...");
  await connectDB();

  console.log("\n--- Step 1: Inspecting User Data for Normalization Issues (Read-Only) ---");
  const users = await UserModel.find({}).lean();
  console.log(`Found ${users.length} total users to inspect.`);

  let unnormalizedCount = 0;
  for (const user of users) {
    let hasIssue = false;
    if (typeof user.email === "string" && user.email !== user.email.toLowerCase().trim()) {
      hasIssue = true;
    }
    if (typeof user.userName === "string" && user.userName !== user.userName.trim()) {
      hasIssue = true;
    }
    if (typeof user.mobileNo === "string") {
      const normPhone = normalizePhone(user.mobileNo);
      if (normPhone && normPhone !== user.mobileNo) {
        hasIssue = true;
      }
    }
    if (hasIssue) {
      unnormalizedCount++;
      console.warn(`[Read-Only Audit] User ID ${user._id} contains un-normalized whitespace or casing.`);
    }
  }

  console.log(`Inspection complete. ${unnormalizedCount} user records have normalization warnings (0 records modified).`);

  console.log("\n--- Step 2: Checking for Duplicate Values Before Indexing ---");
  const emailDupes = await UserModel.aggregate([
    { $match: { email: { $exists: true, $ne: null, $gt: "" } } },
    { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const userNameDupes = await UserModel.aggregate([
    { $match: { userName: { $exists: true, $ne: null, $gt: "" } } },
    { $group: { _id: "$userName", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const mobileDupes = await UserModel.aggregate([
    { $match: { mobileNo: { $exists: true, $ne: null, $gt: "" } } },
    { $group: { _id: "$mobileNo", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let hasConflict = false;
  if (emailDupes.length > 0) {
    console.error("❌ Email duplicates remaining:", emailDupes);
    hasConflict = true;
  }
  if (userNameDupes.length > 0) {
    console.error("❌ UserName duplicates remaining:", userNameDupes);
    hasConflict = true;
  }
  if (mobileDupes.length > 0) {
    console.error("❌ MobileNo duplicates remaining:", mobileDupes);
    hasConflict = true;
  }

  if (hasConflict) {
    console.error(
      "\n⚠️ Aborting index creation: Duplicate records detected. Please resolve them first before running this script."
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("\n--- Step 3: Creating Partial Unique Indexes ---");
  const collection = UserModel.collection;

  console.log("Creating unique partial index on userName...");
  await collection.createIndex(
    { userName: 1 },
    {
      unique: true,
      partialFilterExpression: { userName: { $type: "string", $gt: "" } },
      name: "uniq_userName_partial",
    }
  );

  console.log("Creating unique partial index on email...");
  await collection.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: { email: { $type: "string", $gt: "" } },
      name: "uniq_email_partial",
    }
  );

  console.log("Creating unique partial index on mobileNo...");
  await collection.createIndex(
    { mobileNo: 1 },
    {
      unique: true,
      partialFilterExpression: { mobileNo: { $type: "string", $gt: "" } },
      name: "uniq_mobileNo_partial",
    }
  );

  console.log("✅ All unique partial indexes successfully created!");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error during script execution:", err);
  process.exit(1);
});
