import express from "express";
import { upload } from "../services/fileUploadService.js";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import {
  updateMainTheme,
  getMainTheme,
  getSiteSetting,
  updateSiteSetting,
} from "../controllers/softwareSettingController.js";

const softwareSettingRouter = express.Router();

softwareSettingRouter.put(
  "/update-main-theme",
  authUser,
  authAccess("update:theme-setting"),
  updateMainTheme,
); //update main theme

softwareSettingRouter.get("/get-main-theme", getMainTheme); //get main theme

softwareSettingRouter.get("/get-site-setting", getSiteSetting); //get software setting logo, etc

softwareSettingRouter.post(
  "/update-site-setting",
  authUser,
  authAccess("update:site-setting"),
  upload.fields([
    { name: "mainLogo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateSiteSetting,
); //update site setting

export default softwareSettingRouter;
