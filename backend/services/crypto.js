import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v1";

/**
 * Validates encryption configuration.
 * Refuses to start in production if CREDENTIALS_ENCRYPTION_KEY is missing or invalid.
 */
const getRawKeyEnv = () => {
  return process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.CREDENTIAL_ENCRYPTION_KEY;
};

const parseKeyBuffer = (rawKey, fallbackToHash = false) => {
  if (!rawKey) return null;
  // If 64-char hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(rawKey.trim())) {
    return Buffer.from(rawKey.trim(), "hex");
  }
  // If base64 32 bytes
  const b64 = Buffer.from(rawKey, "base64");
  if (b64.length === 32) {
    return b64;
  }
  // If raw 32-char string
  if (Buffer.from(rawKey, "utf8").length === 32) {
    return Buffer.from(rawKey, "utf8");
  }
  if (fallbackToHash) {
    return crypto.createHash("sha256").update(rawKey).digest();
  }
  return null;
};

/**
 * Validates encryption configuration.
 * Refuses to start in production if CREDENTIALS_ENCRYPTION_KEY is missing or invalid.
 */
export const validateCryptoConfig = () => {
  const rawKey = getRawKeyEnv();
  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: CREDENTIALS_ENCRYPTION_KEY is required in production mode.");
    }
    return null;
  }

  const keyBuffer = parseKeyBuffer(rawKey);
  if (!keyBuffer || keyBuffer.length !== 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: CREDENTIALS_ENCRYPTION_KEY must be exactly 32 bytes (base64 or 64-hex encoded).");
    }
  }
  return keyBuffer;
};

const getEncryptionKey = () => {
  const rawKey = getRawKeyEnv();
  if (!rawKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: CREDENTIALS_ENCRYPTION_KEY is missing in production.");
    }
    // Deterministic fallback for test/dev only
    return crypto.createHash("sha256").update("dev_fallback_credentials_key_not_for_prod").digest();
  }

  return parseKeyBuffer(rawKey, true);
};

/**
 * Encrypt plaintext using AES-256-GCM with versioned format.
 * Format: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export const encryptCredential = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return "";
  }

  // If already encrypted, return as is
  if (typeof plaintext === "string" && plaintext.startsWith(`${CURRENT_VERSION}:`)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plaintext), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${CURRENT_VERSION}:${iv.toString("hex")}:${authTag}:${encrypted}`;
};

/**
 * Decrypt ciphertext using AES-256-GCM.
 * Validates version and authentication tag integrity.
 */
export const decryptCredential = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== "string") {
    return "";
  }

  // If not versioned ciphertext, return as is (e.g. legacy plain text)
  if (!ciphertext.startsWith(`${CURRENT_VERSION}:`)) {
    return ciphertext;
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid ciphertext format");
  }

  const [version, ivHex, authTagHex, encryptedHex] = parts;
  if (version !== CURRENT_VERSION) {
    throw new Error(`Unsupported ciphertext version: ${version}`);
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    throw new Error("Credential decryption failed: integrity check failed or tampered data");
  }
};

/**
 * Check if a stored value is encrypted with the current scheme.
 */
export const isEncrypted = (value) => {
  return typeof value === "string" && value.startsWith(`${CURRENT_VERSION}:`);
};

/**
 * Check if an incoming update value is a masked placeholder.
 */
export const isMaskedValue = (value) => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.startsWith("****") || trimmed === "needs re-entry";
};

/**
 * Mask secret for safe API return:
 * { masked: "****" + last4, hasValue: true }
 * Handles legacy bcrypt strings with "needs re-entry".
 */
export const maskSecret = (storedValue) => {
  if (!storedValue || typeof storedValue !== "string" || storedValue.trim() === "") {
    return { masked: "", hasValue: false, needsReentry: false };
  }

  // Detect unrecoverable bcrypted password
  if (storedValue.startsWith("$2a$") || storedValue.startsWith("$2b$")) {
    return { masked: "needs re-entry", hasValue: true, needsReentry: true };
  }

  let plain = "";
  try {
    plain = decryptCredential(storedValue);
  } catch (err) {
    return { masked: "needs re-entry", hasValue: true, needsReentry: true };
  }

  if (!plain) {
    return { masked: "", hasValue: false, needsReentry: false };
  }

  const last4 = plain.length <= 4 ? plain : plain.slice(-4);
  return {
    masked: `****${last4}`,
    hasValue: true,
    needsReentry: false,
  };
};

export default {
  encryptCredential,
  decryptCredential,
  isEncrypted,
  isMaskedValue,
  maskSecret,
  validateCryptoConfig,
};
