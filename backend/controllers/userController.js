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

//get permission
const getPermissionList = async (req, res) => {
  try {
    const permissionList = await PermissionModel.find().sort({ index: 1 });

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

    // Determine expected priority for company or super-admin
    let expectedPriority;
    const lastRole = await RoleModel.findOne().sort({ priority: -1 }).lean();
    expectedPriority = lastRole ? lastRole.priority + 1 : 1;

    if (priority !== expectedPriority) {
      return res.status(400).json({
        message: `Invalid priority. Next valid priority is ${expectedPriority}`,
        success: false,
      });
    }

    // Pre-check duplicates with clear messages BEFORE create
    const existingName = await RoleModel.findOne({
      roleName,
    }).lean();

    if (existingName) {
      return res.status(409).json({
        message: "A role with this name already exists in the company.",
        success: false,
      });
    }

    const existingPriority = await RoleModel.findOne({
      priority,
    }).lean();

    if (existingPriority) {
      return res.status(409).json({
        message: `Priority ${priority} is already taken.`,
        success: false,
      });
    }

    // create role
    const newRole = await RoleModel.create({
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

    // Check if role exists
    const existingRole = await RoleModel.findOne({ _id: roleId });

    if (!existingRole) {
      return res.status(404).json({
        message: "Role not found",
        success: false,
      });
    }

    // Duplicate role name inside same company
    const duplicateName = await RoleModel.findOne({
      roleName,
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

    // same company → keep same priority
    const duplicatePriority = await RoleModel.findOne({
      priority: priority,
      _id: { $ne: roleId },
    }).lean();

    if (duplicatePriority) {
      return res.status(409).json({
        message: `Priority ${priority} is already assigned.`,
        success: false,
      });
    }

    const updatedRole = await RoleModel.findOneAndUpdate(
      { _id: roleId },
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

    let filter = {};

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

    //check thit role have user or not
    const userCount = await UserModel.countDocuments({ roleId: roleId });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Can not delete. This role have ${userCount} users.`,
        success: false,
      });
    }

    const isDelete = await RoleModel.deleteOne({ _id: roleId });
    if (isDelete.deletedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to delete role.", success: false });
    }

    return res
      .status(200)
      .json({ message: "Successfully delete role.", success: false });
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
        .json({ message: "Some data is missing.", success: false });
    }

    //find user
    const userDtl = await UserModel.findOne({
      $or: [{ mobileNo: userName }, { userName: userName }],
    })
      .populate("roleId")
      .populate("branchId");
    if (!userDtl) {
      return res.status(400).json({
        message: "This mobile number not registered.",
        success: false,
      });
    }

    //match password
    const isMatched = await bcrypt.compare(password, userDtl.password);
    if (!isMatched) {
      return res.status(400).json({
        message: "Incorrect Password. Please check password.",
        success: false,
      });
    }

    //create token
    const token = jwt.sign(
      { userId: userDtl._id, role: userDtl.roleId.roleName, tenantId: userDtl.tenantId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      message: "Login Success",
      success: true,
      token: token,
      userDtl: userDtl,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//get login user details
const getLoginUserDetail = async (req, res) => {
  try {
    const { _id } = req.user;

    //find user
    const loginUser = await UserModel.findOne({ _id: _id })
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
      fullName?.trim() === "" ||
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

    //check dublicate username
    const dublicateUserName = await UserModel.findOne({ userName });
    if (dublicateUserName) {
      return res
        .status(400)
        .json({ message: "This user name already exist.", success: false });
    }

    //check dublicate mobile number
    const dublicateMobile = await UserModel.findOne({ mobileNo });
    if (dublicateMobile) {
      return res
        .status(400)
        .json({ message: "This mobile number already exist.", success: false });
    }

    //check dublicate email
    const dublicateEmail = await UserModel.findOne({ email });
    if (dublicateEmail) {
      return res
        .status(400)
        .json({ message: "This email already exist.", success: false });
    }

    //hash password
    const hashPassword = await bcrypt.hash(password, 10);

    //save data
    const newUser = await UserModel.create({
      branchId: branchId || null,
      departmentId: departmentId || null,
      email,
      fullName,
      gender,
      mobileNo,
      password: hashPassword,
      roleId: roleId,
      status,
      userName,
      reportToId: reportToId || null,
    });

    const __dirname = getDirname(import.meta.url);
    const workerPath = path.join(__dirname, "../workers/mailWorker.js");

    let subject = "Your Account Has Been Successfully Created";
    let toEmail = email;
    let message = `Dear ${fullName},\n\nYour account has been successfully created.\n\nBelow are your login credentials:\nUsername: ${userName}\nPassword: ${password}\n\nPlease keep these details secure. We recommend changing your password after your first login for security purposes.\n\nWelcome aboard, and we’re glad to have you with us!`;

    const child = fork(workerPath);
    child.send({ subject: subject, toEmail: toEmail, message: message });

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

    const isDelete = await UserModel.deleteOne({ _id: userId });
    if (isDelete.deletedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to delete user.", success: false });
    }

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

    let { search, roleId, departmentId, branchId, fromDate, toDate } =
      req.query;

    let filter = { _id: { $ne: userId } };
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

    //check dublicate username
    const dublicateUserName = await UserModel.findOne({
      userName,
      _id: { $ne: userId },
    });
    if (dublicateUserName) {
      return res
        .status(400)
        .json({ message: "This user name already exist.", success: false });
    }

    //check dublicate mobile number
    const dublicateMobile = await UserModel.findOne({
      mobileNo,
      _id: { $ne: userId },
    });
    if (dublicateMobile) {
      return res
        .status(400)
        .json({ message: "This mobile number already exist.", success: false });
    }

    //check dublicate email
    const dublicateEmail = await UserModel.findOne({
      email,
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
      email,
      fullName,
      gender,
      mobileNo,
      roleId: roleId,
      status,
      userName,
      reportToId: reportToId || null,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    //save data
    const isUpdate = await UserModel.updateOne(
      { _id: userId },
      { $set: updateData },
    );

    if (isUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed update user..", success: true });
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

    let filter = { status: "Active" };

    if (roleName) {
      const role = await RoleModel.findOne({ roleName });

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

    //check mobile already exist or not
    let isMobileExist = await UserModel.findOne({
      mobileNo,
      _id: { $ne: loginUserId },
    });
    if (isMobileExist) {
      return res
        .status(400)
        .json({ message: "This mobile number already exist.", success: false });
    }

    //check email already exist or not
    let isEmailExist = await UserModel.findOne({
      email,
      _id: { $ne: loginUserId },
    });
    if (isEmailExist) {
      return res
        .status(400)
        .json({ message: "This email already exist.", success: false });
    }

    let updateData = {
      fullName,
      mobileNo,
      email,
      gender,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const isUpdate = await UserModel.updateOne(
      { _id: loginUserId },
      { $set: updateData },
    );
    if (isUpdate.modifiedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to update profile.", success: false });
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
    if (!email && email?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Mail is missing.", success: false });
    }

    //check mail is exist or not in system
    const [isMailExist, softwareSetting] = await Promise.all([
      UserModel.findOne({ email }),
      SoftwareSettingModel.findOne(),
    ]);
    if (!isMailExist) {
      return res
        .status(400)
        .json({ message: "This mail not registered.", success: false });
    }

    //check number of attempt
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let noOfAttempt = await OTPModel.countDocuments({
      userName: email,
      createdAt: { $gte: oneHourAgo },
    });

    if (noOfAttempt >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Try again after 1 hour.",
      });
    }

    //if all ok - create otp
    const PROJECT_NAME =
      softwareSetting?.projectName || process.env.PROJECT_NAME;
    const otp = crypto.randomInt(1000, 9999).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    let message = `${otp} is your OTP for reset passwrod on ${PROJECT_NAME}.\nOTP valid for 10 Minute. Please do not share`;
    let subject = "Your OTP Code for Reset Password.";

    //send mail subject, toEmails, textMessage, ccEmails = []
    const isSendMail = await sendTextMail(subject, email, message);

    if (!isSendMail) {
      return res
        .status(400)
        .json({ message: "Failed to send OTP.", success: false });
    }

    //save otp in collection
    const newOtp = new OTPModel({
      userName: email,
      otp,
      expiry,
    });

    await newOtp.save();

    return res
      .status(200)
      .json({ message: "OTP send to mail.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// verity email otp
const verityEmailOtp = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp || otp.length != 4) {
      return res.status(400).json({ message: "Invalid otp", success: false });
    }

    if (!email && email?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Mail is missing.", success: false });
    }

    //verity otp
    const record = await OTPModel.findOne({ userName: email, otp: otp });
    if (!record) {
      return res
        .status(400)
        .json({ message: "Incorrect OTP. Please check OTP.", success: false });
    }

    //check expire or not
    if (record.expiry < Date.now()) {
      await OTPModel.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired.", success: false });
    }

    //find user details - already exist or not in system
    const userDtl = await UserModel.findOne({ email }).populate("roleId");
    if (!userDtl) {
      await OTPModel.deleteMany({ userName: email });
      return res
        .status(200)
        .json({ message: "OTP Verified.", success: true, isRegistered: false });
    }

    //delete final
    await OTPModel.deleteMany({ userName: email });

    //create token
    const token = jwt.sign(
      { userId: userDtl._id, role: userDtl.roleId.roleName },
      process.env.JWT_SECRET,
    );

    return res.status(200).json({
      message: "OTP Verified",
      success: true,
      token: token,
      userDtl: userDtl,
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
  verityEmailOtp,
};
