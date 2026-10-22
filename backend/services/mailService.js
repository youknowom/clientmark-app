import nodemailer from "nodemailer";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import TenantModel from "../models/tenantModel.js";
import { decryptCredential } from "./crypto.js";

/**
 * Validates platform SMTP configuration.
 * In production mode, refuses startup if required platform SMTP variables are missing.
 */
export const validatePlatformMailConfig = () => {
  const host = process.env.PLATFORM_SMTP_HOST || process.env.SMTP_HOST;
  const user = process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.PLATFORM_SMTP_PASS || process.env.SMTP_PASS;

  if (process.env.NODE_ENV === "production") {
    if (!host || !user || !pass) {
      throw new Error(
        "FATAL: Platform SMTP configuration missing in production. PLATFORM_SMTP_HOST, PLATFORM_SMTP_USER, and PLATFORM_SMTP_PASS are required to dispatch password reset emails."
      );
    }
  }
  return !!(host && user && pass);
};

// Helper: Get platform SMTP transporter from environment variables
const getPlatformMailCredential = () => {
  const host = process.env.PLATFORM_SMTP_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.PLATFORM_SMTP_PORT || process.env.SMTP_PORT || "587", 10);
  const user = process.env.PLATFORM_SMTP_USER || process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const pass = process.env.PLATFORM_SMTP_PASS || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const from = process.env.PLATFORM_EMAIL_FROM || process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return { transporter, from };
};

// Helper: Get tenant-specific SMTP transporter (strictly scoped by tenantId)
const getTenantMailCredential = async (tenantId) => {
  if (!tenantId) {
    return null;
  }

  const mailCred = await SoftwareSettingModel.findOne({ tenantId }).lean();
  if (!mailCred || !mailCred.host || !mailCred.email || !mailCred.password) {
    return null;
  }

  // Reject unrecoverable legacy bcrypted passwords
  if (mailCred.smtpNeedsReentry || mailCred.password.startsWith("$2a$") || mailCred.password.startsWith("$2b$")) {
    console.warn(`[MailService] Tenant ${tenantId} SMTP password requires re-entry. Skipping send.`);
    return null;
  }

  let plainPassword;
  try {
    plainPassword = decryptCredential(mailCred.password);
  } catch (err) {
    console.error(`[MailService] Failed to decrypt SMTP password for tenant ${tenantId}:`, err.message);
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: mailCred.host,
    port: 587,
    secure: false,
    auth: {
      user: mailCred.email,
      pass: plainPassword,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  return { transporter, from: mailCred.email };
};

/**
 * Send plain text mail.
 * @param {Object} options
 * @param {string} options.subject
 * @param {string|string[]} options.toEmails
 * @param {string} options.textMessage
 * @param {string|string[]} [options.ccEmails]
 * @param {string} [options.tenantId] - Required for tenant emails
 * @param {boolean} [options.isPlatform=false] - If true, uses platform env credentials
 */
const sendTextMail = async ({
  subject,
  toEmails,
  textMessage,
  ccEmails = [],
  tenantId = null,
  isPlatform = false,
}) => {
  try {
    let credential = null;

    if (isPlatform) {
      credential = getPlatformMailCredential();
      if (!credential) {
        return {
          success: false,
          message: "Platform SMTP credentials not configured in environment.",
        };
      }
    } else {
      if (!tenantId) {
        return {
          success: false,
          message: "tenantId is required for tenant-scoped email dispatch.",
        };
      }

      // Demo tenant outbound block: simulated send so demo users cannot spam real email addresses
      const tenant = await TenantModel.findById(tenantId).select("isDemo").lean();
      if (tenant?.isDemo) {
        return {
          success: true,
          simulated: true,
          messageId: `demo-simulated-${Date.now()}`,
        };
      }

      credential = await getTenantMailCredential(tenantId);
      if (!credential) {
        return {
          success: false,
          message: "Tenant email credentials not configured.",
        };
      }
    }

    const { transporter, from } = credential;

    const mailOptions = {
      from,
      to: Array.isArray(toEmails) ? toEmails.join(",") : toEmails,
      ...(ccEmails && ccEmails.length > 0 && {
        cc: Array.isArray(ccEmails) ? ccEmails.join(",") : ccEmails,
      }),
      subject,
      text: textMessage,
    };

    const response = await transporter.sendMail(mailOptions);
    const rejected = response?.rejected || [];

    if (rejected.length > 0) {
      return { success: false, message: "Email rejected by server." };
    }

    return { success: true, messageId: response?.messageId };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export { sendTextMail, getPlatformMailCredential, getTenantMailCredential };

