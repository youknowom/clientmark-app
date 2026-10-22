import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import crypto from "crypto";
import connectDB from "../config/db.js";
import ProjectModel from "../models/projectModel.js";

async function run() {
  console.log("Connecting to database...");
  await connectDB();

  console.log("\n--- Checking projects needing portalKey backfill ---");
  const projects = await ProjectModel.find({
    $or: [{ portalKey: { $exists: false } }, { portalKey: null }, { portalKey: "" }],
  });

  console.log(`Found ${projects.length} projects without a portalKey.`);

  let updatedCount = 0;
  for (const project of projects) {
    const portalKey = crypto.randomBytes(18).toString("base64url");
    await ProjectModel.updateOne(
      { _id: project._id },
      {
        $set: {
          portalKey,
          portalVersion: project.portalVersion || 1,
        },
      }
    );
    updatedCount++;
  }

  console.log(`✅ Successfully backfilled portalKey on ${updatedCount} projects.`);

  console.log("\n--- Ensuring partial unique index on portalKey ---");
  try {
    await ProjectModel.collection.createIndex(
      { portalKey: 1 },
      {
        unique: true,
        partialFilterExpression: { portalKey: { $type: "string", $gt: "" } },
        name: "uniq_portalKey_partial",
      }
    );
    console.log("✅ Partial unique index uniq_portalKey_partial created.");
  } catch (idxErr) {
    if (idxErr.code === 85 || idxErr.message?.includes("Index already exists")) {
      console.log("ℹ️  Index on portalKey already exists; keeping existing index.");
    } else {
      throw idxErr;
    }
  }

  await mongoose.disconnect();
  console.log("Disconnected from database.");
}

run().catch((err) => {
  console.error("Error during backfillPortalKeys execution:", err);
  process.exit(1);
});
