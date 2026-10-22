import express from "express";
import rateLimit from "express-rate-limit";
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
  lookupPortalProject,
  regeneratePortalLink,
} from "../controllers/projectController.js";

import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import { verifyPortalSession } from "../middlewares/portalAuthMiddleware.js";
import { checkProjectLimit } from "../middlewares/usageLimitMiddleware.js";
import {
  getWhatsappCred,
  sendLinkToClient,
  updateWhatsappCred,
} from "../controllers/whatsappCredController.js";
import { upload } from "../services/fileUploadService.js";

const projectRouter = express.Router();

const portalOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests from this IP. Please try again later." },
});

const portalVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification requests from this IP. Please try again later." },
});

// ── Public Routes (Client Portal Lookup & OTP Verification) ──
projectRouter.get("/lookup-portal", lookupPortalProject);
projectRouter.post("/send-whatsapp-otp", portalOtpLimiter, sendWhatsappOtp);
projectRouter.post("/verify-whatsapp-otp", portalVerifyLimiter, verifyWhatsappOtp);

// ── Portal Access Protected Routes (Requires valid portal token OR staff session) ──
projectRouter.get("/get-project-by-slug", verifyPortalSession, getProjectBySlug);
projectRouter.get("/get-timeline-by-slug", verifyPortalSession, getTimelineBySlug);

// ── Protected Routes (Strictly Tenant Isolated) ──
projectRouter.use(authUser, tenantMiddleware);

projectRouter.post("/regenerate-portal-key", regeneratePortalLink);

projectRouter.get("/export-projects", exportProjects);
projectRouter.delete("/delete-many-projects", deleteManyProjects);
projectRouter.post("/create-project", checkProjectLimit, createProject);
projectRouter.get("/get-projects", authAccess("view:project"), getProjects);
projectRouter.get("/get-project", getProjectById);
projectRouter.put("/update-project", updateProject);
projectRouter.delete("/delete-project/:id", deleteProject);

// Timeline (progress post) routes for a project
projectRouter.post(
  "/:projectId/timeline",
  upload.array("attachments", 2),
  createTimelinePost,
);
projectRouter.get("/:projectId/timeline", getProjectTimeline);
projectRouter.put("/:projectId/timeline/:timelineId", updateTimelinePost);
projectRouter.delete("/:projectId/timeline/:timelineId", deleteTimelinePost);

projectRouter.get(
  "/get-project-status-report",
  authAccess("view:project-status-report"),
  getProjectStatusReport,
);
projectRouter.get(
  "/export-project-status-report",
  authAccess("view:project-status-report"),
  exportProjectStatusReport,
);
projectRouter.get("/get-budget-timeline", getBudgetTimeline);

// WhatsApp settings and messaging
projectRouter.get(
  "/get-whatsapp-cred",
  authAccess("view:whatsapp-setting"),
  getWhatsappCred,
);
projectRouter.put(
  "/update-whatsapp-cred",
  authAccess("view:whatsapp-setting"),
  updateWhatsappCred,
);
projectRouter.post("/send-link-to-client", sendLinkToClient);

projectRouter.get("/search-clients", searchClients);
projectRouter.get("/get-client-by-mobile", getClientByMobile);

export default projectRouter;
