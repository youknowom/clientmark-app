import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

import TimelineModel from "../models/timelineModel.js";
import FileModel from "../models/fileModel.js";

const isDryRun = process.argv.includes("--dry-run");

async function migrateUploads() {
  console.log("=================================================");
  console.log(`Starting Uploads Migration ${isDryRun ? "[DRY-RUN MODE]" : "[LIVE RUN MODE]"}`);
  console.log("=================================================");

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm";
  await mongoose.connect(mongoUri);

  const baseUploadsDir = path.resolve(process.cwd(), "uploads");
  const mappingLog = [];

  const timelines = await TimelineModel.find({
    attachements: { $elemMatch: { $regex: /^\/uploads\// } },
  });

  console.log(`Found ${timelines.length} timeline documents containing legacy /uploads/ URLs.`);

  let totalFilesMigrated = 0;

  for (const timeline of timelines) {
    const updatedAttachments = [];
    let modified = false;

    for (const attachment of timeline.attachements) {
      if (typeof attachment === "string" && attachment.startsWith("/uploads/")) {
        const relativeLegacyPath = attachment.replace(/^\//, "");
        const diskPath = path.resolve(process.cwd(), relativeLegacyPath);

        const ext = path.extname(attachment) || ".bin";
        const fileId = crypto.randomUUID();
        const storedFileName = `${fileId}${ext}`;
        const tenantFolder = path.join(baseUploadsDir, String(timeline.tenantId));
        const targetDiskPath = path.join(tenantFolder, storedFileName);
        const relativeStoragePath = `${timeline.tenantId}/${storedFileName}`;
        const newUrl = `/files/${fileId}`;

        const fileExists = fs.existsSync(diskPath);
        const fileSize = fileExists ? fs.statSync(diskPath).size : 0;

        mappingLog.push({
          tenantId: String(timeline.tenantId),
          projectId: String(timeline.projectId),
          timelineId: String(timeline._id),
          legacyUrl: attachment,
          diskPath,
          fileExists,
          fileId,
          newUrl,
          targetDiskPath,
        });

        if (!isDryRun && fileExists) {
          if (!fs.existsSync(tenantFolder)) {
            fs.mkdirSync(tenantFolder, { recursive: true });
          }

          fs.copyFileSync(diskPath, targetDiskPath);

          await FileModel.create({
            fileId,
            tenantId: timeline.tenantId,
            projectId: timeline.projectId,
            uploadedBy: timeline.addById,
            originalName: path.basename(attachment),
            storedFileName,
            storagePath: relativeStoragePath,
            mimeType: ext === ".pdf" ? "application/pdf" : "image/jpeg",
            size: fileSize,
            fileCategory: "timeline",
            isPublic: false,
          });
        }

        updatedAttachments.push(newUrl);
        modified = true;
        totalFilesMigrated++;
      } else {
        updatedAttachments.push(attachment);
      }
    }

    if (!isDryRun && modified) {
      timeline.attachements = updatedAttachments;
      await timeline.save();
    }
  }

  console.log(`Migration Summary:`);
  console.log(`- Files processed: ${totalFilesMigrated}`);
  console.log(`- Timelines scanned: ${timelines.length}`);
  console.log(`- Mapping Log count: ${mappingLog.length}`);

  if (isDryRun) {
    console.log("NOTE: This was a DRY-RUN. No files were copied and no DB documents were modified.");
  } else {
    console.log("LIVE migration completed successfully.");
  }

  await mongoose.disconnect();
}

// Only run if invoked directly from CLI
if (process.argv[1] && process.argv[1].endsWith("migrateUploads.js")) {
  migrateUploads().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

export default migrateUploads;
