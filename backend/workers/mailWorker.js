import dotenv from "dotenv";
dotenv.config();

import { sendTextMail } from "../services/mailService.js";

process.on("message", async (data) => {
  try {
    const { subject, toEmail, message } = data;
    const result = await sendTextMail(subject, toEmail, message);

    if (!result) {
      process.send({ message: "Failed to send mail.", success: false });
      process.exit(0);
    }

    process.send({ message: "Successfully send mail.", success: true });
    process.exit(0);
  } catch (error) {
    process.send({ message: error.message, success: false });
    process.exit(1);
  }
});
