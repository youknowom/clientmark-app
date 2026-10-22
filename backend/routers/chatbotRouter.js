import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  handleChatMessage,
  getChatHistory,
  clearChatHistory,
} from "../controllers/chatbotController.js";

const chatbotRouter = express.Router();

// ── Protected Routes (Strictly Tenant Isolated) ──
chatbotRouter.use(authUser, tenantMiddleware);

chatbotRouter.post("/message", handleChatMessage);
chatbotRouter.get("/history/:sessionId", getChatHistory);
chatbotRouter.post("/clear", clearChatHistory);

export default chatbotRouter;
