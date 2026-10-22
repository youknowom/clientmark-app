import mongoose from "mongoose";
import bcrypt from "bcrypt";
import ExcelJS from "exceljs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import path from "path";

import { getDirname } from "../utils/pathUtil.js";
import { sendTextMail } from "../services/mailService.js";

import { fork } from "child_process";

import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PermissionModel from "../models/permissionModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import OTPModel from "../models/otpModel.js";
import PasswordResetTokenModel from "../models/passwordResetTokenModel.js";
import TenantModel from "../models/tenantModel.js";
import { generateAndSaveOTP, verifyOTP } from "../services/otpService.js";
import { disconnectUserSockets } from "../services/realtime.js";
import { normalizeTokenVersion } from "../middlewares/authMiddleware.js";
import { getTenantLimits } from "../middlewares/usageLimitMiddleware.js";

//get permission
const getPermissionList = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res
        .status(403)
        .json({ message: "Tenant information missing. Access denied.", success: false });
    }
    const permissionList = await PermissionModel.find({ tenantId }).sort({ index: 1 });

    if (!permissionList || permissionList?.length === 0) {
      return res
        .status(400)
        .json({ message: "No permission found.", success: false });
    }

    return res.status(200).json({
      message: "Successfully get permission.",
      success: true,
      data: permissionList,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//add role
const addRole = async (req, res) => {
  try {
    let { roleName, permissions, priority } = req.body;

    // basic presence validation
    if (!roleName || !permissions || priority === undefined) {
      return res.status(400).json({
        message: "Role Name, Permissions and Priority are required",
        success: false,
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        message: "Permissions must be an array",
        success: false,
      });
    }

    roleName = roleName.trim();
    priority = Number(priority);

    if (roleName.length === 0) {
      return res.status(400).json({
        message: "roleName cannot be empty",
        success: false,
      });
    }

    if (isNaN(priority) || priority <= 0) {
      return res.status(400).json({
        message: "Priority must be a valid positive number",
        success: false,
      });
    }

    // clean permissions
    permissions = permissions.map((p) => p.trim()).filter(Boolean);

    if (!permissions.length) {
      return res.status(400).json({
        message: "At least one permission is required",
        success: false,
      });
    }

    const uniquePermissions = [...new Set(permissions)];

    const tenantId = req.tenantId || req.user?.tenantId;

    // Determine expected priority for this tenant
    let expectedPriority;
    const lastRole = await RoleModel.findOne({ tenantId }).sort({ priority: -1 }).lean();
    expectedPriority = lastRole ? lastRole.priority + 1 : 1;

    if (priority !== expectedPriority) {
      return res.status(400).json({
        message: `Invalid priority. Next valid priority is ${expectedPriority}`,
        success: false,
      });
    }

    // Pre-check duplicates within this tenant BEFORE create
    const existingName = await RoleModel.findOne({
      roleName,
      tenantId,
    }).lean();

    if (existingName) {
      return res.status(409).json({
        message: "A role with this name already exists in the company.",
        success: false,
      });
    }

    const existingPriority = await RoleModel.findOne({
      priority,
      tenantId,
    }).lean();

    if (existingPriority) {
      return res.status(409).json({
        message: `Priority ${priority} is already taken.`,
        success: false,
      });
    }

    // create role scoped to tenant
    const newRole = await RoleModel.create({
      tenantId,
      roleName,
      permissions: uniquePermissions,
      priority,
    });

    return res.status(201).json({
      message: "Successfully create role.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

//update role
const updateRole = async (req, res) => {
  try {
    let { roleId, roleName, permissions } = req.body;

    // Basic validation
    if (!roleId || !roleName || !Array.isArray(permissions)) {
      return res.status(400).json({
        message: "RoleId, Role Name and Permissions are required",
        success: false,
      });
    }

    roleName = roleName.trim();

    if (!roleName.length) {
      return res.status(400).json({
        message: "Role Name cannot be empty",
        success: false,
      });
    }

    permissions = permissions.map((p) => p.trim()).filter(Boolean);

    if (!permissions.length) {
      return res.status(400).json({
        message: "At least one permission is required",
        success: false,
      });
    }

    const uniquePermissions = [...new Set(permissions)];

    const tenantId = req.tenantId || req.user?.tenantId;

    // Check if role exists within this tenant
    const existingRole = await RoleModel.findOne({ _id: roleId, tenantId });

    if (!existingRole) {
      return res.status(404).json({
        message: "Role not found",
        success: false,
      });
    }

    // Duplicate role name inside same tenant
    const duplicateName = await RoleModel.findOne({
      roleName,
      tenantId,
      _id: { $ne: roleId },
    }).lean();

    if (duplicateName) {
      return res.status(409).json({
        message: "Role name already exists.",
        success: false,
      });
    }

    // Handle priority
    let priority = existingRole.priority;

    // same tenant → keep same priority
    const duplicatePriority = await RoleModel.findOne({
      priority: priority,
      tenantId,
      _id: { $ne: roleId },
    }).lean();

    if (duplicatePriority) {
      return res.status(409).json({
        message: `Priority ${priority} is already assigned.`,
        success: false,
      });
    }

    const updatedRole = await RoleModel.findOneAndUpdate(
      { _id: roleId, tenantId },
      {
        $set: {
          roleName,
          permissions: uniquePermissions,
          priority,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      message: "Successfully update role",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

//get role list
const getRoleList = async (req, res) => {
  try {
    let { search = "" } = req.query;

    const tenantId = req.tenantId || req.user?.tenantId;
    let filter = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (search && search.trim() !== "") {
      filter.$or = [{ roleName: { $regex: search, $options: "i" } }];
    }
    const roleList = await RoleModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "roleId",
          as: "employees",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
        },
      },
      {
        $project: {
          employees: 0,
        },
      },
      {
        $sort: {
          priority: 1,
        },
      },
    ]);

    if (!roleList || roleList?.length === 0) {
      return res
        .status(400)
        .json({ message: "No role found.", success: false });
    }

    return res.status(200).json({
      message: "Successfully get roles.",
      success: true,
      data: roleList,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//delete role
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;

    //check this role has users or not (within tenant)
    const userCount = await UserModel.countDocuments({ roleId: roleId, tenantId });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Can not delete. This role have ${userCount} users.`,
        success: false,
      });
    }

    const isDelete = await RoleModel.deleteOne({ _id: roleId, tenantId });
    if (isDelete.deletedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to delete role.", success: false });
    }

    return res
      .status(200)
      .json({ message: "Successfully delete role.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//login by password
const loginByPass = async (req, res) => {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required.", success: false });
    }

    const normalizedInput = userName.trim();

    // Find user by mobile, username, or email
    const userDtl = await UserModel.findOne({
      $or: [
        { mobileNo: normalizedInput },
        { userName: normalizedInput },
        { email: normalizedInput.toLowerCase() },
      ],
    })
      .populate("roleId")
      .populate("branchId");

    // If user exists, check lockout
    if (userDtl && userDtl.lockUntil && userDtl.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (userDtl.lockUntil.getTime() - Date.now()) / (60 * 1000)
      );
      return res.status(429).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
        success: false,
      });
    }

    // Generic failure handler to avoid account enumeration
    const handleFailedLogin = async () => {
      if (userDtl) {
        const newAttempts = (userDtl.failedLoginAttempts || 0) + 1;
        const update = { failedLoginAttempts: newAttempts };
        if (newAttempts >= 5) {
          update.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
        await UserModel.updateOne({ _id: userDtl._id }, { $set: update });
      }
      return res.status(401).json({
        message: "Invalid username or password.",
        success: false,
      });
    };

    if (!userDtl || userDtl.status !== "Active") {
      return handleFailedLogin();
    }

    // Match password
    const isMatched = await bcrypt.compare(password, userDtl.password);
    if (!isMatched) {
      return handleFailedLogin();
    }

    // Password matched: reset failed login attempts and lock
    await UserModel.updateOne(
      { _id: userDtl._id },
      { $set: { failedLoginAttempts: 0, lockUntil: null } }
    );

    // Create token
    const token = jwt.sign(
      {
        userId: userDtl._id,
        role: userDtl.roleId?.roleName,
        tenantId: userDtl.tenantId,
        tokenVersion: normalizeTokenVersion(userDtl),
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userObj = userDtl.toObject ? userDtl.toObject() : { ...userDtl };
    delete userObj.password;

    return res.status(200).json({
      message: "Login Success",
      success: true,
      token: token,
      userDtl: userObj,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get login user details
const getLoginUserDetail = async (req, res) => {
  try {
    const { _id } = req.user;
    const tenantId = req.tenantId || req.user?.tenantId;

    //find user strictly scoped to tenant
    const loginUser = await UserModel.findOne({ _id: _id, tenantId })
      .populate("roleId", "permissions roleName")
      .populate("branchId", "branchName")
      .populate("reportToId", "fullName");

    if (!loginUser) {
      return res
        .status(400)
        .json({ message: "User detail not found.", success: false });
    }

    return res.status(200).json({
      message: "Successfully get user detail.",
      success: true,
      data: loginUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//create user
const createUser = async (req, res) => {
  try {
    let {
      branchId,
      departmentId,
      email,
      fullName,
      gender,
      mobileNo,
      password,
      roleId,
      status,
      userName,
      reportToId,
    } = req.body;

    //check validation
    if (
      !fullName ||
      fullName.trim() === "" ||
      !password ||
      !roleId ||
      !userName ||
      !email ||
      !mobileNo
    ) {
      return res
        .status(403)
        .json({ message: "Some data is missing.", success: false });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUserName = userName.trim();
    const normalizedMobile = mobileNo.trim();

    // Check duplicate username globally
    const duplicateUserName = await UserModel.findOne({ userName: normalizedUserName });
    if (duplicateUserName) {
      return res
        .status(400)
        .json({ message: "This username is already taken.", success: false });
    }

    // Check duplicate mobile number globally
    const duplicateMobile = await UserModel.findOne({ mobileNo: normalizedMobile });
    if (duplicateMobile) {
      return res
        .status(400)
        .json({ message: "This mobile number is already registered.", success: false });
    }

    // Check duplicate email globally
    const duplicateEmail = await UserModel.findOne({ email: normalizedEmail });
    if (duplicateEmail) {
      return res
        .status(400)
        .json({ message: "This email is already registered.", success: false });
    }

    //hash password
    const hashPassword = await bcrypt.hash(password, 10);

    // Strictly enforce tenantId from authenticated request (never req.body)
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res
        .status(403)
        .json({ message: "Tenant information missing.", success: false });
    }

    // Race-safe recount limit check (same pattern as createLead)
    const limits = await getTenantLimits(tenantId);
    if (limits && limits.maxUsers !== -1) {
      const currentUsers = await UserModel.countDocuments({ tenantId });
      if (currentUsers >= limits.maxUsers) {
        return res.status(403).json({
          message: `You've reached the maximum of ${limits.maxUsers} users on your current plan. Please upgrade to add more users.`,
          success: false,
          limitReached: true,
        });
      }
    }

    //save data
    const newUser = await UserModel.create({
      tenantId,
      branchId: branchId || null,
      departmentId: departmentId || null,
      email: normalizedEmail,
      fullName: fullName.trim(),
      gender,
      mobileNo: normalizedMobile,
      password: hashPassword,
      roleId: roleId,
      status: status || "Active",
      userName: normalizedUserName,
      reportToId: reportToId || null,
    });

    const __dirname = getDirname(import.meta.url);
    const workerPath = path.join(__dirname, "../workers/mailWorker.js");

    // Option B: Welcome email WITHOUT plaintext password (password set via reset/admin)
    let subject = "Your Account Has Been Successfully Created - Clientmark";
    let toEmail = normalizedEmail;
    let message = `Dear ${fullName},\n\nYour account on Clientmark CRM has been successfully created.\n\nUsername: ${normalizedUserName}\n\nPlease contact your workspace administrator or use the password reset option to set up your password.\n\nWelcome aboard!`;

    const child = fork(workerPath);
    child.send({
      subject,
      toEmail,
      message,
      tenantId,
      isPlatform: true,
    });

    return res
      .status(200)
      .json({ message: "Successfully add user..", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get user list
const getUserList = async (req, res) => {
  try {
    const userId = req.user._id || "";

    let {
      page = 1,
      limit = 50,
      search,
      roleId,
      departmentId,
      branchId,
      fromDate,
      toDate,
      wantParent = "No",
    } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    let filter = {};
    if (req.user?.tenantId) {
      filter.tenantId = req.user.tenantId;
    }
    if (search && search?.trim() !== "") {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    if (wantParent === "No") {
      filter._id = { $ne: userId };
    }

    if (branchId) {
      filter.branchId = branchId;
    }

    if (departmentId) {
      filter.departmentId = departmentId;
    }

    if (roleId) {
      filter.roleId = new mongoose.Types.ObjectId(roleId);
    }

    if (fromDate && toDate) {
      filter.createdAt = {};
      filter.createdAt.$gte = new Date(fromDate);

      let adjustedDate = new Date(toDate);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      filter.createdAt.$lte = adjustedDate;
    }
    const userList = await UserModel.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("roleId")
      .populate("branchId")
      .populate("reportToId");

    const total = await UserModel.countDocuments(filter);

    return res.status(200).json({
      message: "Successfully get user list.",
      success: true,
      data: userList,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalRecords: total,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const tenantId = req.user?.tenantId || req.tenantId;

    const isDelete = await UserModel.deleteOne({
      _id: userId,
      ...(tenantId ? { tenantId } : {}),
    });
    if (isDelete.deletedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to delete user.", success: false });
    }

    // Immediately terminate any active sockets for the deleted user
    await disconnectUserSockets(userId);

    return res
      .status(200)
      .json({ message: "Successfully delete user.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//export
const exportUserList = async (req, res) => {
  try {
    const userId = req.user._id || "";
    const tenantId = req.user?.tenantId || req.tenantId;

    let { search, roleId, departmentId, branchId, fromDate, toDate } =
      req.query;

    let filter = { _id: { $ne: userId } };
    if (tenantId) {
      filter.tenantId = tenantId;
    }
    if (search && search?.trim() !== "") {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    if (branchId) {
      filter.branchId = branchId;
    }

    if (departmentId) {
      filter.departmentId = departmentId;
    }

    if (roleId) {
      filter.roleId = roleId;
    }

    if (fromDate && toDate) {
      filter.createdAt = {};
      filter.createdAt.$gte = new Date(fromDate);

      let adjustedDate = new Date(toDate);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      filter.createdAt.$lte = adjustedDate;
    }
    const userList = await UserModel.find(filter)
      .sort({ createdAt: -1 })
      .populate("roleId")
      .populate("branchId")
      .populate("departmentId");
    if (!userList || userList?.length === 0) {
      return res
        .status(400)
        .json({ message: "No user found.", success: false });
    }

    // ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("User_List");

    worksheet.columns = [
      { header: "Sr_No", key: "srNo", width: 10 },
      { header: "Full Name", key: "fullName", width: 25 },
      { header: "User Name", key: "userName", width: 25 },
      { header: "Mobile No", key: "mobileNo", width: 25 },
      { header: "Email", key: "email", width: 25 },
      { header: "Gender", key: "gender", width: 25 },
      { header: "Role", key: "roleName", width: 25 },
      { header: "Branch", key: "branchName", width: 25 },
      { header: "Department", key: "departmentName", width: 25 },
      { header: "Reg. Date", key: "createdAt", width: 25 },
    ];

    userList.forEach((item, idx) => {
      worksheet.addRow({
        srNo: idx + 1,
        fullName: item.fullName,
        userName: item.userName,
        mobileNo: item.mobileNo,
        email: item.email,
        gender: item.gender,
        roleName: item.roleId.roleName || "-",
        branchName: item?.branchId?.branchName || "-",
        departmentName: item?.departmentId?.departmentName || "-",
        createdAt: item.createdAt
          ? new Date(item.createdAt)?.toLocaleDateString()
          : "-",
      });
    });

    // ===== Send File as Response =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=User_List.xlsx");

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//create user
const updateUser = async (req, res) => {
  try {
    let {
      userId,
      branchId,
      departmentId,
      email,
      fullName,
      gender,
      mobileNo,
      roleId,
      status,
      userName,
      password,
      reportToId,
    } = req.body;

    //check validation
    if (
      fullName?.trim() === "" ||
      !roleId ||
      !userName ||
      !email ||
      !mobileNo ||
      !userId
    ) {
      return res
        .status(403)
        .json({ message: "Some data is missing.", success: false });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUserName = userName.trim();
    const normalizedMobile = mobileNo.trim();

    //check dublicate username globally (excluding this user)
    const dublicateUserName = await UserModel.findOne({
      userName: normalizedUserName,
      _id: { $ne: userId },
    });
    if (dublicateUserName) {
      return res
        .status(400)
        .json({ message: "This user name already exist.", success: false });
    }

    //check dublicate mobile number globally (excluding this user)
    const dublicateMobile = await UserModel.findOne({
      mobileNo: normalizedMobile,
      _id: { $ne: userId },
    });
    if (dublicateMobile) {
      return res
        .status(400)
        .json({ message: "This mobile number already exist.", success: false });
    }

    //check dublicate email globally (excluding this user)
    const dublicateEmail = await UserModel.findOne({
      email: normalizedEmail,
      _id: { $ne: userId },
    });
    if (dublicateEmail) {
      return res
        .status(400)
        .json({ message: "This email already exist.", success: false });
    }

    //hash password
    let updateData = {
      branchId: branchId || null,
      departmentId: departmentId || null,
      email: normalizedEmail,
      fullName: fullName.trim(),
      gender,
      mobileNo: normalizedMobile,
      roleId: roleId,
      status,
      userName: normalizedUserName,
      reportToId: reportToId || null,
    };

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwordChangedAt = new Date();
    }

    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant information missing.", success: false });
    }

    const tenant = await TenantModel.findById(tenantId).select("isDemo").lean();
    if (tenant?.isDemo) {
      if (password && password.trim() !== "") {
        return res.status(403).json({
          message: "Demo account credentials cannot be modified.",
          success: false,
        });
      }
      if (status && status !== "Active") {
        return res.status(403).json({
          message: "Demo accounts cannot be deactivated.",
          success: false,
        });
      }
    }

    const updateOps = { $set: updateData };
    if (password && password.trim() !== "") {
      updateOps.$inc = { tokenVersion: 1 };
    }

    //save data strictly scoped to tenant
    const isUpdate = await UserModel.updateOne(
      { _id: userId, tenantId },
      updateOps,
    );

    if (isUpdate.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "User not found or access denied.", success: false });
    }

    // Immediately disconnect sockets if password changed or account deactivated
    if ((password && password.trim() !== "") || (status && status !== "Active")) {
      await disconnectUserSockets(userId);
    }

    return res
      .status(200)
      .json({ message: "Successfully update user..", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get user dropdown
const getUserDropdown = async (req, res) => {
  try {
    const { roleName } = req.query;

    const tenantId = req.tenantId || req.user?.tenantId;
    let filter = { status: "Active", tenantId };

    if (roleName) {
      const role = await RoleModel.findOne({ roleName, tenantId });

      if (!role) {
        return res
          .status(400)
          .json({ message: "Role not found.", success: false });
      }

      filter.roleId = role._id;
    }

    const userList = await UserModel.find(filter)
      .select("fullName userName mobileNo roleId branchId")
      .populate("roleId", "roleName");

    if (!userList || userList.length === 0) {
      return res
        .status(400)
        .json({ message: "No user found.", success: false });
    }

    return res.status(200).json({
      message: "Successfully get users.",
      success: true,
      data: userList,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      success: false,
    });
  }
};

//update self profile
const updateSelfProfile = async (req, res) => {
  try {
    const loginUserId = req.user._id;
    let { fullName, mobileNo, email, password, gender } = req.body;

    if (!fullName || fullName.trim() === "") {
      return res
        .status(400)
        .json({ message: "Full name is missing.", success: false });
    }

    if (!mobileNo || mobileNo?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Mobile number is missing.", success: false });
    }

    if (!email || email?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Email is missing.", success: false });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedMobile = mobileNo.trim();

    //check mobile already exist or not globally
    let isMobileExist = await UserModel.findOne({
      mobileNo: normalizedMobile,
      _id: { $ne: loginUserId },
    });
    if (isMobileExist) {
      return res
        .status(400)
        .json({ message: "This mobile number already exist.", success: false });
    }

    //check email already exist or not globally
    let isEmailExist = await UserModel.findOne({
      email: normalizedEmail,
      _id: { $ne: loginUserId },
    });
    if (isEmailExist) {
      return res
        .status(400)
        .json({ message: "This email already exist.", success: false });
    }

    let updateData = {
      fullName: fullName.trim(),
      mobileNo: normalizedMobile,
      email: normalizedEmail,
      gender,
    };

    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwordChangedAt = new Date();
    }

    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant information missing.", success: false });
    }

    const tenant = await TenantModel.findById(tenantId).select("isDemo").lean();
    if (tenant?.isDemo && password && password.trim() !== "") {
      return res.status(403).json({
        message: "Password modification is disabled in the demo environment.",
        success: false,
      });
    }

    const updateOps = { $set: updateData };
    if (password && password.trim() !== "") {
      updateOps.$inc = { tokenVersion: 1 };
    }

    const isUpdate = await UserModel.updateOne(
      { _id: loginUserId, tenantId },
      updateOps,
    );
    if (isUpdate.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "User not found or access denied.", success: false });
    }

    // Immediately disconnect sockets if password changed
    if (password && password.trim() !== "") {
      await disconnectUserSockets(loginUserId);
    }

    return res
      .status(200)
      .json({ message: "Successfully update profile.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//send mail otp
const sendMailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || email?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Email is required.", success: false });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Generate 6-digit OTP and enforce cooldown / hourly cap (tracked on email)
    const otpResult = await generateAndSaveOTP({
      subject: normalizedEmail,
      purpose: "password_reset",
    });

    if (!otpResult.success) {
      return res.status(429).json({
        message: otpResult.message,
        success: false,
      });
    }

    // 2. Check if user exists and is active
    const isMailExist = await UserModel.findOne({
      email: normalizedEmail,
      status: "Active",
    }).select("_id tenantId").lean();

    // 3. If user exists, dispatch email asynchronously via Platform SMTP without awaiting it in the request
    if (isMailExist) {
      const code = otpResult.plainOtp;
      setImmediate(async () => {
        try {
          await sendTextMail({
            subject: "Password reset verification code - Clientmark",
            toEmails: normalizedEmail,
            textMessage: `${code} is your 6-digit verification code to reset your password on Clientmark.\nThis code is valid for 10 minutes. Do not share it with anyone.`,
            isPlatform: true,
          });
        } catch (mailErr) {
          console.error("Async sendMailOtp failed:", mailErr.message);
        }
      });
    }

    // 4. Return identical generic response immediately (no timing difference)
    return res.status(200).json({
      message: "If that email is registered, a 6-digit verification code has been sent.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// verify email otp
const verifyEmailOtp = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
      return res.status(400).json({ message: "Please provide a valid 6-digit verification code.", success: false });
    }

    if (!email || email?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Email is required.", success: false });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify 6-digit OTP using otpService
    const verifyResult = await verifyOTP({
      subject: normalizedEmail,
      purpose: "password_reset",
      otp: otp.trim(),
    });

    if (!verifyResult.success) {
      return res.status(400).json({
        message: verifyResult.message,
        locked: verifyResult.locked || false,
        success: false,
      });
    }

    // Find active user
    const userDtl = await UserModel.findOne({
      email: normalizedEmail,
      status: "Active",
    }).select("_id tenantId");

    if (!userDtl) {
      return res
        .status(400)
        .json({ message: "Invalid request.", success: false });
    }

    // Issue a single-use 32-byte cryptographically random reset token (do NOT issue login JWT)
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await PasswordResetTokenModel.create({
      tokenHash,
      userId: userDtl._id,
      tenantId: userDtl.tenantId,
      expiresAt,
      used: false,
    });

    return res.status(200).json({
      message: "OTP Verified",
      success: true,
      resetToken: rawResetToken,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Legacy alias
const verityEmailOtp = verifyEmailOtp;

// reset password
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || typeof resetToken !== "string" || !newPassword) {
      return res.status(400).json({
        message: "Reset token and new password are required.",
        success: false,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
        success: false,
      });
    }

    const commonPasswords = [
      "password",
      "password123",
      "admin123",
      "12345678",
      "qwerty123",
      "clientmark123",
      "welcome123",
    ];
    if (commonPasswords.includes(newPassword.toLowerCase().trim())) {
      return res.status(400).json({
        message: "Please choose a stronger, less common password.",
        success: false,
      });
    }

    const tokenHash = crypto.createHash("sha256").update(resetToken.trim()).digest("hex");

    // Atomically find and mark token as used
    const tokenDoc = await PasswordResetTokenModel.findOneAndUpdate(
      {
        tokenHash,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { used: true },
      },
      { new: true }
    );

    if (!tokenDoc) {
      return res.status(400).json({
        message: "Invalid or expired password reset link. Please request a new code.",
        success: false,
      });
    }

    if (tokenDoc.tenantId) {
      const tenant = await TenantModel.findById(tokenDoc.tenantId).select("isDemo").lean();
      if (tenant?.isDemo) {
        return res.status(403).json({
          message: "Password reset is disabled for demo accounts.",
          success: false,
        });
      }
    }

    // Hash new password and update user with passwordChangedAt to invalidate old sessions
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.updateOne(
      { _id: tokenDoc.userId },
      {
        $set: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockUntil: null,
        },
        $inc: { tokenVersion: 1 },
      }
    );

    // Immediately disconnect all existing sessions/sockets for the user
    await disconnectUserSockets(tokenDoc.userId);

    return res.status(200).json({
      message: "Password updated successfully. Please log in with your new password.",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

export {
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
};
