import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

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
  const allowedExtensions = /jpeg|jpg|png|pdf|xlsx|xls/;

  // Check file extension
  const extname = allowedExtensions.test(
    path.extname(file.originalname).toLowerCase(),
  );

  // Allowed MIME types
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (extname && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only png, jpg, jpeg, pdf, xls, and xlsx files are accepted."),
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

// Image Compression Helper (for logos/thumbnails)
const compressImage = async (tempPath, destFolder, prefix) => {
  const fileName = `${prefix}_${uuidv4().slice(0, 8)}.jpeg`;
  const destPath = path.join(destFolder, fileName);
  await sharp(tempPath).resize(400).jpeg({ quality: 70 }).toFile(destPath);
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
      ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype)
    ) {
      finalPath = await compressImage(file.path, uploadsDir.images, prefix);
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

// Process file for attachments (high quality, no resize)
const processAttachment = async (file, prefix = "attachment") => {
  if (!file) return null;

  const uploadsDir = {
    pdfs: path.resolve("uploads/pdfs"),
    images: path.resolve("uploads/images"),
  };

  Object.values(uploadsDir).forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  let finalPath = null;

  try {
    if (file.mimetype === "application/pdf") {
      finalPath = handlePdfSave(file.path, uploadsDir.pdfs, prefix);
    } else if (
      ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype)
    ) {
      finalPath = await saveHighQualityImage(
        file.path,
        uploadsDir.images,
        prefix,
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

export {
  upload,
  handlePdfSave,
  compressImage,
  processFile,
  processAttachment,
  deleteOldFile,
};
