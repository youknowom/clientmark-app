import express from "express";
import {
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
} from "../controllers/projectController.js";

import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import { checkProjectLimit } from "../middlewares/usageLimitMiddleware.js";
import {
  getWhatsappCred,
  sendLinkToClient,
  updateWhatsappCred,
} from "../controllers/whatsappCredController.js";
import { upload } from "../services/fileUploadService.js";
import { sendBulkToDevs } from "../workers/scheduledNotifications.js";

const projectRouter = express.Router();

projectRouter.get("/export-projects", authUser, exportProjects); // Export projects to excel

projectRouter.delete("/delete-many-projects", authUser, deleteManyProjects); // Delete many projects

projectRouter.post("/create-project", authUser, checkProjectLimit, createProject); // Create new project

projectRouter.get(
  "/get-projects",
  authUser,
  authAccess("view:project"),
  getProjects,
); // Get all projects (with pagination, search, filters)

projectRouter.get("/get-project", authUser, getProjectById); // Get single project by ID (expects ID as query param)

projectRouter.put("/update-project", authUser, updateProject); // Update project

projectRouter.delete("/delete-project/:id", authUser, deleteProject); // Delete project

// Timeline (progress post) routes for a project
projectRouter.post(
  "/:projectId/timeline",
  authUser,
  upload.array("attachments", 2),
  createTimelinePost,
);
projectRouter.get("/:projectId/timeline", authUser, getProjectTimeline);
projectRouter.put(
  "/:projectId/timeline/:timelineId",
  authUser,
  updateTimelinePost,
);
projectRouter.delete(
  "/:projectId/timeline/:timelineId",
  authUser,
  deleteTimelinePost,
);

projectRouter.get("/get-project-by-slug", getProjectBySlug); //get project by slug

projectRouter.get("/get-timeline-by-slug", getTimelineBySlug); //get time line by slug

projectRouter.get(
  "/get-project-status-report",
  authUser,
  authAccess("view:project-status-report"),
  getProjectStatusReport,
); //get project status report

projectRouter.get(
  "/export-project-status-report",
  authUser,
  authAccess("view:project-status-report"),
  exportProjectStatusReport,
); //export project status report

projectRouter.post("/send-whatsapp-otp", sendWhatsappOtp); //send whatsapp otp to view project detail

projectRouter.post("/verify-whatsapp-otp", verifyWhatsappOtp); //verify otp for view details

// WhatsApp
projectRouter.get(
  "/get-whatsapp-cred",
  authUser,
  authAccess("view:whatsapp-setting"),
  getWhatsappCred,
);
projectRouter.put(
  "/update-whatsapp-cred",
  authUser,
  authAccess("view:whatsapp-setting"),
  updateWhatsappCred,
);
projectRouter.post("/send-link-to-client", authUser, sendLinkToClient);

projectRouter.get("/search-clients", authUser, searchClients);
projectRouter.get("/get-client-by-mobile", authUser, getClientByMobile);

export default projectRouter;
