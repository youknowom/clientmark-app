import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { getDirname } from "../utils/pathUtil.js";

//import route
import userRouter from "../routers/userRouter.js";
import branchRouter from "../routers/branchRouter.js";
import softwareSettingRouter from "../routers/softwareSettingRouter.js";
import leadRouter from "../routers/leadRouter.js";
import projectRouter from "../routers/projectRouter.js";
import notificationRouter from "../routers/notificationRouter.js";
import tenantRouter from "../routers/tenantRouter.js";
import subscriptionRouter from "../routers/subscriptionRouter.js";

const __dirname = getDirname(import.meta.url);

const app = express();

//security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

//cors setup
app.use(
  cors({
    origin: process.env.DOMAIN_URL || "*",
    credentials: true,
  }),
);

//JSON parse with body size limit
app.use(express.json({ limit: "1mb" }));

// General API rate limit (100 requests per minute per IP)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests. Please slow down." },
});
app.use(generalLimiter);

// Strict rate limit for login & OTP (10 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
});
app.use("/user/login-by-pass", authLimiter);
app.use("/tenant/register", authLimiter);
app.use("/project/send-whatsapp-otp", authLimiter);
app.use("/user/send-mail-otp", authLimiter);

//static file serve
app.use(
  "/uploads/images",
  express.static(path.join(__dirname, "..", "uploads/images")),
);
app.use(
  "/uploads/pdfs",
  express.static(path.join(__dirname, "..", "uploads/pdfs")),
);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

//routes setup
app.use("/user", userRouter);
app.use("/branch", branchRouter);
app.use("/software-setting", softwareSettingRouter);
app.use("/lead", leadRouter);
app.use("/project", projectRouter);
app.use("/notification", notificationRouter);
app.use("/tenant", tenantRouter);
app.use("/subscription", subscriptionRouter);

// Centralized error handling (Multer errors, payload limits, file validation)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 10MB limit. Please upload a smaller file.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed.",
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "An unexpected error occurred during upload.",
    });
  }
  next();
});

//server frontend pages
const buildPath = path.join(__dirname, "../../public_html");
app.use(express.static(buildPath));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

export default app;
