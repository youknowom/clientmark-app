import sharp from "sharp";

// Magic byte definitions
const SIGNATURES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  WEBP_TAG: [0x57, 0x45, 0x42, 0x50],  // "WEBP"
  GIF: [0x47, 0x49, 0x46, 0x38],        // "GIF8"
  PDF: [0x25, 0x50, 0x44, 0x46],        // "%PDF"
  ZIP_XLSX: [0x50, 0x4b, 0x03, 0x04],   // "PK\x03\x04"
  OLE_XLS: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
};

const matchesBytes = (buffer, signature, offset = 0) => {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
};

/**
 * Detect real file type from magic bytes.
 */
export const detectFileTypeFromBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) return null;

  if (matchesBytes(buffer, SIGNATURES.JPEG)) {
    return { ext: ".jpeg", mime: "image/jpeg", type: "image" };
  }
  if (matchesBytes(buffer, SIGNATURES.PNG)) {
    return { ext: ".png", mime: "image/png", type: "image" };
  }
  if (
    matchesBytes(buffer, SIGNATURES.WEBP_RIFF, 0) &&
    matchesBytes(buffer, SIGNATURES.WEBP_TAG, 8)
  ) {
    return { ext: ".webp", mime: "image/webp", type: "image" };
  }
  if (matchesBytes(buffer, SIGNATURES.GIF)) {
    return { ext: ".gif", mime: "image/gif", type: "image" };
  }
  if (matchesBytes(buffer, SIGNATURES.PDF)) {
    return { ext: ".pdf", mime: "application/pdf", type: "pdf" };
  }
  if (matchesBytes(buffer, SIGNATURES.ZIP_XLSX)) {
    return {
      ext: ".xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      type: "spreadsheet",
    };
  }
  if (matchesBytes(buffer, SIGNATURES.OLE_XLS)) {
    return {
      ext: ".xls",
      mime: "application/vnd.ms-excel",
      type: "spreadsheet",
    };
  }

  return null;
};

/**
 * Validates uploaded file buffer:
 * - Checks magic bytes
 * - Enforces per-type size limits
 * - Rejects SVG for private uploads
 * - Re-encodes images with Sharp to strip malicious payloads
 */
export const validateAndSanitizeFile = async (
  buffer,
  originalName,
  { isPrivate = true, maxSizeMap = {} } = {}
) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid file buffer");
  }

  const defaultLimits = {
    image: 5 * 1024 * 1024,      // 5MB
    pdf: 10 * 1024 * 1024,       // 10MB
    spreadsheet: 10 * 1024 * 1024, // 10MB
  };
  const limits = { ...defaultLimits, ...maxSizeMap };

  // Explicitly reject SVG for private uploads
  const lowerName = (originalName || "").toLowerCase();
  if (lowerName.endsWith(".svg")) {
    if (isPrivate) {
      throw new Error("SVG files are not permitted for private uploads for security reasons.");
    }
  }

  // Detect file type by magic bytes
  const detected = detectFileTypeFromBuffer(buffer);
  if (!detected) {
    throw new Error(
      "File content does not match allowed types (corrupted, unsupported, or disguised executable/html file)."
    );
  }

  // Enforce size limit
  const limitForType = limits[detected.type] || defaultLimits.image;
  if (buffer.length > limitForType) {
    const limitMB = Math.round(limitForType / (1024 * 1024));
    throw new Error(`File exceeds maximum size limit of ${limitMB}MB.`);
  }

  // For images, re-encode using Sharp to sanitize
  if (detected.type === "image") {
    try {
      let sanitizedBuffer;
      let finalExt = detected.ext;
      let finalMime = detected.mime;

      if (detected.ext === ".png") {
        sanitizedBuffer = await sharp(buffer)
          .png({ quality: 90, compressionLevel: 8 })
          .toBuffer();
      } else if (detected.ext === ".webp") {
        sanitizedBuffer = await sharp(buffer)
          .webp({ quality: 85 })
          .toBuffer();
      } else {
        // JPEG / other
        sanitizedBuffer = await sharp(buffer)
          .jpeg({ quality: 85 })
          .toBuffer();
        finalExt = ".jpeg";
        finalMime = "image/jpeg";
      }

      return {
        buffer: sanitizedBuffer,
        size: sanitizedBuffer.length,
        ext: finalExt,
        mimeType: finalMime,
        fileType: "image",
      };
    } catch (sharpErr) {
      throw new Error(`Image verification and re-encoding failed: ${sharpErr.message}`);
    }
  }

  // PDFs and Spreadsheets
  return {
    buffer,
    size: buffer.length,
    ext: detected.ext,
    mimeType: detected.mime,
    fileType: detected.type,
  };
};

export default {
  detectFileTypeFromBuffer,
  validateAndSanitizeFile,
};
