import mongoose from "mongoose";
import ExcelJS from "exceljs";
import crypto from "crypto";

import { sendWATextServ } from "../services/whatsappService.js";
import { formatDateTime } from "../services/dateService.js";
import {
  deleteOldFile,
  processFile,
  processAttachment,
} from "../services/fileUploadService.js";
import { createBulkNotification } from "../utils/notificationUtil.js";

import ProjectModel from "../models/projectModel.js";
import UserModel from "../models/userModel.js";
import TimelineModel from "../models/timelineModel.js";
import SoftwareSettingModel from "../models/softwareSettingModel.js";
import OTPModel from "../models/otpModel.js";

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

    const user = await UserModel.findOne({ _id: userId, status: "Active" });
    if (!user)
      return res.status(403).json({ success: false, message: "No permission" });

    // Auto generate ProjectId if not provided (robust, avoids duplicates)
    let finalProjectId = ProjectId;
    if (!finalProjectId) {
      // Find the highest ProjectId number
      const lastProject = await ProjectModel.findOne({})
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

    const tenantId = req.user?.tenantId || req.tenantId;

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

    const io = req.app.get("io");
    io.emit("create-project");

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

    const project = await ProjectModel.findOne({ _id: projectId })
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

    // Fetch current project for status comparison
    const project = await ProjectModel.findById(_id);
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

    const io = req.app.get("io");
    if (io) {
      io.emit("get-project");
      io.emit("create-project"); // also refreshes project list
    }

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
    const deleted = await ProjectModel.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    const io = req.app.get("io");
    if (io) io.emit("create-project"); // refresh project lists & dashboards

    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===BULK DELETE===*/
const deleteManyProjects = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await ProjectModel.deleteMany({ _id: { $in: ids } });

    const io = req.app.get("io");
    if (io) io.emit("create-project"); // refresh project lists & dashboards

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
    const data = await ProjectModel.find()
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
    const { moduleName, description, phase } = req.body;

    if (!moduleName?.trim() || !description?.trim() || !phase?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Module name, description, and phase are required",
      });
    }

    // Check if project exists
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Process uploaded files
    let attachments = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = await processAttachment(file, "timeline");
        if (filePath) attachments.push(filePath);
      }
    }

    const timeline = new TimelineModel({
      addById: userId,
      moduleName,
      phase,
      description,
      attachements: attachments,
      projectId,
    });

    await timeline.save();

    // Notify dashboards so leaderboard refreshes live
    const io = req.app.get("io");
    if (io) io.emit("update-leaderboard");

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
    // Optionally, check if project exists
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    const timeline = await TimelineModel.find({ projectId })
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
    const timeline = await TimelineModel.findOne({
      _id: timelineId,
      projectId,
    });
    if (!timeline) {
      return res
        .status(404)
        .json({ success: false, message: "Timeline post not found" });
    }

    if (String(timeline.addById) !== String(userId)) {
      return res.status(403).json({ success: false, message: "No permission" });
    }

    const isDelete = await TimelineModel.deleteOne({ _id: timelineId });
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
    const io = req.app.get("io");
    if (io) io.emit("update-leaderboard");

    return res.json({ success: true, message: "Timeline post deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//get project by slug
const getProjectBySlug = async (req, res) => {
  try {
    const { slug } = req.query;
    const project = await ProjectModel.findOne({ slug: slug })
      .populate("AssignedDevelopers", "fullName name email") // Add this line
      .lean();

    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//get timeline by slug
const getTimelineBySlug = async (req, res) => {
  try {
    const { slug } = req.query;
    // Optionally, check if project exists
    const project = await ProjectModel.findOne({ slug: slug });
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }
    const timeline = await TimelineModel.find({ projectId: project._id })
      .populate({
        path: "addById",
        select: "fullName name email",
        populate: { path: "roleId", select: "roleName" },
      })
      .sort({ createdAt: -1 });
    return res.json({
      message: "Successfully get timeline",
      success: true,
      data: timeline,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//get project status report
const getProjectStatusReport = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;

    let { fromDate, toDate } = req.query;

    let filter = {};

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

    let { fromDate, toDate } = req.query;

    let filter = {};

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

//send whatsapp otp for project view
const sendWhatsappOtp = async (req, res) => {
  try {
    const { mobileNo, slug } = req.body;

    if (!mobileNo || mobileNo?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Mobile number is missing.", success: false });
    }

    if (!slug || slug?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Slug is missing.", success: false });
    }

    //check  project detail exist or not
    const [isExist, softwareSetting] = await Promise.all([
      ProjectModel.findOne({
        slug: slug,
        mobileNo: mobileNo,
      }),
      SoftwareSettingModel.findOne(),
    ]);

    if (!isExist) {
      return res.status(400).json({
        message: "Mobile number not linked or project not found.",
        success: false,
      });
    }

    //check number of attempt
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let noOfAttempt = await OTPModel.countDocuments({
      userName: mobileNo,
      createdAt: { $gte: oneHourAgo },
    });

    if (noOfAttempt >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Try again after 1 hour.",
      });
    }

    const PROJECT_NAME =
      softwareSetting?.projectName || process.env.PROJECT_NAME;
    const otp = crypto.randomInt(1000, 9999).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    let message = `${otp} is your OTP for view project detail on ${PROJECT_NAME}.\nOTP valid for 10 Minute. Please do not share`;

    //send otp-message to whatsapp
    const isSendMsg = await sendWATextServ(mobileNo, message);
    if (isSendMsg.success == false) {
      return res.status(400).json({
        success: false,
        message: "Failed to send OTP.",
      });
    }

    //save otp in collection
    const newOtp = new OTPModel({
      userName: mobileNo,
      otp,
      expiry,
    });

    await newOtp.save();

    return res
      .status(200)
      .json({ message: "OTP send to whatsapp.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

//verify whatsapp otp for project view
const verifyWhatsappOtp = async (req, res) => {
  try {
    const { mobileNo, otp, slug } = req.body;

    if (!mobileNo || mobileNo?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Mobile number is missing.", success: false });
    }

    if (!slug || slug?.trim() === "") {
      return res
        .status(400)
        .json({ message: "Slug is missing.", success: false });
    }

    if (!otp || otp.length != 4) {
      return res.status(400).json({ message: "Invalid otp", success: false });
    }

    //verity otp
    const record = await OTPModel.findOne({ userName: mobileNo, otp: otp });
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

    //delete final
    await OTPModel.deleteMany({ userName: mobileNo });

    return res.status(200).json({ message: "OTP Verified.", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

/* ===GET BUDGET TIMELINE FROM STATUS HISTORY=== */
const getBudgetTimeline = async (req, res) => {
  try {
    const loginUser = req.user;
    const loginUserRole = loginUser.roleId.roleName;
    const loginUserId = loginUser._id;

    let { fromDate, toDate } = req.query;

    let filter = {};

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

    if (!search || search.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const regex = new RegExp(search, "i");

    // Aggregate to get unique clients based on mobileNo
    const clients = await ProjectModel.aggregate([
      {
        $match: {
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

    if (!mobileNo || mobileNo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    // Find the most recent project for this client
    const client = await ProjectModel.findOne({ mobileNo })
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
    const projectCount = await ProjectModel.countDocuments({ mobileNo });

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
};
