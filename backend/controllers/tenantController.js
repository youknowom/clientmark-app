import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import TenantModel from "../models/tenantModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PermissionModel from "../models/permissionModel.js";
import ThemeModel from "../models/themeModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";

// ── Permission data (same as seedDatabase) ──
const PERMISSIONS_DATA = [
  {
    permissionName: "Dashboard",
    index: 1,
    subPermission: [
      { subName: "View Dashboard", code: "view:dashboard-master" },
    ],
  },
  {
    permissionName: "Lead",
    index: 2,
    subPermission: [
      { subName: "Add Lead", code: "add:lead" },
      { subName: "View Lead Master", code: "view:lead-master" },
      { subName: "View Lead", code: "view:lead" },
      { subName: "Update Lead", code: "update:lead" },
      { subName: "Delete Lead", code: "delete:lead" },
    ],
  },
  {
    permissionName: "Project",
    index: 3,
    subPermission: [
      { subName: "Add Project", code: "add:project" },
      { subName: "View Project Master", code: "view:project-master" },
      { subName: "View Project", code: "view:project" },
    ],
  },
  {
    permissionName: "Branch",
    index: 4,
    subPermission: [
      { subName: "Add Branch", code: "add:branch" },
      { subName: "View Branch", code: "view:branch" },
      { subName: "Update Branch", code: "update:branch" },
      { subName: "Delete Branch", code: "delete:branch" },
    ],
  },
  {
    permissionName: "Role",
    index: 5,
    subPermission: [
      { subName: "Add Role", code: "add:role" },
      { subName: "View Role", code: "view:role" },
      { subName: "Update Role", code: "update:role" },
      { subName: "Delete Role", code: "delete:role" },
    ],
  },
  {
    permissionName: "User",
    index: 6,
    subPermission: [
      { subName: "View User Master", code: "view:user-master" },
      { subName: "Add User", code: "add:user" },
      { subName: "View User", code: "view:user" },
      { subName: "Update User", code: "update:user" },
      { subName: "Delete User", code: "delete:user" },
    ],
  },
  {
    permissionName: "Profile",
    index: 7,
    subPermission: [
      { subName: "View Profile", code: "view:profile" },
    ],
  },
  {
    permissionName: "Settings",
    index: 8,
    subPermission: [
      { subName: "View Setting Master", code: "view:setting-master" },
      { subName: "View Theme Setting", code: "view:theme-setting" },
      { subName: "Update Theme Setting", code: "update:theme-setting" },
      { subName: "View Site Setting", code: "view:site-setting" },
      { subName: "Update Site Setting", code: "update:site-setting" },
      { subName: "View WhatsApp Setting", code: "view:whatsapp-setting" },
    ],
  },
  {
    permissionName: "Reports",
    index: 9,
    subPermission: [
      { subName: "View Report Master", code: "view:report-master" },
      { subName: "View Telecaller Lead Report", code: "view:telecaller-lead-report" },
      { subName: "View BDE Lead Report", code: "view:bde-lead-report" },
      { subName: "View Lead Status Report", code: "view:lead-status-report" },
      { subName: "View Project Status Report", code: "view:project-status-report" },
    ],
  },
  {
    permissionName: "WhatsApp",
    index: 10,
    subPermission: [
      { subName: "View WhatsApp Chat Record", code: "view:whatsapp-chat-record" },
    ],
  },
];

const DEFAULT_THEME = {
  mainTheme: {
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    backgroundColor: "#0f172a",
    textColor: "#f8fafc",
  },
};

// ── Helper: Generate URL-friendly slug ──
const generateSlug = (companyName) => {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
};

