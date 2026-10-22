import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import UserModel from "../models/userModel.js";
import connectDB from "../config/db.js";

async function reportDuplicates() {
  await connectDB();
  console.log("Analyzing UserModel for duplicate fields (email, userName, mobileNo)...");

  // Check email duplicates
  const emailDupes = await UserModel.aggregate([
    { $match: { email: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 }, ids: { $push: "$_id" }, userNames: { $push: "$userName" }, tenantIds: { $push: "$tenantId" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  // Check userName duplicates
  const userNameDupes = await UserModel.aggregate([
    { $match: { userName: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: { $toLower: "$userName" }, count: { $sum: 1 }, ids: { $push: "$_id" }, tenantIds: { $push: "$tenantId" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  // Check mobileNo duplicates
  const mobileDupes = await UserModel.aggregate([
    { $match: { mobileNo: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: "$mobileNo", count: { $sum: 1 }, ids: { $push: "$_id" }, userNames: { $push: "$userName" }, tenantIds: { $push: "$tenantId" } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const totalUsers = await UserModel.countDocuments();

  console.log("\n=================== USER UNIQUENESS AUDIT REPORT ===================");
  console.log(`Total users in database: ${totalUsers}`);
  console.log(`Email duplicates found: ${emailDupes.length}`);
  if (emailDupes.length > 0) {
    console.dir(emailDupes, { depth: null });
  }

  console.log(`\nUserName duplicates found: ${userNameDupes.length}`);
  if (userNameDupes.length > 0) {
    console.dir(userNameDupes, { depth: null });
  }

  console.log(`\nMobileNo duplicates found: ${mobileDupes.length}`);
  if (mobileDupes.length > 0) {
    console.dir(mobileDupes, { depth: null });
  }
  console.log("===================================================================\n");

  await mongoose.disconnect();
}

reportDuplicates().catch((err) => {
  console.error("Error running duplicate audit:", err);
  process.exit(1);
});
