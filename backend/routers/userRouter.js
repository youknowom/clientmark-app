import express from "express";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import { checkUserLimit } from "../middlewares/usageLimitMiddleware.js";
import rateLimit from "express-rate-limit";
import {
  getPermissionList,
  addRole,
  updateRole,
  getRoleList,
  deleteRole,
  loginByPass,
  getLoginUserDetail,
  createUser,
  getUserList,
  deleteUser,
  exportUserList,
  updateUser,
  getUserDropdown,
  updateSelfProfile,
  sendMailOtp,
  verifyEmailOtp,
  verityEmailOtp,
  resetPassword,
} from "../controllers/userController.js";

const userRouter = express.Router();

const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication requests from this IP. Please try again later." },
});

const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests from this IP. Please try again later." },
});

// ── Public Routes (Unauthenticated) ──
userRouter.post("/login-by-pass", authIpLimiter, loginByPass);
userRouter.post("/send-mail-otp", otpSendLimiter, sendMailOtp);
userRouter.post("/verify-email-otp", authIpLimiter, verifyEmailOtp);
userRouter.post("/verity-email-otp", authIpLimiter, verityEmailOtp); // legacy alias
userRouter.post("/reset-password", authIpLimiter, resetPassword);

// ── Protected Routes (Strictly Tenant Isolated) ──
userRouter.use(authUser, tenantMiddleware);

userRouter.get("/get-permission-list", getPermissionList);
userRouter.get("/get-login-user-detail", getLoginUserDetail);
userRouter.put("/update-self-profile", updateSelfProfile);

userRouter.post("/add-role", authAccess("add:role"), addRole);
userRouter.put("/update-role", authAccess("update:role"), updateRole);
userRouter.get("/get-role-list", authAccess("view:role"), getRoleList);
userRouter.delete("/delete-role", authAccess("delete:role"), deleteRole);

userRouter.post("/create-user", authAccess("add:user"), checkUserLimit, createUser);
userRouter.get("/get-user-list", authAccess("view:user"), getUserList);
userRouter.delete("/delete-user", authAccess("delete:user"), deleteUser);
userRouter.get("/export-user-list", authAccess("view:user"), exportUserList);
userRouter.put("/update-user", authAccess("update:user"), updateUser);
userRouter.get("/get-user-dropdown", getUserDropdown);

export default userRouter;
