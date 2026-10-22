import dotenv from "dotenv";
dotenv.config();

import { sendTextMail } from "../services/mailService.js";

process.on("message", async (data) => {
  try {
    const { subject, toEmail, message, tenantId, isPlatform } = data;
    const result = await sendTextMail({
      subject,
      toEmails: toEmail,
      textMessage: message,
      tenantId: tenantId || null,
      isPlatform: Boolean(isPlatform),
    });

    if (!result || !result.success) {
      process.send({
        message: result?.message || "Failed to send mail.",
        success: false,
      });
      process.exit(0);
    }

    process.send({ message: "Successfully send mail.", success: true });
    process.exit(0);
  } catch (error) {
    process.send({ message: error.message, success: false });
    process.exit(1);
  }
});
