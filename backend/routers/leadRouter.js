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
} from "../controllers/leadController.js";
import { authUser, authAccess } from "../middlewares/authMiddleware.js";
import { upload } from "../services/fileUploadService.js";
import { checkLeadLimit } from "../middlewares/usageLimitMiddleware.js";

const leadRouter = express.Router();

leadRouter.get("/down-sample", authUser, downSample); //download seller sample

leadRouter.post("/import-lead", authUser, checkLeadLimit, upload.single("file"), importLead); //import seller leads

leadRouter.get("/export-lead", authUser, exportLead); //export lead details

leadRouter.delete(
  "/delete-many-lead",
  authUser,
  authAccess("delete:lead"),
  deleteManyLead,
); //delete many lead

leadRouter.post("/create-lead", authUser, checkLeadLimit, createLead); // Create new lead

leadRouter.get("/get-leads", authUser, authAccess("view:lead"), getLeads); // Get all leads

leadRouter.get("/get-lead/:id", authUser, authAccess("view:lead"), getLeadById); // Get single lead

leadRouter.put("/update-lead", authUser, authAccess("update:lead"), updateLead); // Update lead

leadRouter.delete(
  "/delete-lead/:id",
  authUser,
  authAccess("delete:lead"),
  deleteLead,
); // Delete lead

leadRouter.post("/many-admin-to-telecaller", authUser, manyAdminToTelecaller); //assign many lead to telecaller by admin

leadRouter.post("/many-telecaller-to-bde", authUser, manyTelecallerToBde); // assing many lead telecaller lead to bde

leadRouter.get("/get-lead-progess", authUser, getLeadProgess); //get single lead progess

leadRouter.post("/many-bde-to-admin", authUser, manyBdeToAdmin); //assing many lead bde to admin

leadRouter.post("/single-telecaller-to-bde", authUser, singleTelecallerToBde); //assign single lead telecaller to bde

leadRouter.get(
  "/get-telecaller-lead-report",
  authUser,
  authAccess("view:telecaller-lead-report"),
  getTelecallerLeadReport,
); //get telelcaller lead report

leadRouter.get(
  "/export-telecaller-lead-report",
  authUser,
  authAccess("view:telecaller-lead-report"),
  exportTelecallerLeadReport,
); //export telecaller lead report

leadRouter.get(
  "/get-bde-lead-report",
  authUser,
  authAccess("view:bde-lead-report"),
  getBdeLeadReport,
); //get bde lead report

leadRouter.get(
  "/export-bde-lead-report",
  authUser,
  authAccess("view:bde-lead-report"),
  exportBdeLeadReport,
); //export bde lead report

leadRouter.get(
  "/get-lead-status-report",
  authUser,
  authAccess("view:lead-status-report"),
  getLeadStatusReport,
); //get lead status report

leadRouter.get(
  "/export-lead-status-report",
  authUser,
  authAccess("view:lead-status-report"),
  exportLeadStatusReport,
); //export lead status report

leadRouter.post("/send-whatsapp", authUser, sendWhatsappToLead); // Send WhatsApp message to a lead

leadRouter.post("/whatsapp-template", authUser, addWhatsappTemplate); // Add a new WhatsApp template

leadRouter.get("/whatsapp-templates", authUser, getWhatsappTemplates); // Get all WhatsApp templates

leadRouter.delete("/whatsapp-template/:id", authUser, deleteWhatsappTemplate); // Delete WhatsApp template by ID

leadRouter.get(
  "/whatsapp-chat-records",
  authUser,
  authAccess("view:whatsapp-chat-record"),
  getWhatsappChats,
); // Get all WhatsApp chat records (Admin only)

leadRouter.delete(
  "/whatsapp-chat-record/:id",
  authUser,
  authAccess("view:whatsapp-chat-record"),
  deleteWhatsappChat,
); // Delete WhatsApp chat record by ID

leadRouter.delete(
  "/whatsapp-chat-records-all",
  authUser,
  authAccess("view:whatsapp-chat-record"),
  deleteAllWhatsappChats,
); // Delete all WhatsApp chat records

export default leadRouter;
