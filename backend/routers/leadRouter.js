import express from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  downSample,
  importLead,
  deleteManyLead,
  exportLead,
  manyAdminToTelecaller,
  manyTelecallerToBde,
  getLeadProgess,
  manyBdeToAdmin,
  singleTelecallerToBde,
  getTelecallerLeadReport,
  exportTelecallerLeadReport,
  getBdeLeadReport,
  exportBdeLeadReport,
  getLeadStatusReport,
  exportLeadStatusReport,
  getWhatsappTemplates,
  addWhatsappTemplate,
  sendWhatsappToLead,
  getWhatsappChats,
  deleteWhatsappTemplate,
  deleteWhatsappChat,
  deleteAllWhatsappChats,
  checkDuplicateLead,
} from "../controllers/leadController.js";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import { upload } from "../services/fileUploadService.js";
import { checkLeadLimit } from "../middlewares/usageLimitMiddleware.js";

const leadRouter = express.Router();

// ── Protected Routes (Strictly Tenant Isolated) ──
leadRouter.use(authUser, tenantMiddleware);

leadRouter.get("/down-sample", downSample);
leadRouter.post("/import-lead", checkLeadLimit, upload.single("file"), importLead);
leadRouter.get("/export-lead", exportLead);
leadRouter.delete("/delete-many-lead", authAccess("delete:lead"), deleteManyLead);
leadRouter.get("/check-duplicate", authAccess("view:lead"), checkDuplicateLead);
leadRouter.post("/create-lead", checkLeadLimit, createLead);
leadRouter.get("/get-leads", authAccess("view:lead"), getLeads);
leadRouter.get("/get-lead/:id", authAccess("view:lead"), getLeadById);
leadRouter.put("/update-lead", authAccess("update:lead"), updateLead);
leadRouter.delete("/delete-lead/:id", authAccess("delete:lead"), deleteLead);

leadRouter.post("/many-admin-to-telecaller", manyAdminToTelecaller);
leadRouter.post("/many-telecaller-to-bde", manyTelecallerToBde);
leadRouter.get("/get-lead-progess", getLeadProgess);
leadRouter.post("/many-bde-to-admin", manyBdeToAdmin);
leadRouter.post("/single-telecaller-to-bde", singleTelecallerToBde);

leadRouter.get(
  "/get-telecaller-lead-report",
  authAccess("view:telecaller-lead-report"),
  getTelecallerLeadReport,
);
leadRouter.get(
  "/export-telecaller-lead-report",
  authAccess("view:telecaller-lead-report"),
  exportTelecallerLeadReport,
);
leadRouter.get(
  "/get-bde-lead-report",
  authAccess("view:bde-lead-report"),
  getBdeLeadReport,
);
leadRouter.get(
  "/export-bde-lead-report",
  authAccess("view:bde-lead-report"),
  exportBdeLeadReport,
);
leadRouter.get(
  "/get-lead-status-report",
  authAccess("view:lead-status-report"),
  getLeadStatusReport,
);
leadRouter.get(
  "/export-lead-status-report",
  authAccess("view:lead-status-report"),
  exportLeadStatusReport,
);

leadRouter.post("/send-whatsapp", sendWhatsappToLead);
leadRouter.post("/whatsapp-template", addWhatsappTemplate);
leadRouter.get("/whatsapp-templates", getWhatsappTemplates);
leadRouter.delete("/whatsapp-template/:id", deleteWhatsappTemplate);

leadRouter.get(
  "/whatsapp-chat-records",
  authAccess("view:whatsapp-chat-record"),
  getWhatsappChats,
);
leadRouter.delete(
  "/whatsapp-chat-record/:id",
  authAccess("view:whatsapp-chat-record"),
  deleteWhatsappChat,
);
leadRouter.delete(
  "/whatsapp-chat-records-all",
  authAccess("view:whatsapp-chat-record"),
  deleteAllWhatsappChats,
);

export default leadRouter;
