import express from "express";
import { upload } from "../services/fileUploadService.js";
import { authUser, authAccess, optionalAuthUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  updateMainTheme,
  getMainTheme,
  getSiteSetting,
  updateSiteSetting,
} from "../controllers/softwareSettingController.js";

const softwareSettingRouter = express.Router();

// ── Public / Optional Auth Routes (Resolved by Slug or Token) ──
softwareSettingRouter.get("/get-main-theme", optionalAuthUser, getMainTheme);
softwareSettingRouter.get("/get-site-setting", optionalAuthUser, getSiteSetting);

// ── Protected Routes (Strictly Tenant Isolated) ──
softwareSettingRouter.use(authUser, tenantMiddleware);

softwareSettingRouter.put(
  "/update-main-theme",
  authAccess("update:theme-setting"),
  updateMainTheme,
);

softwareSettingRouter.post(
  "/update-site-setting",
  authAccess("update:site-setting"),
  upload.fields([
    { name: "mainLogo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateSiteSetting,
);

export default softwareSettingRouter;
