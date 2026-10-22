import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import OTPModel from "../models/otpModel.js";

async function run() {
  console.log("Connecting to database...");
  await connectDB();

  console.log("\n--- Checking for legacy plaintext OTP documents ---");
  const legacyFilter = {
    $or: [
      { hash: { $exists: false } },
      { hash: null },
      { hash: "" },
      { otp: { $exists: true } },
    ],
  };

  const legacyCount = await OTPModel.countDocuments(legacyFilter);
  console.log(`Found ${legacyCount} legacy plaintext/unhashed OTP documents.`);

  if (legacyCount > 0) {
    const result = await OTPModel.deleteMany(legacyFilter);
    console.log(`✅ Successfully deleted ${result.deletedCount} legacy plaintext OTP documents.`);
  } else {
    console.log("✅ No legacy plaintext OTP documents found. Database is clean.");
  }

  await mongoose.disconnect();
  console.log("Disconnected from database.");
}

run().catch((err) => {
  console.error("Error during deleteLegacyPlaintextOtps execution:", err);
  process.exit(1);
});
