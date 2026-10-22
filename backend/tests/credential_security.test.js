import { jest } from "@jest/globals";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_key_0987654321";
process.env.PORTAL_JWT_SECRET = "test_portal_jwt_secret_key_5555555555";
process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("01234567890123456789012345678901").toString("base64");
process.env.NODE_ENV = "test";
process.env.PORT = "9997";

import app from "../config/app.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import {
  encryptCredential,
  decryptCredential,
  isEncrypted,
  isMaskedValue,
  maskSecret,
  validateCryptoConfig,
} from "../services/crypto.js";
import { sendTextMail } from "../services/mailService.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("PART 1: Credential Security and Encryption at Rest", () => {
  describe("Crypto Service & Configuration", () => {
    test("Encrypt and decrypt roundtrip works with versioned format", () => {
      const plaintext = "super_secret_api_key_xyz123";
      const ciphertext = encryptCredential(plaintext);

      expect(ciphertext).toBeDefined();
      expect(ciphertext.startsWith("v1:")).toBe(true);
      expect(isEncrypted(ciphertext)).toBe(true);

      const decrypted = decryptCredential(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    test("Tampered ciphertext fails integrity check and throws error", () => {
      const plaintext = "confidential_password";
      const ciphertext = encryptCredential(plaintext);
      const parts = ciphertext.split(":");

      // Tamper with the encrypted bytes
      const corruptedEncrypted = parts[3].slice(0, -2) + "ff";
      const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:${corruptedEncrypted}`;

      expect(() => decryptCredential(tamperedCiphertext)).toThrow(
        /Credential decryption failed: integrity check failed or tampered data/
      );
    });

    test("Tampered auth tag fails integrity check", () => {
      const plaintext = "confidential_password";
      const ciphertext = encryptCredential(plaintext);
      const parts = ciphertext.split(":");

      // Tamper with auth tag
      const corruptedTag = "00000000000000000000000000000000";
      const tamperedCiphertext = `${parts[0]}:${parts[1]}:${corruptedTag}:${parts[3]}`;

      expect(() => decryptCredential(tamperedCiphertext)).toThrow(
        /Credential decryption failed/
      );
    });

    test("Missing or invalid CREDENTIALS_ENCRYPTION_KEY fails startup in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

      try {
        process.env.NODE_ENV = "production";
        delete process.env.CREDENTIALS_ENCRYPTION_KEY;

        expect(() => validateCryptoConfig()).toThrow(
          /FATAL: CREDENTIALS_ENCRYPTION_KEY is required in production mode/
        );

        // Invalid key length (not 32 bytes)
        process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.from("short_key").toString("base64");
        expect(() => validateCryptoConfig()).toThrow(
          /FATAL: CREDENTIALS_ENCRYPTION_KEY must be exactly 32 bytes/
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
      }
    });

    test("maskSecret correctly masks secrets and flags legacy bcrypt hashes", () => {
      const plain = "mySecretPassword1234";
      const encrypted = encryptCredential(plain);

      const masked = maskSecret(encrypted);
      expect(masked.hasValue).toBe(true);
      expect(masked.masked).toBe("****1234");
      expect(masked.needsReentry).toBe(false);

      // Legacy bcrypt hash
      const bcryptHash = "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklm";
      const maskedBcrypt = maskSecret(bcryptHash);
      expect(maskedBcrypt.hasValue).toBe(true);
      expect(maskedBcrypt.masked).toBe("needs re-entry");
      expect(maskedBcrypt.needsReentry).toBe(true);
    });
  });

  describe("API Stored Secrets and Response Masking", () => {
    let tenant;
    let adminUser;
    let adminToken;

    beforeEach(async () => {
      tenant = await TenantModel.create({
        companyName: "Acme Agency",
        slug: "acme-agency",
        email: "admin@acme.com",
        status: "Active",
      });

      const role = await RoleModel.create({
        roleName: "Admin",
        priority: 1,
        tenantId: tenant._id,
        permissions: ["update:site-setting", "view:whatsapp-setting"],
      });

      adminUser = await UserModel.create({
        fullName: "Agency Admin",
        userName: "agencyadmin",
        email: "admin@acme.com",
        password: "hashed_test_password",
        tenantId: tenant._id,
        roleId: role._id,
        status: "Active",
        tokenVersion: 1,
      });

      adminToken = jwt.sign(
        {
          userId: adminUser._id,
          tenantId: tenant._id,
          role: "Admin",
          tokenVersion: 1,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
    });

    test("SoftwareSetting: SMTP password and Gemini API key stored encrypted, API returns masked values", async () => {
      // 1. Create/update settings with plaintext credentials
      const resUpdate = await request(app)
        .post("/software-setting/update-site-setting")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          projectName: "Acme CRM",
          logoWidth: 150,
          logoHeight: 50,
          host: "smtp.mailgun.org",
          email: "smtp@acme.com",
          password: "myRealSmtpPassword999",
          geminiApiKey: "AIzaSySecretGeminiKey1234",
        });

      expect(resUpdate.status).toBe(200);

      // 2. Check directly in DB that credentials are NOT plaintext and NOT bcrypt, but versioned ciphertext
      const dbSetting = await SoftwareSettingModel.findOne({ tenantId: tenant._id }).lean();
      expect(dbSetting).toBeDefined();
      expect(dbSetting.password.startsWith("v1:")).toBe(true);
      expect(dbSetting.geminiApiKey.startsWith("v1:")).toBe(true);
      expect(dbSetting.password).not.toContain("myRealSmtpPassword999");
      expect(dbSetting.geminiApiKey).not.toContain("AIzaSySecretGeminiKey1234");
      expect(decryptCredential(dbSetting.password)).toBe("myRealSmtpPassword999");
      expect(decryptCredential(dbSetting.geminiApiKey)).toBe("AIzaSySecretGeminiKey1234");

      // 3. Check API response from get-site-setting returns masked credentials, NEVER plaintext
      const resGet = await request(app)
        .get("/software-setting/get-site-setting")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.data.smtpPassword).toBe("****d999");
      expect(resGet.body.data.geminiApiKey).toBe("****1234");
      expect(resGet.body.data.hasSmtpPassword).toBe(true);
      expect(resGet.body.data.hasGeminiApiKey).toBe(true);

      // 4. Update with masked input does NOT overwrite stored password with the masked string
      const resUpdateKeep = await request(app)
        .post("/software-setting/update-site-setting")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          projectName: "Acme CRM Updated",
          logoWidth: 150,
          logoHeight: 50,
          host: "smtp.mailgun.org",
          email: "smtp@acme.com",
          password: "****d999", // Masked input from form
          geminiApiKey: "", // Empty input
        });

      expect(resUpdateKeep.status).toBe(200);

      const dbSettingAfter = await SoftwareSettingModel.findOne({ tenantId: tenant._id }).lean();
      expect(decryptCredential(dbSettingAfter.password)).toBe("myRealSmtpPassword999");
      expect(decryptCredential(dbSettingAfter.geminiApiKey)).toBe("AIzaSySecretGeminiKey1234");
      expect(dbSettingAfter.projectName).toBe("Acme CRM Updated");
    });

    test("WhatsappCred: instanceId and token stored encrypted, API returns masked values", async () => {
      // 1. Create WhatsApp creds via PUT /project/update-whatsapp-cred
      const resCreate = await request(app)
        .put("/project/update-whatsapp-cred")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          instanceId: "wa_instance_abc_5678",
          token: "wa_access_token_xyz_8901",
        });

      expect(resCreate.status).toBe(200);

      // 2. Direct DB verification: ciphertext at rest
      const dbCred = await WhatsappCredModel.findOne({ tenantId: tenant._id }).lean();
      expect(dbCred).toBeDefined();
      expect(dbCred.instanceId.startsWith("v1:")).toBe(true);
      expect(dbCred.token.startsWith("v1:")).toBe(true);
      expect(dbCred.instanceId).not.toContain("wa_instance_abc_5678");
      expect(dbCred.token).not.toContain("wa_access_token_xyz_8901");
      expect(decryptCredential(dbCred.instanceId)).toBe("wa_instance_abc_5678");
      expect(decryptCredential(dbCred.token)).toBe("wa_access_token_xyz_8901");

      // 3. API get-whatsapp-cred returns masked values
      const resGet = await request(app)
        .get("/project/get-whatsapp-cred")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.data.instanceId).toBe("****5678");
      expect(resGet.body.data.token).toBe("****8901");
      expect(resGet.body.data.hasInstanceId).toBe(true);
      expect(resGet.body.data.hasToken).toBe(true);

      // 4. Update with masked placeholder retains existing encrypted values
      const resUpdate = await request(app)
        .put("/project/update-whatsapp-cred")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          instanceId: "****5678",
          token: "****8901",
        });

      expect(resUpdate.status).toBe(200);

      const dbCredAfter = await WhatsappCredModel.findOne({ tenantId: tenant._id }).lean();
      expect(decryptCredential(dbCredAfter.instanceId)).toBe("wa_instance_abc_5678");
      expect(decryptCredential(dbCredAfter.token)).toBe("wa_access_token_xyz_8901");
    });
  });

  describe("MailService Decryption and Send", () => {
    let tenant;

    beforeEach(async () => {
      tenant = await TenantModel.create({
        companyName: "Mail Test Agency",
        slug: "mail-agency",
        email: "mailer@mailagency.com",
        status: "Active",
      });
    });

    test("mailService decrypts stored password and supplies it to nodemailer transport", async () => {
      const plainPassword = "decrypted_real_password_555";
      const encryptedPassword = encryptCredential(plainPassword);

      await SoftwareSettingModel.create({
        tenantId: tenant._id,
        host: "smtp.testserver.com",
        email: "mailer@mailagency.com",
        password: encryptedPassword,
        smtpNeedsReentry: false,
      });

      let capturedTransportOptions = null;
      let capturedMailOptions = null;

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: "msg_12345" });
      const createTransportSpy = jest.spyOn(nodemailer, "createTransport").mockImplementation((options) => {
        capturedTransportOptions = options;
        return {
          sendMail: mockSendMail.mockImplementation((mailOpts) => {
            capturedMailOptions = mailOpts;
            return Promise.resolve({ messageId: "msg_12345" });
          }),
        };
      });

      const sendResult = await sendTextMail({
        tenantId: tenant._id,
        toEmails: "recipient@example.com",
        subject: "Welcome",
        textMessage: "Hello",
      });

      expect(sendResult.success).toBe(true);
      expect(capturedTransportOptions).toBeDefined();
      expect(capturedTransportOptions.auth.user).toBe("mailer@mailagency.com");
      expect(capturedTransportOptions.auth.pass).toBe(plainPassword); // Plaintext passed to SMTP auth
      expect(capturedMailOptions.to).toBe("recipient@example.com");

      createTransportSpy.mockRestore();
    });

    test("mailService skips sending if SMTP password is marked smtpNeedsReentry", async () => {
      await SoftwareSettingModel.create({
        tenantId: tenant._id,
        host: "smtp.testserver.com",
        email: "mailer@mailagency.com",
        password: "$2b$10$legacyBcryptedPasswordHashHere",
        smtpNeedsReentry: true,
      });

      const createTransportSpy = jest.spyOn(nodemailer, "createTransport");

      const sendResult = await sendTextMail({
        tenantId: tenant._id,
        toEmails: "recipient@example.com",
        subject: "Welcome",
        textMessage: "Hello",
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.message).toContain("Tenant email credentials not configured");
      expect(createTransportSpy).not.toHaveBeenCalled();

      createTransportSpy.mockRestore();
    });
  });
});
