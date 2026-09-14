import SoftwareSettingModel from "../models/softwareSettingModel.js";
import ThemeModel from "../models/themeModel.js";
import TenantModel from "../models/tenantModel.js";
import { deleteOldFile, processFile } from "../services/fileUploadService.js";
import bcrypt from "bcrypt";

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

// ── Get Theme (Tenant Scoped) ──────────────────────────────────────────────────
const getMainTheme = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.query?.tenantId;

    if (!tenantId) {
      return res.status(200).json({
        message: "Default theme.",
        success: true,
        data: null,
      });
    }

    const mainTheme = await ThemeModel.findOne(
      { tenantId },
      { mainTheme: 1, createdAt: 1, updatedAt: 1 }
    );

    return res.status(200).json({
      message: "Successfully get theme.",
      success: true,
      data: mainTheme,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ── Get Site Setting (Tenant Scoped) ──────────────────────────────────────────
const getSiteSetting = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.query?.tenantId;

    // 1. If unauthenticated / no tenant context (e.g. public landing page):
    // Always return clean default Clientmark branding — NEVER another tenant's custom logo!
    if (!tenantId) {
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

    // 2. Fetch setting for THIS tenant only
    let siteSettingDtl = await SoftwareSettingModel.findOne({ tenantId }).select("-password");

    // 3. Fallback: If no SoftwareSetting record exists yet, check TenantModel profile
    if (!siteSettingDtl) {
      const tenant = await TenantModel.findById(tenantId);
      if (tenant) {
        siteSettingDtl = {
          tenantId: tenant._id,
          projectName: tenant.settings?.projectName || tenant.companyName || "Clientmark",
          mainLogo: tenant.settings?.logo || null,
          favicon: tenant.settings?.favicon || null,
          email: tenant.email || "",
          phone: tenant.phone || "",
        };
      } else {
        siteSettingDtl = {
          projectName: "Clientmark",
          mainLogo: null,
          favicon: null,
        };
      }
    }

    return res.status(200).json({
      message: "Successfully get site setting.",
      success: true,
      data: siteSettingDtl,
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

    if (password && password?.trim() !== "") {
      updatedData.password = await bcrypt.hash(password, 10);
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

    const io = req.app.get("io");
    if (io) {
      io.emit("updateSiteSetting", { tenantId: tenantId.toString() });
    }

    return res
      .status(200)
      .json({ message: "Successfully saved settings.", success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

export { updateMainTheme, getMainTheme, getSiteSetting, updateSiteSetting };
