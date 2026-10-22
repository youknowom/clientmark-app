import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { validateAndSanitizeFile } from "./fileValidationService.js";
import storageAdapter from "./storage/index.js";
import FileModel from "../models/fileModel.js";

const tempDir = "uploads/temp/";

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

//help to store
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); // Upload everything to temp first
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4().slice(0, 8);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

//files filter
const fileFilter = function (req, file, cb) {
  // Allow image, pdf, and excel extensions
  const allowedExtensions = /jpeg|jpg|png|webp|svg|ico|pdf|xlsx|xls/i;

  // Check file extension
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase(),
  );

  // Allowed MIME types (including various browser image variations)
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "image/webp",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (extname && (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/'))) {
    cb(null, true);
  } else {
    cb(
      new Error("Only PNG, JPG, JPEG, WEBP, SVG, ICO, PDF, and Excel files are accepted."),
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter,
});

// PDF Save Helper
const handlePdfSave = (tempPath, destFolder, prefix) => {
  const fileName = `${prefix}_${uuidv4().slice(0, 8)}.pdf`;
  const destPath = path.join(destFolder, fileName);
  fs.copyFileSync(tempPath, destPath); // Simulated compression
  return `/uploads/pdfs/${fileName}`;
};

// Raw file copy (for SVG, ICO where raster compression is not desired)
const handleRawImageSave = (tempPath, destFolder, prefix, originalName) => {
  const ext = path.extname(originalName).toLowerCase() || '.png';
  const fileName = `${prefix}_${uuidv4().slice(0, 8)}${ext}`;
  const destPath = path.join(destFolder, fileName);
  fs.copyFileSync(tempPath, destPath);
  return `/uploads/images/${fileName}`;
};

// Image Compression Helper (preserves PNG transparency, supports WebP, JPEG)
const compressImage = async (tempPath, destFolder, prefix, originalName = '', mimeType = '') => {
  const ext = path.extname(originalName).toLowerCase();

  // If SVG or ICO, copy directly without corrupting vector/icon data
  if (ext === '.svg' || ext === '.ico' || mimeType.includes('svg') || mimeType.includes('icon')) {
    return handleRawImageSave(tempPath, destFolder, prefix, originalName);
  }

  // PNG: preserve transparency with lossless/high-quality PNG compression
  if (ext === '.png' || mimeType === 'image/png' || mimeType === 'image/x-png') {
    const fileName = `${prefix}_${uuidv4().slice(0, 8)}.png`;
    const destPath = path.join(destFolder, fileName);
    await sharp(tempPath)
      .resize({ width: 800, withoutEnlargement: true })
      .png({ quality: 90, compressionLevel: 8 })
      .toFile(destPath);
    return `/uploads/images/${fileName}`;
  }

  // WebP: preserve alpha and compress cleanly
  if (ext === '.webp' || mimeType === 'image/webp') {
    const fileName = `${prefix}_${uuidv4().slice(0, 8)}.webp`;
    const destPath = path.join(destFolder, fileName);
    await sharp(tempPath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(destPath);
    return `/uploads/images/${fileName}`;
  }

  // Default JPEG
  const fileName = `${prefix}_${uuidv4().slice(0, 8)}.jpeg`;
  const destPath = path.join(destFolder, fileName);
  await sharp(tempPath)
    .resize({ width: 800, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(destPath);
  return `/uploads/images/${fileName}`;
};

// High Quality Image Save (for attachments — no resize, quality 90)
const saveHighQualityImage = async (tempPath, destFolder, prefix) => {
  const fileName = `${prefix}_${uuidv4().slice(0, 8)}.jpeg`;
  const destPath = path.join(destFolder, fileName);
  await sharp(tempPath).jpeg({ quality: 90 }).toFile(destPath);
  return `/uploads/images/${fileName}`;
};

//store file in directory
const processFile = async (file, prefix = "image") => {
  if (!file) return null;

  const uploadsDir = {
    pdfs: path.resolve("uploads/pdfs"),
    images: path.resolve("uploads/images"),
  };

  // Ensure folders exist
  Object.values(uploadsDir).forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  let finalPath = null;

  try {
    if (file.mimetype === "application/pdf") {
      finalPath = handlePdfSave(file.path, uploadsDir.pdfs, prefix);
    } else if (
      file.mimetype.startsWith("image/") ||
      /\.(jpe?g|png|webp|svg|ico)$/i.test(file.originalname)
    ) {
      finalPath = await compressImage(
        file.path,
        uploadsDir.images,
        prefix,
        file.originalname,
        file.mimetype
      );
    } else {
      throw new Error("Unsupported file type");
    }
  } finally {
    if (fs.existsSync(file.path)) {
      fs.unlink(file.path, (err) => {
        if (err) console.error("Temp file delete failed:", err);
      });
    }
  }

  return finalPath;
};

//delete old files
const deleteOldFile = (oldFile) => {
  if (oldFile) {
    oldFile = oldFile.replace(/^[\/\\]+/, "");
    const filePath = path.resolve(process.cwd(), oldFile);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

// Process authenticated private upload (timeline attachments, avatars, etc.)
const processPrivateUpload = async (
  file,
  { tenantId, projectId = null, uploadedBy = null, fileCategory = "timeline" } = {}
) => {
  if (!file) return null;

  const buffer = file.buffer || (file.path ? await fs.promises.readFile(file.path) : null);
  if (!buffer) {
    throw new Error("No file content received.");
  }

  // Validate magic bytes, size limits, and Sharp re-encode (rejects SVG for private)
  const sanitized = await validateAndSanitizeFile(buffer, file.originalname, {
    isPrivate: true,
  });

  const fileId = crypto.randomUUID();
  const storedFileName = `${fileId}${sanitized.ext}`;

  // Save under uploads/<tenantId>/<fileId>.<ext>
  const saved = await storageAdapter.saveFile(tenantId, storedFileName, sanitized.buffer);

  // Store metadata in DB
  const fileDoc = await FileModel.create({
    fileId,
    tenantId,
    projectId,
    uploadedBy,
    originalName: file.originalname,
    storedFileName,
    storagePath: saved.storagePath,
    mimeType: sanitized.mimeType,
    size: sanitized.size,
    fileCategory,
    isPublic: false,
  });

  // Clean up temp file
  if (file.path && fs.existsSync(file.path)) {
    fs.unlink(file.path, () => {});
  }

  return fileDoc;
};

// Backward compatible alias
const processAttachment = processPrivateUpload;

export {
  upload,
  handlePdfSave,
  compressImage,
  processFile,
  processAttachment,
  processPrivateUpload,
  deleteOldFile,
};
