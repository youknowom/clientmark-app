import express from "express";
import { getFile } from "../controllers/fileController.js";

const fileRouter = express.Router();

// GET /files/:fileId (Authenticated file access)
fileRouter.get("/:fileId", getFile);

export default fileRouter;
