import SoftwareSettingModel from "../models/softwareSettingModel.js";
import ThemeModel from "../models/themeModel.js";
import { deleteOldFile, processFile } from "../services/fileUploadService.js";
import bcrypt from "bcrypt";

//update main theme
const updateMainTheme = async (req, res) => {
  try {
    const { primaryColor, secondaryColor, backgroundColor, textColor } =
      req.body;
    if (!primaryColor || !secondaryColor || !backgroundColor || !textColor) {
      return res
        .status(403)
        .json({ message: "Some data is missing.", success: false });
    }

    const isUpdte = await ThemeModel.updateOne(
      {},
      {
        $set: {
          "mainTheme.primaryColor": primaryColor,
          "mainTheme.secondaryColor": secondaryColor,
          "mainTheme.backgroundColor": backgroundColor,
          "mainTheme.textColor": textColor,
        },
      },
    );

    if (isUpdte.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to save theme.", success: false });
    }

    return res
      .status(200)
      .json({ message: "Successfully saved theme.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get theme
const getMainTheme = async (req, res) => {
  try {
    const mainTheme = await ThemeModel.findOne(
      {},
      { mainTheme: 1, createdAt: 1, updatedAt: 1 },
    );

    if (!mainTheme) {
      return res.status(200).json({
        message: "No main theme found yet.",
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      message: "Successfully get theme.",
      success: true,
      data: mainTheme,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get software setting - logo etc
const getSiteSetting = async (req, res) => {
  try {
    const siteSettingDtl =
      await SoftwareSettingModel.findOne().select("-password");

    if (!siteSettingDtl) {
      return res.status(200).json({
        message: "No site setting found yet.",
        success: true,
        data: null,
      });
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

//update site setting
const updateSiteSetting = async (req, res) => {
  try {
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
        .json({ message: "Logo widht or height is missing.", success: false });
    }

    // Validate optional phone numbers
    const phoneRegex = /^\+\d{7,15}$/;
    if (phone && !phoneRegex.test(String(phone).replace(/[\s\-\(\)]/g, ""))) {
      return res
        .status(400)
        .json({
          message: "Invalid company phone number format.",
          success: false,
        });
    }
    if (
      companyWhatsapp &&
      !phoneRegex.test(String(companyWhatsapp).replace(/[\s\-\(\)]/g, ""))
    ) {
      return res
        .status(400)
        .json({
          message: "Invalid company WhatsApp number format.",
          success: false,
        });
    }

    //find old details
    const oldSiteSetting = await SoftwareSettingModel.findOne();

    let mainLogo = req.files?.mainLogo?.[0];
    mainLogo = mainLogo
      ? await processFile(mainLogo, "mainLogo")
      : oldSiteSetting?.mainLogo;

    let faviconFile = req.files?.favicon?.[0];
    const favicon = faviconFile
      ? await processFile(faviconFile, "favicon")
      : oldSiteSetting?.favicon;

    let updatedData = {
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
      updatedData.password = password;
    }

    const isUpdate = await SoftwareSettingModel.updateOne(
      {},
      {
        $set: updatedData,
      },
      { upsert: true }
    );

    //delete old files
    if (req.files?.mainLogo?.[0]) {
      deleteOldFile(oldSiteSetting?.mainLogo);
    }
    if (req.files?.favicon?.[0]) {
      deleteOldFile(oldSiteSetting?.favicon);
    }

    const io = req.app.get("io");
    io.emit("updateSiteSetting");

    return res
      .status(200)
      .json({ message: "Successfully save data.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

export { updateMainTheme, getMainTheme, getSiteSetting, updateSiteSetting };
