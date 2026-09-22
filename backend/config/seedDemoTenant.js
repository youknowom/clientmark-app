import bcrypt from "bcrypt";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import PermissionModel from "../models/permissionModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import LeadModel from "../models/leadModel.js";
import ProjectModel from "../models/projectModel.js";
import TimelineModel from "../models/timelineModel.js";
import ThemeModel from "../models/themeModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";

const DEMO_SLUG = "demo-workspace";

export const seedDemoTenant = async () => {
  try {
    const existing = await TenantModel.findOne({ slug: DEMO_SLUG });
    if (existing) {
      return existing;
    }

    console.log("⚡ Provisioning Acme Digital Agency (Demo Workspace)...");

    // 1. Get Professional or Enterprise plan
    let plan = await PlanModel.findOne({ planName: "Professional" });
    if (!plan) {
      plan = await PlanModel.findOne({ planName: "Starter" }) || await PlanModel.findOne({});
    }

    // 2. Create Demo Tenant
    const tenant = await TenantModel.create({
      companyName: "Acme Digital Agency (Demo)",
      slug: DEMO_SLUG,
      email: "demo@clientmark.io",
      phone: "+91 9876543210",
      status: "Active",
      isDemo: true,
      planId: plan?._id,
      isTrialActive: false,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      settings: {
        projectName: "Acme Digital Agency",
      },
    });

    const tenantId = tenant._id;

    // 3. Permissions Data
    const PERMISSIONS = [
      {
        permissionName: "Dashboard",
        index: 1,
        tenantId,
        subPermission: [{ subName: "View Dashboard", code: "view:dashboard-master" }],
      },
      {
        permissionName: "Lead",
        index: 2,
        tenantId,
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
        tenantId,
        subPermission: [
          { subName: "Add Project", code: "add:project" },
          { subName: "View Project Master", code: "view:project-master" },
          { subName: "View Project", code: "view:project" },
        ],
      },
      {
        permissionName: "Branch",
        index: 4,
        tenantId,
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
        tenantId,
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
        tenantId,
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
        tenantId,
        subPermission: [{ subName: "View Profile", code: "view:profile" }],
      },
      {
        permissionName: "Settings",
        index: 8,
        tenantId,
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
        tenantId,
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
        tenantId,
        subPermission: [{ subName: "View WhatsApp Chat Record", code: "view:whatsapp-chat-record" }],
      },
    ];

    await PermissionModel.insertMany(PERMISSIONS);
    const allCodes = PERMISSIONS.flatMap((p) => p.subPermission.map((sp) => sp.code));

    // 4. Create Standard Roles
    const roles = await RoleModel.insertMany([
      {
        tenantId,
        roleName: "Admin",
        priority: 1,
        permissions: allCodes,
      },
      {
        tenantId,
        roleName: "BDE",
        priority: 2,
        permissions: [
          "view:dashboard-master",
          "add:lead",
          "view:lead-master",
          "view:lead",
          "update:lead",
          "view:project-master",
          "view:project",
          "view:profile",
          "view:report-master",
          "view:bde-lead-report",
          "view:lead-status-report",
        ],
      },
      {
        tenantId,
        roleName: "Telecaller",
        priority: 3,
        permissions: [
          "view:dashboard-master",
          "view:lead-master",
          "view:lead",
          "update:lead",
          "view:profile",
          "view:report-master",
          "view:telecaller-lead-report",
          "view:whatsapp-chat-record",
        ],
      },
      {
        tenantId,
        roleName: "Developer",
        priority: 4,
        permissions: [
          "view:dashboard-master",
          "view:project-master",
          "view:project",
          "view:profile",
          "view:report-master",
          "view:project-status-report",
        ],
      },
    ]);

    const adminRole = roles.find((r) => r.roleName === "Admin");
    const bdeRole = roles.find((r) => r.roleName === "BDE");
    const telecallerRole = roles.find((r) => r.roleName === "Telecaller");
    const devRole = roles.find((r) => r.roleName === "Developer");

    // 5. Create Demo Users
    const hashedPassword = await bcrypt.hash("ClientmarkDemo2026!", 10);

    const [adminUser, bdeUser, telecallerUser, devUser] = await UserModel.insertMany([
      {
        tenantId,
        fullName: "Demo Administrator",
        userName: "demo_admin",
        email: "admin@acme-demo.io",
        mobileNo: "9876543210",
        password: hashedPassword,
        gender: "Male",
        status: "Active",
        roleId: adminRole._id,
      },
      {
        tenantId,
        fullName: "Vikram Joshi",
        userName: "vikram_bde",
        email: "vikram@acme-demo.io",
        mobileNo: "9876543211",
        password: hashedPassword,
        gender: "Male",
        status: "Active",
        roleId: bdeRole._id,
      },
      {
        tenantId,
        fullName: "Priya Sharma",
        userName: "priya_tc",
        email: "priya@acme-demo.io",
        mobileNo: "9876543212",
        password: hashedPassword,
        gender: "Female",
        status: "Active",
        roleId: telecallerRole._id,
      },
      {
        tenantId,
        fullName: "Arjun Mehta",
        userName: "arjun_dev",
        email: "arjun@acme-demo.io",
        mobileNo: "9876543213",
        password: hashedPassword,
        gender: "Male",
        status: "Active",
        roleId: devRole._id,
      },
    ]);

    // 6. Theme and Settings
    await ThemeModel.create({
      tenantId,
      mainTheme: {
        primaryColor: "#111827",
        secondaryColor: "#E05E3A",
        backgroundColor: "#FBFBF9",
        textColor: "#111827",
      },
    });

    await SoftwareSettingModel.create({
      tenantId,
      projectName: "Acme Agency CRM (Demo)",
      email: "demo@clientmark.io",
      phone: "+91 9876543210",
    });

    if (plan) {
      await SubscriptionModel.create({
        tenantId,
        planId: plan._id,
        status: "active",
        startDate: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }

    // 7. Seed Diverse Realistic Leads
    const demoLeads = [
      // NEW Stage
      {
        tenantId,
        leadNo: "LD-1001",
        fullName: "Rohan Verma",
        mobileNo: "9820112233",
        email: "rohan@fintechcorp.in",
        businessName: "FinTech Corp India",
        serviceRequirement: "Custom Mobile App & Payment Gateway",
        leadStage: "NEW",
        leadStatus: "NEW",
        assignedTelecallerId: telecallerUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1002",
        fullName: "Sneha Kapoor",
        mobileNo: "9830223344",
        email: "sneha@luxeretail.com",
        businessName: "Luxe Retail Brands",
        serviceRequirement: "Headless E-Commerce Migration",
        leadStage: "NEW",
        leadStatus: "NEW",
      },
      {
        tenantId,
        leadNo: "LD-1003",
        fullName: "Aarav Patel",
        mobileNo: "9840334455",
        email: "aarav@patelconstructions.com",
        businessName: "Patel Infrastructure",
        serviceRequirement: "ERP & Project Milestones Tracking",
        leadStage: "NEW",
        leadStatus: "NEW",
      },
      // TELECALLING Stage
      {
        tenantId,
        leadNo: "LD-1004",
        fullName: "Meera Desai",
        mobileNo: "9850445566",
        email: "meera@healthplus.org",
        businessName: "HealthPlus Diagnostic",
        serviceRequirement: "Patient Appointment CRM",
        leadStage: "TELECALLING",
        leadStatus: "ASSIGNED_TO_TELECALLER",
        assignedTelecallerId: telecallerUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1005",
        fullName: "Nikhil Gupta",
        mobileNo: "9860556677",
        email: "nikhil@guptalogistics.com",
        businessName: "Gupta Freight & Logistics",
        serviceRequirement: "Fleet Tracking Dashboard",
        leadStage: "TELECALLING",
        leadStatus: "ASSIGNED_TO_TELECALLER",
        assignedTelecallerId: telecallerUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1006",
        fullName: "Ananya Reddy",
        mobileNo: "9870667788",
        email: "ananya@reddyfoods.in",
        businessName: "Reddy Organics",
        serviceRequirement: "WhatsApp Automated Ordering",
        leadStage: "TELECALLING",
        leadStatus: "ASSIGNED_TO_TELECALLER",
        assignedTelecallerId: telecallerUser._id,
      },
      // SALES Stage
      {
        tenantId,
        leadNo: "LD-1007",
        fullName: "Pooja Hegde",
        mobileNo: "9880778899",
        email: "pooja@edunext.co",
        businessName: "EduNext Learning",
        serviceRequirement: "LMS Portal & Student Analytics",
        leadStage: "SALES",
        leadStatus: "ASSIGNED_TO_BDE",
        assignedBdeId: bdeUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1008",
        fullName: "Varun Dhawan",
        mobileNo: "9890889900",
        email: "varun@dhawanexports.com",
        businessName: "Dhawan Global Exports",
        serviceRequirement: "Cross-border B2B Marketplace",
        leadStage: "SALES",
        leadStatus: "ASSIGNED_TO_BDE",
        assignedBdeId: bdeUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1009",
        fullName: "Divya Nair",
        mobileNo: "9900990011",
        email: "divya@zenithtravel.com",
        businessName: "Zenith Travel Club",
        serviceRequirement: "Dynamic Booking Engine",
        leadStage: "SALES",
        leadStatus: "ASSIGNED_TO_BDE",
        assignedBdeId: bdeUser._id,
      },
      // CLOSED Stage (WON / LOST)
      {
        tenantId,
        leadNo: "LD-1010",
        fullName: "Rajesh Singhania",
        mobileNo: "9911001122",
        email: "rajesh@singhaniagroup.com",
        businessName: "Singhania Holdings",
        serviceRequirement: "Enterprise BI & Executive Dashboard",
        leadStage: "CLOSED",
        leadStatus: "WON",
        assignedBdeId: bdeUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1011",
        fullName: "Kavita Rao",
        mobileNo: "9922112233",
        email: "kavita@raofashions.in",
        businessName: "Rao Design Studio",
        serviceRequirement: "Fashion Inventory SaaS",
        leadStage: "CLOSED",
        leadStatus: "WON",
        assignedBdeId: bdeUser._id,
      },
      {
        tenantId,
        leadNo: "LD-1012",
        fullName: "Harsh Vardhan",
        mobileNo: "9933223344",
        email: "harsh@vardhanauto.com",
        businessName: "Vardhan Motors",
        serviceRequirement: "Dealership POS Solution",
        leadStage: "CLOSED",
        leadStatus: "LOST",
        assignedBdeId: bdeUser._id,
      },
    ];

    await LeadModel.insertMany(demoLeads);

    // 8. Seed Realistic Demo Projects
    const demoProjects = await ProjectModel.insertMany([
      {
        tenantId,
        ProjectId: "PRJ-2001",
        ProjectName: "FinTech NeoBank Mobile App",
        ClientName: "Rajesh Singhania",
        email: "rajesh@singhaniagroup.com",
        mobileNo: "9911001122",
        ProjectType: "Mobile App (React Native)",
        ProjectDescription: "Modern banking application with biometric auth, cardless ATM cash-outs, and real-time expense insights.",
        ProjectStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ProjectEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        ProjectPriority: "High",
        ProjectStatus: "In Progress",
        AssignedDevelopers: [devUser._id],
        AssignedProjectManager: "Demo Administrator",
        AssignedProjectManagerId: adminUser._id,
      },
      {
        tenantId,
        ProjectId: "PRJ-2002",
        ProjectName: "Shopify Omnichannel Headless Store",
        ClientName: "Kavita Rao",
        email: "kavita@raofashions.in",
        mobileNo: "9922112233",
        ProjectType: "Web Application (Next.js)",
        ProjectDescription: "High-performance headless storefront integrated with Shopify Storefront API and Sanity CMS.",
        ProjectStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        ProjectEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        ProjectPriority: "Medium",
        ProjectStatus: "Assigned",
        AssignedDevelopers: [devUser._id],
        AssignedProjectManager: "Demo Administrator",
        AssignedProjectManagerId: adminUser._id,
      },
      {
        tenantId,
        ProjectId: "PRJ-2003",
        ProjectName: "Healthcare Diagnostic Patient Portal",
        ClientName: "Meera Desai",
        email: "meera@healthplus.org",
        mobileNo: "9850445566",
        ProjectType: "Full Stack CRM & Portal",
        ProjectDescription: "Lab report delivery with WhatsApp automated PDF notifications and doctor tele-consultations.",
        ProjectStartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        ProjectEndDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        ProjectPriority: "High",
        ProjectStatus: "Completed",
        AssignedDevelopers: [devUser._id],
        AssignedProjectManager: "Demo Administrator",
        AssignedProjectManagerId: adminUser._id,
      },
    ]);

    // 9. Seed Developer Activity Timelines
    const p1 = demoProjects[0];
    const p2 = demoProjects[1];

    await TimelineModel.insertMany([
      {
        tenantId,
        addById: devUser._id,
        projectId: p1._id,
        moduleName: "Authentication & Biometrics",
        phase: "Phase 1 - Core Architecture",
        description: "Implemented FaceID and fingerprint token authentication flow with encrypted keystore storage.",
      },
      {
        tenantId,
        addById: devUser._id,
        projectId: p1._id,
        moduleName: "Real-time Transactions WebSocket",
        phase: "Phase 2 - Live Sync",
        description: "Connected balance ledger updates to client socket rooms with automatic reconnect handling.",
      },
      {
        tenantId,
        addById: devUser._id,
        projectId: p2._id,
        moduleName: "Shopify Storefront Cart API",
        phase: "Phase 1 - E-Commerce",
        description: "Built edge-cached cart mutation middleware with optimistic UI updates.",
      },
    ]);

    console.log("✅ Acme Digital Agency (Demo Workspace) seeded successfully!");
    return tenant;
  } catch (error) {
    console.error("❌ Failed to seed demo workspace:", error);
  }
};
