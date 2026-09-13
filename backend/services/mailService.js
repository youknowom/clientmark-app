import nodemailer from "nodemailer";
import SoftwareSettingModel from "../models/softwareSettingModel.js";

//get mail credential
const getMailCredential = async () => {
  try {
    const mailCred = await SoftwareSettingModel.findOne({}).lean();

    if (!mailCred) {
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: mailCred.host,
      port: 587,
      secure: false,
      auth: {
        user: mailCred.email,
        pass: mailCred.password,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    });

    return { transporter: transporter, SMTP_USER: mailCred.email };
  } catch (error) {
   
    return null;
  }
};

// Send plain text mail
const sendTextMail = async (subject, toEmails, textMessage, ccEmails = []) => {
  try {
    const mailCred = await getMailCredential();

    if (!mailCred || mailCred === null) {
      return false;
    }

    let transporter = mailCred.transporter;

    const mailOptions = {
      from: mailCred.SMTP_USER,

      // supports string or array
      to: Array.isArray(toEmails) ? toEmails.join(",") : toEmails,

      // only include cc if present
      ...(ccEmails.length > 0 && {
        cc: Array.isArray(ccEmails) ? ccEmails.join(",") : ccEmails,
      }),

      subject: subject,
      text: textMessage,
    };

    const response = await transporter.sendMail(mailOptions);
    const rejected = response?.rejected;

    return rejected?.length === 0;
  } catch (error) {
   
    return false;
  }
};

export { sendTextMail };
