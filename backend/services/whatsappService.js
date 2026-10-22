import axios from "axios";
import WhatsappCredModel from "../models/whatsappCredModel.js";
import TenantModel from "../models/tenantModel.js";
import { decryptCredential } from "./crypto.js";

//get whatsapp cred details from collection strictly scoped by tenantId
const getWACredDtl = async (tenantId) => {
  try {
    if (!tenantId) {
      return {
        success: false,
        message: "tenantId is required to fetch WhatsApp credentials.",
      };
    }

    const waCredDtl = await WhatsappCredModel.findOne({ tenantId });

    if (!waCredDtl || !waCredDtl.token || !waCredDtl.instanceId) {
      return {
        success: false,
        message: "WhatsApp credentials not configured for this tenant.",
      };
    }

    let instanceId, token;
    try {
      instanceId = decryptCredential(waCredDtl.instanceId);
      token = decryptCredential(waCredDtl.token);
    } catch (decErr) {
      return {
        success: false,
        message: "Failed to decrypt WhatsApp credentials.",
      };
    }

    if (!instanceId || !token) {
      return {
        success: false,
        message: "WhatsApp credentials not configured for this tenant.",
      };
    }

    return {
      success: true,
      message: "Successfully get WhatsApp credential",
      data: { instanceId, token },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Mask token string for safe logging.
 */
export const maskToken = (token) => {
  if (!token || typeof token !== "string") return "";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

const sendWATextServ = async (sendTo, msg, tenantId) => {
  try {
    if (!tenantId) {
      return {
        success: false,
        message: "tenantId is required to send WhatsApp messages.",
      };
    }

    // Demo tenant outbound block: simulated send so demo users cannot spam real numbers
    const tenant = await TenantModel.findById(tenantId).select("isDemo").lean();
    if (tenant?.isDemo) {
      return {
        success: true,
        simulated: true,
        message: "Demo mode: WhatsApp message delivery simulated.",
      };
    }

    //get credential from collection scoped by tenantId
    const result = await getWACredDtl(tenantId);
    if (result.success === false) {
      return {
        success: false,
        message: result.message,
      };
    }

    let finalNumber = sendTo.trim();
    const hasPlus = finalNumber.startsWith("+");
    const digits = finalNumber.replace(/\D/g, "");

    // If explicit country code exists with '+', or if it's already a full international number, use as is.
    // If exactly 10 digits, default to prepending India country code '91' for backwards-compatibility.
    if (hasPlus) {
      finalNumber = digits;
    } else if (digits.length === 10) {
      finalNumber = `91${digits}`;
    } else {
      finalNumber = digits;
    }
    const WA_ACCESS_TOKEN = result.data.token;
    const response = await axios.get("https://waclient.com/api/send", {
      params: {
        number: finalNumber,
        type: "text",
        message: msg,
        instance_id: result.data.instanceId,
        access_token: WA_ACCESS_TOKEN,
      },
    });

    const respData = response.data;

    if (respData.status === "error") {
      return {
        success: false,
        message: respData.message || "Failed to deliver WhatsApp message.",
      };
    }

    return {
      success: true,
      message: "Successfully send message.",
    };
  } catch (error) {
    // Never expose waclient URL, query params, or access tokens in logs or error messages
    const safeMsg =
      error.response?.data?.message || "Failed to communicate with WhatsApp service.";
    return {
      success: false,
      message: safeMsg,
    };
  }
};

export { sendWATextServ };
