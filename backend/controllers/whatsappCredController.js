import ProjectModel from "../models/projectModel.js";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import { sendWATextServ } from "../services/whatsappService.js";

// GET WhatsApp Credentials
const getWhatsappCred = async (req, res) => {
  try {
    const cred = await WhatsappCredModel.findOne();

    if (!cred) {
      // Return 200 with empty fields instead of 400 to avoid crash/error toast on first-time setup
      return res.status(200).json({
        success: true,
        message: "Ready to initialize WhatsApp credentials",
        data: { instanceId: "", token: "", _id: "" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "WhatsApp credentials fetched",
      data: cred,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE WhatsApp Credentials
const updateWhatsappCred = async (req, res) => {
  try {
    const { instanceId, token } = req.body;

    if (!instanceId || !token) {
      return res.status(400).json({
        success: false,
        message: "instanceId and token are required",
      });
    }

    // Support upserting the single global record if no _id exists yet
    const cred = await WhatsappCredModel.findOneAndUpdate(
      {},
      { instanceId, token },
      { new: true, upsert: true },
    );

    return res.json({
      success: true,
      message: "WhatsApp credentials updated successfully",
      data: cred,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// SEND LINK TO CLIENT
const sendLinkToClient = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }
    const project = await ProjectModel.findOne({ _id: _id });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Client project not found",
      });
    }

    //extract clint whatsapp no
    const whatsappNo = project.mobileNo ? String(project.mobileNo) : "";
    if (whatsappNo.trim() === "") {
      return res
        .status(400)
        .json({ message: "Client whatsapp number not found.", success: false });
    }
    const cred = await WhatsappCredModel.findOne();

    if (!cred) {
      return res.status(404).json({
        success: false,
        message: "WhatsApp credentials not found",
      });
    }

    //project link
    let link = `${process.env.DOMAIN_URL}/project-preview/${project.slug}`;

    const registrationDate = project.createdAt
      ? new Date(project.createdAt).toLocaleDateString("en-GB")
      : "-";

    const msg = `Dear *${project.ClientName || "Client"}*,

Greetings from *BigHost India*.

We are pleased to inform you that your project *${project.ProjectName}* has been successfully registered.

*Project Details*
- Project Name: ${project.ProjectName}
- Reference ID: ${project.ProjectId || project._id}
- Registration Date: ${registrationDate}

*Project Tracking Link*
${link}

If you need any assistance, please feel free to contact our support team.

Regards,
*BigHost India*`;

    const isSent = await sendWATextServ(whatsappNo, msg);
    if (isSent.success == false) {
      return res.status(400).json({
        success: false,
        message: "Failed to send link",
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
