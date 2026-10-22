import SoftwareSettingModel from "../models/softwareSettingModel.js";
import ThemeModel from "../models/themeModel.js";
import TenantModel from "../models/tenantModel.js";
import { deleteOldFile, processFile } from "../services/fileUploadService.js";
import { emitToTenant } from "../services/realtime.js";
import { encryptCredential, maskSecret, isMaskedValue } from "../services/crypto.js";

// ── Update Main Theme (Tenant Scoped) ─────────────────────────────────────────
const updateMainTheme = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ message: "Unauthorized. Tenant required.", success: false });
    }

    const { primaryColor, secondaryColor, backgroundColor, textColor } = req.body;
    if (!primaryColor || !secondaryColor || !backgroundColor || !textColor) {
      return res
        .status(403)
        .json({ message: "Some data is missing.", success: false });
    }

    await ThemeModel.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          tenantId,
          "mainTheme.primaryColor": primaryColor,
          "mainTheme.secondaryColor": secondaryColor,
          "mainTheme.backgroundColor": backgroundColor,
          "mainTheme.textColor": textColor,
        },
      },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json({ message: "Successfully saved theme.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ── Get Theme (Tenant Scoped or Slug Resolved) ──────────────────────────────
const getMainTheme = async (req, res) => {
  try {
    let resolvedTenantId = req.tenantId || req.user?.tenantId;

    // If not authenticated, resolve strictly from query slug (never from query tenantId)
    if (!resolvedTenantId && req.query?.slug) {
      const tenant = await TenantModel.findOne({ slug: req.query.slug.toString().trim() })
        .select("_id")
        .lean();
      if (tenant) {
        resolvedTenantId = tenant._id;
      }
    }

    const defaultTheme = {
      primaryColor: "#111827",
      secondaryColor: "#E05E3A",
      backgroundColor: "#FBFBF9",
      textColor: "#111827",
    };

    if (!resolvedTenantId) {
      return res.status(200).json({
        message: "Default theme.",
        success: true,
        data: { mainTheme: defaultTheme },
      });
    }

    const themeDoc = await ThemeModel.findOne({ tenantId: resolvedTenantId }).lean();
    const whitelistedTheme = themeDoc?.mainTheme
      ? {
          primaryColor: themeDoc.mainTheme.primaryColor || defaultTheme.primaryColor,
          secondaryColor: themeDoc.mainTheme.secondaryColor || defaultTheme.secondaryColor,
          backgroundColor: themeDoc.mainTheme.backgroundColor || defaultTheme.backgroundColor,
          textColor: themeDoc.mainTheme.textColor || defaultTheme.textColor,
        }
      : defaultTheme;

    return res.status(200).json({
      message: "Successfully get theme.",
      success: true,
      data: { mainTheme: whitelistedTheme },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ── Get Site Setting (Tenant Scoped or Slug Resolved) ───────────────────────
const getSiteSetting = async (req, res) => {
  try {
    let resolvedTenantId = req.tenantId || req.user?.tenantId;
    let tenantDoc = null;

    // If not authenticated, resolve strictly from query slug (never from query tenantId)
    if (!resolvedTenantId && req.query?.slug) {
      tenantDoc = await TenantModel.findOne({ slug: req.query.slug.toString().trim() })
        .select("_id companyName settings")
        .lean();
      if (tenantDoc) {
        resolvedTenantId = tenantDoc._id;
      }
    }

    // Default Clientmark branding if unauthenticated and no matching slug
    if (!resolvedTenantId) {
      return res.status(200).json({
        message: "Default site setting.",
        success: true,
        data: {
          projectName: "Clientmark",
          mainLogo: null,
          favicon: null,
        },
      });
    }

    // If request is from authenticated staff, return full settings with secrets safely masked
    if (req.user && resolvedTenantId) {
      const siteSettingDtl = await SoftwareSettingModel.findOne({ tenantId: resolvedTenantId }).lean();
      const maskedSmtp = maskSecret(siteSettingDtl?.password);
      const maskedGemini = maskSecret(siteSettingDtl?.geminiApiKey);

      if (!tenantDoc) {
        tenantDoc = await TenantModel.findById(resolvedTenantId).select("companyName settings").lean();
      }

      return res.status(200).json({
        message: "Successfully get site setting.",
        success: true,
        data: {
          projectName: siteSettingDtl?.projectName || tenantDoc?.settings?.projectName || tenantDoc?.companyName || "Clientmark",
          mainLogo: siteSettingDtl?.mainLogo || tenantDoc?.settings?.logo || null,
          favicon: siteSettingDtl?.favicon || tenantDoc?.settings?.favicon || null,
          logoWidth: siteSettingDtl?.logoWidth || 150,
          logoHeight: siteSettingDtl?.logoHeight || 50,
          email: siteSettingDtl?.email || "",
          host: siteSettingDtl?.host || "",
          phone: siteSettingDtl?.phone || "",
          companyWhatsapp: siteSettingDtl?.companyWhatsapp || "",
          smtpPassword: maskedSmtp.masked,
          hasSmtpPassword: maskedSmtp.hasValue,
          smtpNeedsReentry: maskedSmtp.needsReentry || Boolean(siteSettingDtl?.smtpNeedsReentry),
          geminiApiKey: maskedGemini.masked,
          hasGeminiApiKey: maskedGemini.hasValue,
        },
      });
    }

    // Public callers: whitelist ONLY public branding fields (no SMTP, host, phone, or secrets)
    const siteSettingDtl = await SoftwareSettingModel.findOne({ tenantId: resolvedTenantId })
      .select("projectName mainLogo favicon")
      .lean();

    let whitelistedData;
    if (siteSettingDtl) {
      whitelistedData = {
        projectName: siteSettingDtl.projectName || "Clientmark",
        mainLogo: siteSettingDtl.mainLogo || null,
        favicon: siteSettingDtl.favicon || null,
      };
    } else {
      if (!tenantDoc) {
        tenantDoc = await TenantModel.findById(resolvedTenantId).select("companyName settings").lean();
      }
      whitelistedData = {
        projectName: tenantDoc?.settings?.projectName || tenantDoc?.companyName || "Clientmark",
        mainLogo: tenantDoc?.settings?.logo || null,
        favicon: tenantDoc?.settings?.favicon || null,
      };
    }

    return res.status(200).json({
      message: "Successfully get site setting.",
      success: true,
      data: whitelistedData,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ── Update Site Setting (Tenant Scoped) ───────────────────────────────────────
const updateSiteSetting = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ message: "Unauthorized. Tenant required.", success: false });
    }

    const {
      logoWidth,
      logoHeight,
      projectName,
      email,
      password,
      geminiApiKey,
      host,
      phone,
      companyWhatsapp,
    } = req.body;

    if (!projectName) {
      return res
        .status(403)
        .json({ message: "Project name is missing.", success: false });
    }

    if (!logoWidth || !logoHeight) {
      return res
        .status(403)
        .json({ message: "Logo width or height is missing.", success: false });
    }

    // Validate optional phone numbers
    const phoneRegex = /^\+\d{7,15}$/;
    if (phone && !phoneRegex.test(String(phone).replace(/[\s\-\(\)]/g, ""))) {
      return res.status(400).json({
        message: "Invalid company phone number format.",
        success: false,
      });
    }
    if (
      companyWhatsapp &&
      !phoneRegex.test(String(companyWhatsapp).replace(/[\s\-\(\)]/g, ""))
    ) {
      return res.status(400).json({
        message: "Invalid company WhatsApp number format.",
        success: false,
      });
    }

    // Find old details for THIS TENANT ONLY
    const oldSiteSetting = await SoftwareSettingModel.findOne({ tenantId });

    let mainLogo = req.files?.mainLogo?.[0];
    mainLogo = mainLogo
      ? await processFile(mainLogo, "mainLogo")
      : oldSiteSetting?.mainLogo;

    let faviconFile = req.files?.favicon?.[0];
    const favicon = faviconFile
      ? await processFile(faviconFile, "favicon")
      : oldSiteSetting?.favicon;

    let updatedData = {
      tenantId,
      logoWidth,
      logoHeight,
      projectName,
      mainLogo,
      favicon,
      email,
      host,
      phone: phone || "",
      companyWhatsapp: companyWhatsapp || "",
    };

    // Encrypt SMTP password at rest (remove bcrypt); masked input preserves existing
    if (password && !isMaskedValue(password) && password.trim() !== "") {
      updatedData.password = encryptCredential(password.trim());
      updatedData.smtpNeedsReentry = false;
    } else if (oldSiteSetting?.password) {
      updatedData.password = oldSiteSetting.password;
    }

    // Encrypt Gemini API key at rest; masked input preserves existing
    if (geminiApiKey && !isMaskedValue(geminiApiKey) && geminiApiKey.trim() !== "") {
      updatedData.geminiApiKey = encryptCredential(geminiApiKey.trim());
    } else if (oldSiteSetting?.geminiApiKey) {
      updatedData.geminiApiKey = oldSiteSetting.geminiApiKey;
    }

    // Upsert tenant's software setting record
    const updated = await SoftwareSettingModel.findOneAndUpdate(
      { tenantId },
      { $set: updatedData },
      { upsert: true, new: true }
    );

    // Also sync logo/favicon into TenantModel for platform-wide consistency
    await TenantModel.findByIdAndUpdate(tenantId, {
      $set: {
        "settings.logo": mainLogo || "",
        "settings.favicon": favicon || "",
        "settings.projectName": projectName || "",
      },
    });

    // Delete old files if replaced
    if (req.files?.mainLogo?.[0] && oldSiteSetting?.mainLogo && oldSiteSetting.mainLogo !== mainLogo) {
      deleteOldFile(oldSiteSetting.mainLogo);
    }
    if (req.files?.favicon?.[0] && oldSiteSetting?.favicon && oldSiteSetting.favicon !== favicon) {
      deleteOldFile(oldSiteSetting.favicon);
    }

    emitToTenant(tenantId, "site-setting:updated", {});

    return res
      .status(200)
      .json({ message: "Successfully saved settings.", success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

export { updateMainTheme, getMainTheme, getSiteSetting, updateSiteSetting };
