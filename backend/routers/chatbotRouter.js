import express from "express";
import {
  handleChatMessage,
  getChatHistory,
  clearChatHistory,
} from "../controllers/chatbotController.js";

const chatbotRouter = express.Router();

chatbotRouter.post("/message", handleChatMessage);
chatbotRouter.get("/history/:sessionId", getChatHistory);
chatbotRouter.post("/clear", clearChatHistory);

export default chatbotRouter;
