import axios from "axios";
import WhatsappCredModel from "../models/whatsappCredModel.js";

//get whatsapp cred details from collection
const getWACredDtl = async () => {
  try {
    const waCredDtl = await WhatsappCredModel.findOne({});

    if (!waCredDtl) {
      return {
        success: false,
        message: "WhatsApp credential not found.",
      };
    }

    return {
      success: true,
      message: "Successfully get WhatsApp credential",
      data: waCredDtl,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

const sendWATextServ = async (sendTo, msg) => {
  try {
    // return {success:true};
    //get credential from collection
    const result = await getWACredDtl();
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
        message: respData.message,
      };
    }

    return {
      success: true,
      message: "Successfully send message.",
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

export { sendWATextServ };
