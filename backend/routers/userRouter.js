import express from "express";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
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
  verityEmailOtp
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/get-permission-list", getPermissionList); //get permission list

userRouter.post("/add-role", authUser, authAccess("add:role"), addRole); //add role

userRouter.put("/update-role", authUser, authAccess("update:role"), updateRole); //update role

userRouter.get(
  "/get-role-list",
  authUser,
  authAccess("view:role"),
  getRoleList,
); //get role list

userRouter.post("/login-by-pass", loginByPass); //login by password

userRouter.get("/get-login-user-detail", authUser, getLoginUserDetail); //get login user details

userRouter.post("/create-user", authUser, authAccess("add:user"), createUser); //create user

userRouter.delete(
  "/delete-role",
  authUser,
  authAccess("delete:role"),
  deleteRole,
); //delete role

userRouter.get(
  "/get-user-list",
  authUser,
  authAccess("view:user"),
  getUserList,
); //get user list

userRouter.delete(
  "/delete-user",
  authUser,
  authAccess("delete:user"),
  deleteUser,
); //delete user

userRouter.get(
  "/export-user-list",
  authUser,
  authAccess("view:user"),
  exportUserList,
); //export user list

userRouter.put("/update-user", authUser, authAccess("update:user"), updateUser); //update user detail by admin

userRouter.get("/get-user-dropdown", authUser, getUserDropdown); //get user dropdown

userRouter.put("/update-self-profile", authUser, updateSelfProfile); //update self profile

userRouter.post("/send-mail-otp", sendMailOtp); //send otp to mail

userRouter.post('/verity-email-otp',verityEmailOtp);//verify email otp

export default userRouter;
