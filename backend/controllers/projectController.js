import mongoose from "mongoose";
import ExcelJS from "exceljs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

import { sendWATextServ } from "../services/whatsappService.js";
import { formatDateTime } from "../services/dateService.js";
import {
  deleteOldFile,
  processFile,
  processAttachment,
  processPrivateUpload,
} from "../services/fileUploadService.js";
import { createBulkNotification } from "../utils/notificationUtil.js";

import ProjectModel from "../models/projectModel.js";
import UserModel from "../models/userModel.js";
import TimelineModel from "../models/timelineModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import OTPModel from "../models/otpModel.js";
import TenantModel from "../models/tenantModel.js";
import { emitToTenant } from "../services/realtime.js";
import ThemeModel from "../models/themeModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import { generateAndSaveOTP, verifyOTP } from "../services/otpService.js";
import { getTenantLimits } from "../middlewares/usageLimitMiddleware.js";
import { buildPortalUrl } from "../services/portalMessageBuilder.js";

// Helper: Mask phone displaying only the last 2 digits
const maskPhoneLast2 = (phone) => {
  if (!phone || typeof phone !== "string") return "********";
  const digits = phone.trim().replace(/\s+/g, "");
  if (digits.length <= 2) return "**";
  const last2 = digits.slice(-2);
  return "*".repeat(Math.max(digits.length - 2, 6)) + last2;
};