// ── Helper: Seed data for a new tenant ──
const seedTenantData = async (tenantId, adminData) => {
  // 1. Seed permissions for this tenant
  const permissionsWithTenant = PERMISSIONS_DATA.map((p) => ({
    ...p,
    tenantId,
  }));
  await PermissionModel.insertMany(permissionsWithTenant);

  // 2. Collect all permission codes
  const allPermissionCodes = PERMISSIONS_DATA.flatMap((p) =>
    p.subPermission.map((sp) => sp.code)
  );

  // 3. Create Admin role for this tenant
  const adminRole = await RoleModel.create({
    tenantId,
    roleName: "Admin",
    priority: 1,
    permissions: allPermissionCodes,
  });

  // 4. Create admin user
  const hashedPassword = await bcrypt.hash(adminData.password, 10);
  const adminUser = await UserModel.create({
    tenantId,
    fullName: adminData.fullName || "Admin",
    userName: adminData.userName,
    email: adminData.email,
    mobileNo: adminData.mobileNo || "",
    password: hashedPassword,
    gender: "Male",
    status: "Active",
    roleId: adminRole._id,
  });

  // 5. Create default theme for this tenant
  await ThemeModel.create({
    tenantId,
    ...DEFAULT_THEME,
  });

  // 6. Create clean, isolated software setting for this tenant
  await SoftwareSettingModel.create({
    tenantId,
    projectName: adminData.companyName || "Clientmark",
    mainLogo: "",
    favicon: "",
    email: adminData.email || "",
    phone: adminData.mobileNo || "",
    logoWidth: 150,
    logoHeight: 50,
  });

  return adminUser;
};

// ══════════════════════════════════════════════════════════════
// POST /tenant/register — Public registration endpoint
// ══════════════════════════════════════════════════════════════
const registerTenant = async (req, res) => {
  try {
    const { companyName, email, phone, userName, password, fullName } = req.body;

    // Validation
    if (!companyName || !email || !userName || !password) {
      return res.status(400).json({
        message: "Company name, email, username, and password are required.",
        success: false,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
        success: false,
      });
    }

    // Check duplicate email
    const existingTenant = await TenantModel.findOne({ email: email.toLowerCase() });
    if (existingTenant) {
      return res.status(409).json({
        message: "An account with this email already exists.",
        success: false,
      });
    }

    // Check duplicate username globally
    const existingUser = await UserModel.findOne({ userName });
    if (existingUser) {
      return res.status(409).json({
        message: "This username is already taken.",
        success: false,
      });
    }

    // Generate unique slug
    let slug = generateSlug(companyName);
    const existingSlug = await TenantModel.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Get the free plan
    const freePlan = await PlanModel.findOne({ planName: "Free" });

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // 1. Create tenant
    const tenant = await TenantModel.create({
      companyName: companyName.trim(),
      slug,
      email: email.toLowerCase().trim(),
      phone: phone || "",
      status: "Active",
      planId: freePlan?._id || null,
      trialEndsAt,
      isTrialActive: true,
      settings: {
        projectName: companyName.trim(),
      },
    });

    // 2. Seed permissions, roles, admin user, theme, site settings
    const adminUser = await seedTenantData(tenant._id, {
      fullName: fullName || companyName,
      companyName: companyName.trim(),
      userName,
      email: email.toLowerCase().trim(),
      mobileNo: phone || "",
      password,
    });

    // 3. Create subscription record
    if (freePlan) {
      await SubscriptionModel.create({
        tenantId: tenant._id,
        planId: freePlan._id,
        status: "trial",
        startDate: new Date(),
        trialEndsAt,
      });
    }

    // 4. Generate JWT token (auto-login after registration)
    const token = jwt.sign(
      {
        userId: adminUser._id,
        role: "Admin",
        tenantId: tenant._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Registration successful! Welcome aboard.",
      success: true,
      token,
      tenant: {
        id: tenant._id,
        companyName: tenant.companyName,
        slug: tenant.slug,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: error.message || "Registration failed. Please try again.",
      success: false,
    });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /tenant/my-tenant — Get current tenant details (protected)
// ══════════════════════════════════════════════════════════════
const getMyTenant = async (req, res) => {
  try {
    const tenant = await TenantModel.findById(req.tenantId)
      .populate("planId")
      .lean();

    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found.",
        success: false,
      });
    }

    // Get subscription info
    const subscription = await SubscriptionModel.findOne({
      tenantId: req.tenantId,
      status: { $in: ["trial", "active"] },
    })
      .populate("planId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Successfully fetched tenant details.",
      success: true,
      data: {
        tenant,
        subscription,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// PUT /tenant/update — Update tenant settings (protected)
// ══════════════════════════════════════════════════════════════
const updateTenant = async (req, res) => {
  try {
    const { companyName, phone, settings } = req.body;

    const updateData = {};
    if (companyName) updateData.companyName = companyName.trim();
    if (phone) updateData.phone = phone;
    if (settings) updateData.settings = settings;

    const tenant = await TenantModel.findByIdAndUpdate(
      req.tenantId,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      message: "Tenant updated successfully.",
      success: true,
      data: tenant,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

export { registerTenant, getMyTenant, updateTenant };
