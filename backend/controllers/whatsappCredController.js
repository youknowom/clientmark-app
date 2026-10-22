import ProjectModel from "../models/projectModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import { sendWATextServ } from "../services/whatsappService.js";
import { buildPortalWhatsAppMessage } from "../services/portalMessageBuilder.js";
import { encryptCredential, maskSecret, isMaskedValue } from "../services/crypto.js";

// GET WhatsApp Credentials
const getWhatsappCred = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant information missing." });
    }
    const cred = await WhatsappCredModel.findOne({ tenantId });

    if (!cred) {
      // Return 200 with empty fields instead of 400 to avoid crash/error toast on first-time setup
      return res.status(200).json({
        success: true,
        message: "Ready to initialize WhatsApp credentials",
        data: { instanceId: "", hasInstanceId: false, token: "", hasToken: false, _id: "" },
      });
    }

    const maskedInst = maskSecret(cred.instanceId);
    const maskedTok = maskSecret(cred.token);

    return res.status(200).json({
      success: true,
      message: "WhatsApp credentials fetched",
      data: {
        _id: cred._id,
        instanceId: maskedInst.masked,
        hasInstanceId: maskedInst.hasValue,
        token: maskedTok.masked,
        hasToken: maskedTok.hasValue,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE WhatsApp Credentials
const updateWhatsappCred = async (req, res) => {
  try {
    const { instanceId, token } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant information missing." });
    }

    const existingCred = await WhatsappCredModel.findOne({ tenantId });

    let finalInstanceId = existingCred?.instanceId;
    if (instanceId && !isMaskedValue(instanceId) && instanceId.trim() !== "") {
      finalInstanceId = encryptCredential(instanceId.trim());
    }

    let finalToken = existingCred?.token;
    if (token && !isMaskedValue(token) && token.trim() !== "") {
      finalToken = encryptCredential(token.trim());
    }

    if (!finalInstanceId || !finalToken) {
      return res.status(400).json({
        success: false,
        message: "instanceId and token are required",
      });
    }

    // Support upserting the tenant record with encrypted credentials
    const cred = await WhatsappCredModel.findOneAndUpdate(
      { tenantId },
      { tenantId, instanceId: finalInstanceId, token: finalToken },
      { new: true, upsert: true }
    );

    const maskedInst = maskSecret(cred.instanceId);
    const maskedTok = maskSecret(cred.token);

    return res.json({
      success: true,
      message: "WhatsApp credentials updated successfully",
      data: {
        _id: cred._id,
        instanceId: maskedInst.masked,
        hasInstanceId: maskedInst.hasValue,
        token: maskedTok.masked,
        hasToken: maskedTok.hasValue,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SEND LINK TO CLIENT
const sendLinkToClient = async (req, res) => {
  try {
    const { _id } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant information missing." });
    }

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }
    const project = await ProjectModel.findOne({ _id: _id, tenantId });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Client project not found",
      });
    }

    //extract client whatsapp no
    const whatsappNo = project.mobileNo ? String(project.mobileNo) : "";
    if (whatsappNo.trim() === "") {
      return res
        .status(400)
        .json({ message: "Client whatsapp number not found.", success: false });
    }
    const cred = await WhatsappCredModel.findOne({ tenantId });

    if (!cred) {
      return res.status(404).json({
        success: false,
        message: "WhatsApp credentials not found",
      });
    }

    if (!project.portalKey) {
      return res.status(400).json({
        success: false,
        message: "Project does not have a portal key. Please regenerate the portal link.",
      });
    }

    const senderBrand = req.tenant?.companyName || process.env.PROJECT_NAME || "Clientmark";
    const msg = buildPortalWhatsAppMessage({
      clientName: project.ClientName,
      projectName: project.ProjectName,
      projectId: project.ProjectId || project._id,
      createdAt: project.createdAt,
      portalKey: project.portalKey,
      senderBrand,
    });

    const isSent = await sendWATextServ(whatsappNo, msg, tenantId);
    if (isSent.success == false) {
      return res.status(400).json({
        success: false,
        message: isSent.message || "Failed to send link",
      });
    }

    return res.json({
      success: true,
      message: "WhatsApp message sucessfully send",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { getWhatsappCred, updateWhatsappCred, sendLinkToClient };