/* ===CREATE PROJECT===*/
const createProject = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      ProjectId,
      ProjectName,
      ClientName,
      email,
      mobileNo,
      ProjectType,
      ProjectDescription,
      ProjectStartDate,
      ProjectEndDate,
      ProjectPriority,
      ProjectStatus,
      AssignedProjectManager,
      AssignedDevelopers,
      TechnologyStack,
      EstimatedHours,
      ProjectCost,
      PhaseDetails, // Add PhaseDetails
      whatsappNo,
      gender,
      country,
      state,
      city,
      address,
      AssignedProjectManagerId,
    } = req.body;

    //[ '698afeef749768c3941fade1' ]

    if (!ProjectName?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Project name is required" });

    if (!ClientName?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Client name is required" });

    const tenantId = req.user?.tenantId || req.tenantId;

    const user = await UserModel.findOne({
      _id: userId,
      ...(tenantId ? { tenantId } : {}),
      status: "Active",
    });
    if (!user)
      return res.status(403).json({ success: false, message: "No permission" });

    // Race-safe recount limit check (same pattern as createLead)
    const limits = await getTenantLimits(tenantId);
    if (limits && limits.maxProjects !== -1) {
      const currentProjects = await ProjectModel.countDocuments({ tenantId });
      if (currentProjects >= limits.maxProjects) {
        return res.status(403).json({
          message: `You've reached the maximum of ${limits.maxProjects} projects on your current plan. Please upgrade to add more projects.`,
          success: false,
          limitReached: true,
        });
      }
    }

    // Auto generate ProjectId if not provided (robust, avoids duplicates)
    let finalProjectId = ProjectId;
    if (!finalProjectId) {
      // Find the highest ProjectId number for this tenant
      const lastProject = await ProjectModel.findOne(
        tenantId ? { tenantId } : {},
      )
        .sort({ createdAt: -1 })
        .select("ProjectId")
        .lean();

      let nextNumber = 1;
      if (lastProject && lastProject.ProjectId) {
        const match = lastProject.ProjectId.match(/PRJ-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      finalProjectId = `PRJ-${String(nextNumber).padStart(6, "0")}`;
    }

    let slug = `${ProjectName}-${finalProjectId}`
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const portalKey = crypto.randomBytes(18).toString("base64url");

    const project = new ProjectModel({
      tenantId,
      ProjectId: finalProjectId,
      ProjectName,
      ClientName,
      email,
      mobileNo,
      ProjectType,
      ProjectDescription,
      ProjectStartDate,
      ProjectEndDate,
      ProjectPriority,
      ProjectStatus,
      AssignedProjectManager,
      AssignedDevelopers,
      TechnologyStack,
      EstimatedHours,
      ProjectCost,
      PhaseDetails: PhaseDetails || [], // Add PhaseDetails with fallback
      whatsappNo,
      gender,
      country,
      state,
      city,
      address,
      AssignedProjectManagerId,
      createdBy: userId,
      slug: slug,
      portalKey: portalKey,
      portalVersion: 1,
    });

    //create notification for assign developer
    if (Array.isArray(AssignedDevelopers) && AssignedDevelopers.length > 0) {
      let notifications = AssignedDevelopers.map((dev) => ({
        userId: dev,
        notificationType: "project",
        title: "Project created",
        message: `Admin created project ${ProjectName} and assigned it to you.`,
        redirectUrl: `/project-details?projectId=${project._id}`,
        isRead: false,
      }));

      try {
        await createBulkNotification(notifications);
      } catch (error) {}
    }

    emitToTenant(tenantId, "project:created", {
      projectId: project._id,
      projectName: project.ProjectName,
    });

    await project.save();

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===GET PROJECTS (LIST)===*/
const getProjects = async (req, res) => {
  try {
    let { page = 1, limit = 20, search, status, priority } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    const tenantId = req.user?.tenantId || req.tenantId;
    if (tenantId) filter.tenantId = tenantId;

    const loginUserRole = req.user?.roleId?.roleName;
    const loginUserId = req.user._id;

    // Role-based filtering - only Admin sees all projects, others see only assigned
    if (loginUserRole !== "Admin") {
      filter.$or = [
        { AssignedDevelopers: loginUserId },
        { AssignedProjectManager: loginUserId },
      ];
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { ProjectName: regex },
        { ClientName: regex },
        { ProjectId: regex },
        { email: regex },
        { mobileNo: regex },
      ];
    }

    if (status) filter.ProjectStatus = status;
    if (priority) filter.ProjectPriority = priority;

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      ProjectModel.countDocuments(filter),
      ProjectModel.find(filter)
        .populate("AssignedDevelopers", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===GET PROJECT BY ID===*/
const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.query;
    const loginUserRole = req.user?.roleId?.roleName;
    const loginUserId = req.user._id;
    const tenantId = req.user?.tenantId || req.tenantId;

    const project = await ProjectModel.findOne({
      _id: projectId,
      ...(tenantId ? { tenantId } : {}),
    })
      .populate("AssignedDevelopers", "fullName name email") // Add this line
      .lean();

    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    // Role-based access control - non-admin users can only view their assigned projects
    if (loginUserRole !== "Admin") {
      const isAssigned =
        project.AssignedDevelopers?.some(
          (dev) => dev._id?.toString() === loginUserId.toString(),
        ) ||
        project.AssignedProjectManager?.toString() === loginUserId.toString();

      if (!isAssigned) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You don't have access to this project",
          });
      }
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ===UPDATE PROJECT=== */
const updateProject = async (req, res) => {
  try {
    const { _id, ...payload } = req.body;
    const tenantId = req.user?.tenantId || req.tenantId;

    // Fetch current project for status comparison (scoped to tenant)
    const project = await ProjectModel.findOne({
      _id,
      ...(tenantId ? { tenantId } : {}),
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const oldStatus = project.ProjectStatus;
    const newStatus = payload.ProjectStatus;
    const oldBudget = project.ProjectCost;
    // Only admin or developer can mark project as Completed
    if (newStatus === "Completed") {
      const roleName = req.user?.roleId?.roleName?.toLowerCase() || "";
      if (!roleName.includes("admin") && !roleName.includes("developer")) {
        return res.status(403).json({
          success: false,
          message: "Only Admin or Developer can mark a project as Completed",
        });
      }
    }

    // If status changed, push to statusHistory
    if (newStatus && oldStatus !== newStatus) {
      project.statusHistory.push({
        oldStatus,
        newStatus,
        changedAt: new Date(),
        changedBy: req.user._id,
        budgetAtChange:
          typeof payload.ProjectCost !== "undefined"
            ? payload.ProjectCost
            : oldBudget,
      });
    }

    // Notify newly assigned developers
    const oldAssignees = (project.AssignedDevelopers || []).map((d) =>
      d.toString(),
    );
    const newAssignees = (payload.AssignedDevelopers || []).map((d) =>
      d.toString(),
    );
    const addedAssignees = newAssignees.filter(
      (d) => !oldAssignees.includes(d),
    );

    if (addedAssignees.length > 0) {
      let notifications = addedAssignees.map((dev) => ({
        tenantId: tenantId ? new mongoose.Types.ObjectId(tenantId) : undefined,
        userId: dev,
        notificationType: "project",
        title: "Project assigned",
        message: `Admin added you as a developer to an existing project: ${project.ProjectName}.`,
        redirectUrl: `/project-details?projectId=${project._id}`,
        isRead: false,
      }));
      try {
        await createBulkNotification(notifications);
      } catch (error) {}
    }

    emitToTenant(tenantId, "project:updated", {
      projectId: project._id,
    });

    // Update project fields
    Object.assign(project, payload, { updatedAt: new Date() });
    await project.save();

    res.json({ success: true, message: "Project updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===DELETE PROJECT===*/
const deleteProject = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const deleted = await ProjectModel.findOneAndDelete({
      _id: req.params.id,
      ...(tenantId ? { tenantId } : {}),
    });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    emitToTenant(tenantId, "project:deleted", { projectId: req.params.id });

    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===BULK DELETE===*/
const deleteManyProjects = async (req, res) => {
  try {
    const { ids } = req.body;
    const tenantId = req.user?.tenantId || req.tenantId;
    const result = await ProjectModel.deleteMany({
      _id: { $in: ids },
      ...(tenantId ? { tenantId } : {}),
    });

    emitToTenant(tenantId, "project:deleted", { projectIds: ids });

    res.json({
      success: true,
      message: `${result.deletedCount} project(s) deleted`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===EXPORT PROJECTS TO EXCEL===*/

const exportProjects = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const data = await ProjectModel.find(tenantId ? { tenantId } : {})
      .populate("AssignedDevelopers", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Projects");

    sheet.columns = [
      { header: "Project ID", key: "ProjectId", width: 15 },
      { header: "Project Name", key: "ProjectName", width: 25 },
      { header: "Client", key: "ClientName", width: 25 },
      { header: "Mobile", key: "mobileNo", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Type", key: "ProjectType", width: 20 },
      { header: "Priority", key: "ProjectPriority", width: 15 },
      { header: "Status", key: "ProjectStatus", width: 20 },
      { header: "Manager", key: "AssignedProjectManager", width: 20 },
      { header: "Developers", key: "AssignedDevelopers", width: 30 },
      { header: "Cost", key: "ProjectCost", width: 15 },
      { header: "Start Date", key: "ProjectStartDate", width: 25 },
      { header: "End Date", key: "ProjectEndDate", width: 25 },
    ];

    data.forEach((p) => {
      sheet.addRow({
        ...p,
        AssignedDevelopers: Array.isArray(p.AssignedDevelopers)
          ? p.AssignedDevelopers.map((dev) => dev?.fullName || dev).join(", ")
          : "",
        ProjectStartDate: formatDateTime(p.createdAt),
        ProjectEndDate: formatDateTime(p.ProjectEndDate),
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=Projects.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===CREATE TIMELINE POST FOR PROJECT=== */
const createTimelinePost = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;
    const tenantId = req.user?.tenantId || req.tenantId;
    const { moduleName, description, phase } = req.body;

    if (!moduleName?.trim() || !description?.trim() || !phase?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Module name, description, and phase are required",
      });
    }

    // Check if project exists (scoped to tenant)
    const project = await ProjectModel.findOne({
      _id: projectId,
      ...(tenantId ? { tenantId } : {}),
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Process uploaded files
    let attachments = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileDoc = await processPrivateUpload(file, {
          tenantId,
          projectId,
          uploadedBy: userId,
          fileCategory: "timeline",
        });
        if (fileDoc) {
          attachments.push(`/files/${fileDoc.fileId}`);
        }
      }
    }

    const timeline = new TimelineModel({
      tenantId,
      addById: userId,
      moduleName,
      phase,
      description,
      attachements: attachments,
      projectId,
    });

    await timeline.save();

    // Notify dashboards so leaderboard refreshes live
    emitToTenant(tenantId, "leaderboard:updated", { projectId });

    res.status(201).json({
      success: true,
      message: "Successfully create post.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===GET TIMELINE POSTS FOR PROJECT=== */
const getProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tenantId = req.user?.tenantId || req.tenantId;
    // Check if project exists (scoped to tenant)
    const project = await ProjectModel.findOne({
      _id: projectId,
      ...(tenantId ? { tenantId } : {}),
    });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    const timeline = await TimelineModel.find({
      projectId,
      ...(tenantId ? { tenantId } : {}),
    })
      .populate({
        path: "addById",
        select: "fullName name email",
        populate: { path: "roleId", select: "roleName" },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===UPDATE TIMELINE POST FOR PROJECT=== */
const updateTimelinePost = async (req, res) => {
  try {
    const { projectId, timelineId } = req.params;
    const userId = req.user._id;
    const tenantId = req.user?.tenantId || req.tenantId;
    const { moduleName, description, attachements = [], phase } = req.body;

    if (!moduleName?.trim() || !description?.trim() || !phase?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Module name, description, and phase are required",
      });
    }

    const timeline = await TimelineModel.findOne({
      _id: timelineId,
      projectId,
      ...(tenantId ? { tenantId } : {}),
    });
    if (!timeline) {
      return res
        .status(404)
        .json({ success: false, message: "Timeline post not found" });
    }

    if (String(timeline.addById) !== String(userId)) {
      return res.status(403).json({ success: false, message: "No permission" });
    }

    timeline.moduleName = moduleName;
    timeline.phase = phase;
    timeline.description = description;
    timeline.attachements = attachements;
    await timeline.save();

    res.json({
      success: true,
      message: "Timeline post updated",
      data: timeline,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===DELETE TIMELINE POST FOR PROJECT=== */
const deleteTimelinePost = async (req, res) => {
  try {
    const { projectId, timelineId } = req.params;
    const userId = req.user._id;
    const tenantId = req.user?.tenantId || req.tenantId;
    const timeline = await TimelineModel.findOne({
      _id: timelineId,
      projectId,
      ...(tenantId ? { tenantId } : {}),
    });
    if (!timeline) {
      return res
        .status(404)
        .json({ success: false, message: "Timeline post not found" });
    }

    if (String(timeline.addById) !== String(userId)) {
      return res.status(403).json({ success: false, message: "No permission" });
    }

    const isDelete = await TimelineModel.deleteOne({
      _id: timelineId,
      ...(tenantId ? { tenantId } : {}),
    });
    if (isDelete.deletedCount === 0) {
      return res
        .status(400)
        .json({ message: "Failed to delete post.", success: false });
    }

    //delete file from store
    const attachements = timeline.attachements;
    if (attachements.length > 0) {
      attachements.forEach((item) => {
        deleteOldFile(item);
      });
    }

    // Notify dashboards so leaderboard refreshes live
    emitToTenant(tenantId, "leaderboard:updated", { projectId });

    return res.json({ success: true, message: "Timeline post deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Public Project Lookup for Portal (Returns ONLY minimal whitelisted info) ──
const lookupPortalProject = async (req, res) => {
  try {
    const identifier = (
      req.query?.identifier ||
      req.query?.slug ||
      req.query?.portalKey ||
      ""
    ).trim();

    if (!identifier) {
      return res
        .status(400)
        .json({ success: false, message: "Project identifier is required." });
    }

    // Dual-lookup: check portalKey first; if legacy slug, allow only if enabled
    let project = await ProjectModel.findOne({ portalKey: identifier }).lean();
    if (!project) {
      const legacyProject = await ProjectModel.findOne({ slug: identifier }).lean();
      if (legacyProject && process.env.PORTAL_LEGACY_SLUG_ENABLED === "true") {
        project = legacyProject;
      }
    }

    // Unknown portal key and disabled legacy slug produce identical response
    if (!project) {
      return res.status(400).json({
        success: false,
        message: "This link is no longer valid. Please ask your agency for a new link.",
      });
    }

    const targetPhone = project.whatsappNo?.trim() || project.mobileNo?.trim();
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: "No contact phone number is registered for this project.",
      });
    }

    const tenant = await TenantModel.findById(project.tenantId)
      .select("companyName settings")
      .lean();
    const theme = await ThemeModel.findOne({ tenantId: project.tenantId })
      .select("mainTheme")
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        projectId: project._id,
        projectName: project.ProjectName,
        tenant: {
          companyName: tenant?.settings?.projectName || tenant?.companyName || "Organization",
          logo: tenant?.settings?.logo || null,
          primaryColor: theme?.mainTheme?.primaryColor || "#1e3a5f",
        },
        maskedPhone: maskPhoneLast2(targetPhone),
        otpRequired: true,
        portalKey: project.portalKey || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Project By Slug / PortalKey (Whitelisted DTO, Protected by verifyPortalSession) ──
const getProjectBySlug = async (req, res) => {
  try {
    const project =
      req.project ||
      (await ProjectModel.findOne({
        $or: [{ portalKey: req.query?.slug }, { slug: req.query?.slug }],
      }).lean());

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const targetPhone = project.whatsappNo?.trim() || project.mobileNo?.trim();

    // Whitelisted DTO: No tenantId, createdBy, updatedBy, statusHistory, staff emails/roles, address, raw phone, ProjectCost, EstimatedHours, or ProjectPriority
    const projectDTO = {
      _id: project._id,
      ProjectId: project.ProjectId,
      ProjectName: project.ProjectName,
      ClientName: project.ClientName,
      ProjectType: project.ProjectType,
      description: project.ProjectDescription || "", // Canonical name: description
      ProjectStartDate: project.ProjectStartDate,
      ProjectEndDate: project.ProjectEndDate,
      ProjectStatus: project.ProjectStatus,
      TechnologyStack: project.TechnologyStack,
      PhaseDetails: (project.PhaseDetails || []).map((p) => ({
        _id: p._id,
        PhaseName: p.PhaseName,
        description: p.PhaseDescription || "", // Canonical name: description
        PhaseDays: p.PhaseDays,
        PhaseStatus: p.PhaseStatus,
        PhaseStartDate: p.PhaseStartDate,
        PhaseEndDate: p.PhaseEndDate,
      })),
      maskedPhone: maskPhoneLast2(targetPhone),
      portalKey: project.portalKey || null,
    };

    return res.status(200).json({ success: true, data: projectDTO });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Timeline By Slug / PortalKey (Whitelisted DTO, Protected by verifyPortalSession) ──
const getTimelineBySlug = async (req, res) => {
  try {
    const project =
      req.project ||
      (await ProjectModel.findOne({
        $or: [{ portalKey: req.query?.slug }, { slug: req.query?.slug }],
      }));

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const rawTimeline = await TimelineModel.find({ projectId: project._id })
      .populate({
        path: "addById",
        select: "fullName",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Whitelisted DTO: canonical description, attachments, phase, module, dates, and author fullName only
    const timelineDTO = rawTimeline.map((item) => {
      const authorObj = item.addById
        ? {
            fullName: item.addById.fullName || "",
          }
        : null;

      const attachmentList = item.attachments || item.attachements || [];

      return {
        _id: item._id,
        moduleName: item.moduleName || "",
        phase: item.phase || "",
        description: item.description || "",
        attachments: attachmentList,
        author: authorObj,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return res.status(200).json({
      message: "Successfully get timeline",
      success: true,
      data: timelineDTO,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Staff Action: Regenerate Portal Link (Rotates portalKey & increments portalVersion) ──
const regeneratePortalLink = async (req, res) => {
  try {
    const { projectId } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project ID is required." });
    }

    const project = await ProjectModel.findOne({ _id: projectId, tenantId });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    const newPortalKey = crypto.randomBytes(18).toString("base64url");
    const newVersion = (project.portalVersion || 1) + 1;

    project.portalKey = newPortalKey;
    project.portalVersion = newVersion;
    await project.save();

    return res.status(200).json({
      success: true,
      message: "Portal link successfully regenerated. Previous sessions invalidated.",
      portalKey: newPortalKey,
      portalVersion: newVersion,
      portalUrl: buildPortalUrl(newPortalKey),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//get project status report
const getProjectStatusReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;
    const tenantId = req.user?.tenantId || req.tenantId;

    let { fromDate, toDate } = req.query;

    let filter = {};
    if (tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    // Add role-based filtering - only Admin sees all projects
    if (loginUserRole !== "Admin") {
      // Non-admin users can only see projects they're assigned to
      filter.$or = [
        { AssignedProjectManager: loginUserId },
        { AssignedDevelopers: loginUserId },
      ];
    }

    if (fromDate && toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        filter.createdAt.$lte = adjustedDate;
      }
    }

    let projectStats = await ProjectModel.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $group: {
          _id: null,
          Total: { $sum: 1 },
          Created: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "Created"] }, 1, 0],
            },
          },
          CreatedBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "Created"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          Assigned: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "Assigned"] }, 1, 0],
            },
          },
          AssignedBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "Assigned"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          Hold: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "Hold"] }, 1, 0],
            },
          },
          HoldBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "Hold"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          InProgress: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "In Progress"] }, 1, 0],
            },
          },
          InProgressBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "In Progress"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          Testing: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "Testing"] }, 1, 0],
            },
          },
          TestingBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "Testing"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          ClientReview: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "Client Review"] }, 1, 0],
            },
          },
          ClientReviewBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "Client Review"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          Completed: {
            $sum: {
              $cond: [{ $eq: ["$ProjectStatus", "Completed"] }, 1, 0],
            },
          },
          CompletedBudget: {
            $sum: {
              $cond: [
                { $eq: ["$ProjectStatus", "Completed"] },
                { $ifNull: ["$ProjectCost", 0] },
                0,
              ],
            },
          },
          TotalBudget: { $sum: { $ifNull: ["$ProjectCost", 0] } },
        },
      },
    ]);

    let result = projectStats[0] || {};

    let data = {
      total: result.Total || 0,
      created: result.Created || 0,
      createdBudget: result.CreatedBudget || 0,
      assigned: result.Assigned || 0,
      assignedBudget: result.AssignedBudget || 0,
      hold: result.Hold || 0,
      holdBudget: result.HoldBudget || 0,
      inProgress: result.InProgress || 0,
      inProgressBudget: result.InProgressBudget || 0,
      testing: result.Testing || 0,
      testingBudget: result.TestingBudget || 0,
      clientReview: result.ClientReview || 0,
      clientReviewBudget: result.ClientReviewBudget || 0,
      completed: result.Completed || 0,
      completedBudget: result.CompletedBudget || 0,
      totalBudget: result.TotalBudget || 0,
    };

    return res
      .status(200)
      .json({ message: "Successfully get report", success: true, data: data });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//export project status report
const exportProjectStatusReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;
    const tenantId = req.user?.tenantId || req.tenantId;

    let { fromDate, toDate } = req.query;

    let filter = {};
    if (tenantId) {
      filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    if (loginUserRole === "Developer") {
      filter.AssignedDevelopers = loginUserId;
    }

    if (fromDate && toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }

      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        filter.createdAt.$lte = adjustedDate;
      }
    }

    let projectStats = await ProjectModel.aggregate([
      {
        $match: {
          ...filter,
        },
      },
      {
        $group: {
          _id: null,
          Total: { $sum: 1 },
          Created: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "Created"],
                },
                1,
                0,
              ],
            },
          },

          Assigned: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "Assigned"],
                },
                1,
                0,
              ],
            },
          },

          Hold: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "Hold"],
                },
                1,
                0,
              ],
            },
          },

          InProgress: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "In Progress"],
                },
                1,
                0,
              ],
            },
          },

          Testing: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "Testing"],
                },
                1,
                0,
              ],
            },
          },

          ClientReview: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "Client Review"],
                },
                1,
                0,
              ],
            },
          },

          Completed: {
            $sum: {
              $cond: [
                {
                  $eq: ["$ProjectStatus", "Completed"],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    let result = projectStats[0] || {};

    let data = {
      total: result.Total || 0,
      created: result.Created || 0,
      assigned: result.Assigned || 0,
      hold: result.Hold || 0,
      inProgress: result.InProgress || 0,
      testing: result.Testing || 0,
      clientReview: result.ClientReview || 0,
      completed: result.Completed || 0,
    };

    //create excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Project_Status_Report");

    worksheet.columns = [
      { header: "Status", key: "status", width: 25 },
      { header: "Count", key: "count", width: 15 },
    ];

    worksheet.addRow({
      status: "Total Project",
      count: data.total,
    });

    worksheet.addRow({
      status: "Craated",
      count: data.created || 0,
    });

    worksheet.addRow({
      status: "Assigned",
      count: data.assigned || 0,
    });

    worksheet.addRow({
      status: "Hold",
      count: data.hold || 0,
    });

    worksheet.addRow({
      status: "In Progress",
      count: data.inProgress || 0,
    });

    worksheet.addRow({
      status: "Testing",
      count: data.testing || 0,
    });

    worksheet.addRow({
      status: "Client Review",
      count: data.clientReview || 0,
    });

    worksheet.addRow({
      status: "Completed",
      count: data.completed || 0,
    });

    res.attachment("Project_Status_Report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ── Send WhatsApp OTP for Portal Access ───────────────────────────────────────
const sendWhatsappOtp = async (req, res) => {
  try {
    const identifier = (
      req.body?.identifier ||
      req.body?.slug ||
      req.body?.portalKey ||
      ""
    ).trim();

    if (!identifier) {
      return res
        .status(400)
        .json({ success: false, message: "Project identifier is required." });
    }

    // Dual-lookup: check portalKey first; if legacy slug, allow only if enabled
    let project = await ProjectModel.findOne({ portalKey: identifier });
    if (!project) {
      const legacyProject = await ProjectModel.findOne({ slug: identifier });
      if (legacyProject && process.env.PORTAL_LEGACY_SLUG_ENABLED === "true") {
        project = legacyProject;
      }
    }

    // Unknown portal key and disabled legacy slug produce identical response
    if (!project) {
      return res.status(400).json({
        success: false,
        message: "This link is no longer valid. Please ask your agency for a new link.",
      });
    }

    // WhatsApp plan check: confirm the real field name in seedDatabase.js and fail CLOSED (require === true)
    const tenant = await TenantModel.findById(project.tenantId).populate("planId").lean();
    if (tenant?.planId?.limits?.whatsappEnabled !== true) {
      return res.status(403).json({
        success: false,
        message: "WhatsApp messaging is not included in the current subscription plan.",
      });
    }

    const waCred = await WhatsappCredModel.findOne({ tenantId: project.tenantId }).lean();
    if (!waCred || !waCred.token || !waCred.instanceId) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp service is not configured for this organization.",
      });
    }

    // Determine target phone: whatsappNo takes precedence, fallback to mobileNo
    const targetPhone = project.whatsappNo?.trim() || project.mobileNo?.trim();
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: "No contact phone number is registered for this project.",
      });
    }

    const subject = `${project._id}:${targetPhone}`;
    const purpose = "portal_access";

    // Enforce cooldown and hourly/daily send caps via otpService
    const otpResult = await generateAndSaveOTP({
      subject,
      purpose,
      tenantId: project.tenantId,
    });

    if (!otpResult.success) {
      return res.status(429).json({
        success: false,
        message: otpResult.message,
      });
    }

    const softwareSetting = await SoftwareSettingModel.findOne({
      tenantId: project.tenantId,
    });
    const projectName = softwareSetting?.projectName || "Clientmark";
    const message = `${otpResult.plainOtp} is your verification code to view project details on ${projectName}.\nValid for 10 minutes. Do not share.`;

    // Send OTP to targetPhone using the project's own tenant credentials
    const sendResult = await sendWATextServ(targetPhone, message, project.tenantId);
    if (!sendResult || sendResult.success === false) {
      return res.status(400).json({
        success: false,
        message:
          sendResult?.message ||
          "Failed to send WhatsApp message. Please verify WhatsApp credentials.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent to registered WhatsApp number.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Verify WhatsApp OTP for Portal Access ─────────────────────────────────────
const verifyWhatsappOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const identifier = (
      req.body?.identifier ||
      req.body?.slug ||
      req.body?.portalKey ||
      ""
    ).trim();

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: "Project identifier and OTP are required.",
      });
    }

    let project = await ProjectModel.findOne({ portalKey: identifier });
    if (!project) {
      const legacyProject = await ProjectModel.findOne({ slug: identifier });
      if (legacyProject && process.env.PORTAL_LEGACY_SLUG_ENABLED === "true") {
        project = legacyProject;
      }
    }

    // Unknown portal key and disabled legacy slug produce identical response
    if (!project) {
      return res.status(400).json({
        success: false,
        message: "This link is no longer valid. Please ask your agency for a new link.",
      });
    }

    const targetPhone = project.whatsappNo?.trim() || project.mobileNo?.trim();
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: "No contact phone number registered for this project.",
      });
    }

    const subject = `${project._id}:${targetPhone}`;
    const purpose = "portal_access";

    const verifyResult = await verifyOTP({
      subject,
      purpose,
      otp: otp.toString().trim(),
    });

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        locked: verifyResult.locked || false,
        message: verifyResult.message,
      });
    }

    // Issue signed 12-hour portal JWT bound to project and current portalVersion
    const portalToken = jwt.sign(
      {
        purpose: "portal",
        projectId: project._id,
        tenantId: project.tenantId,
        portalVersion: project.portalVersion || 1,
      },
      process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || "fallback_portal_secret",
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      success: true,
      message: "Access granted",
      portalToken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ===GET BUDGET TIMELINE FROM STATUS HISTORY=== */
const getBudgetTimeline = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserId = loginUser._id;
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant information missing." });
    }

    let { fromDate, toDate } = req.query;

    let filter = { tenantId };

    // Decide project visibility by permission code (not hardcoded role name)
    const permissions = loginUser?.roleId?.permissions || [];
    const canViewAllProjects =
      permissions.includes("view:project-master") ||
      permissions.includes("view:project-status-report");

    if (!canViewAllProjects) {
      filter.$or = [
        { AssignedDevelopers: loginUserId },
        { AssignedProjectManager: loginUserId },
      ];
    }

    if (fromDate && toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        let adjustedDate = new Date(toDate);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        filter.createdAt.$lte = adjustedDate;
      }
    }

    // Fetch all projects with their statusHistory
    const projects = await ProjectModel.find(filter)
      .select(
        "ProjectId ProjectName ProjectCost ProjectStatus statusHistory createdAt",
      )
      .lean();

    if (!projects || projects.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No projects found",
        data: [],
      });
    }

    // Build timeline data from statusHistory
    let timelineMap = new Map();

    projects.forEach((project) => {
      // Add initial creation entry
      const createdDate = new Date(project.createdAt);
      const createdKey = formatDateKey(createdDate);

      if (!timelineMap.has(createdKey)) {
        timelineMap.set(createdKey, {
          date: createdKey,
          timestamp: createdDate.getTime(),
          Created: 0,
          Assigned: 0,
          Hold: 0,
          InProgress: 0,
          Testing: 0,
          ClientReview: 0,
          Completed: 0,
        });
      }

      const createdEntry = timelineMap.get(createdKey);
      const initialStatus = project.ProjectStatus || "Created";
      const statusKey = mapStatusToKey(initialStatus);
      createdEntry[statusKey] += project.ProjectCost || 0;

      // Process statusHistory
      if (project.statusHistory && project.statusHistory.length > 0) {
        project.statusHistory.forEach((history) => {
          const changeDate = new Date(history.changedAt);
          const dateKey = formatDateKey(changeDate);

          if (!timelineMap.has(dateKey)) {
            timelineMap.set(dateKey, {
              date: dateKey,
              timestamp: changeDate.getTime(),
              Created: 0,
              Assigned: 0,
              Hold: 0,
              InProgress: 0,
              Testing: 0,
              ClientReview: 0,
              Completed: 0,
            });
          }

          const entry = timelineMap.get(dateKey);

          // Subtract budget from old status
          const oldStatusKey = mapStatusToKey(history.oldStatus);
          entry[oldStatusKey] -= history.budgetAtChange || 0;

          // Add budget to new status
          const newStatusKey = mapStatusToKey(history.newStatus);
          entry[newStatusKey] += history.budgetAtChange || 0;
        });
      }
    });

    // Convert map to array and sort by timestamp
    let timelineArray = Array.from(timelineMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Calculate cumulative budgets (running totals)
    let cumulative = {
      Created: 0,
      Assigned: 0,
      Hold: 0,
      InProgress: 0,
      Testing: 0,
      ClientReview: 0,
      Completed: 0,
    };

    timelineArray = timelineArray.map((entry) => {
      cumulative.Created += entry.Created;
      cumulative.Assigned += entry.Assigned;
      cumulative.Hold += entry.Hold;
      cumulative.InProgress += entry.InProgress;
      cumulative.Testing += entry.Testing;
      cumulative.ClientReview += entry.ClientReview;
      cumulative.Completed += entry.Completed;

      return {
        date: entry.date,
        Created: Math.max(0, cumulative.Created),
        Assigned: Math.max(0, cumulative.Assigned),
        Hold: Math.max(0, cumulative.Hold),
        InProgress: Math.max(0, cumulative.InProgress),
        Testing: Math.max(0, cumulative.Testing),
        ClientReview: Math.max(0, cumulative.ClientReview),
        Completed: Math.max(0, cumulative.Completed),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Budget timeline fetched successfully",
      data: timelineArray,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to format date as "MMM YYYY" or "DD MMM YYYY"
function formatDateKey(date) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return date.toLocaleDateString("en-GB", options);
}

// Helper function to map status to chart key
function mapStatusToKey(status) {
  const statusMap = {
    Created: "Created",
    Assigned: "Assigned",
    Hold: "Hold",
    "In Progress": "InProgress",
    Testing: "Testing",
    "Client Review": "ClientReview",
    Completed: "Completed",
  };
  return statusMap[status] || "Created";
}

/* ===SEARCH CLIENTS BY NAME OR MOBILE=== */
const searchClients = async (req, res) => {
  try {
    const { search } = req.query;
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!search || search.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const regex = new RegExp(search, "i");

    // Aggregate to get unique clients based on mobileNo (scoped to tenant)
    const clients = await ProjectModel.aggregate([
      {
        $match: {
          ...(tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {}),
          $or: [{ ClientName: regex }, { mobileNo: regex }, { email: regex }],
        },
      },
      {
        $sort: { createdAt: -1 }, // Most recent first
      },
      {
        $group: {
          _id: "$mobileNo", // Group by mobile number (unique identifier)
          ClientName: { $first: "$ClientName" },
          mobileNo: { $first: "$mobileNo" },
          whatsappNo: { $first: "$whatsappNo" },
          email: { $first: "$email" },
          gender: { $first: "$gender" },
          country: { $first: "$country" },
          state: { $first: "$state" },
          city: { $first: "$city" },
          address: { $first: "$address" },
          projectCount: { $sum: 1 }, // Count projects for this client
        },
      },
      {
        $limit: 10, // Return max 10 results
      },
    ]);

    return res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===GET CLIENT DETAILS BY MOBILE NUMBER=== */
const getClientByMobile = async (req, res) => {
  try {
    const { mobileNo } = req.query;
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!mobileNo || mobileNo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    // Find the most recent project for this client (scoped to tenant)
    const client = await ProjectModel.findOne({
      mobileNo,
      ...(tenantId ? { tenantId } : {}),
    })
      .sort({ createdAt: -1 })
      .select(
        "ClientName mobileNo whatsappNo email gender country state city address",
      )
      .lean();

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Count total projects for this client
    const projectCount = await ProjectModel.countDocuments({
      mobileNo,
      ...(tenantId ? { tenantId } : {}),
    });

    return res.status(200).json({
      success: true,
      data: {
        ...client,
        projectCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===EXPORTS=== */
export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  deleteManyProjects,
  exportProjects,
  createTimelinePost,
  getProjectTimeline,
  updateTimelinePost,
  deleteTimelinePost,
  getProjectBySlug,
  getTimelineBySlug,
  getProjectStatusReport,
  exportProjectStatusReport,
  sendWhatsappOtp,
  verifyWhatsappOtp,
  getBudgetTimeline,
  searchClients,
  getClientByMobile,
  lookupPortalProject,
  regeneratePortalLink,
};
