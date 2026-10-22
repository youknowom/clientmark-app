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
import onboardingRouter from "../routers/onboardingRouter.js";
import chatbotRouter from "../routers/chatbotRouter.js";

const __dirname = getDirname(import.meta.url);

const app = express();

// Configure Express trust proxy via env (TRUST_PROXY)
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY.trim().toLowerCase();
  if (tp === "true") app.set("trust proxy", true);
  else if (tp === "false") app.set("trust proxy", false);
  else if (!isNaN(Number(tp))) app.set("trust proxy", Number(tp));
  else app.set("trust proxy", process.env.TRUST_PROXY.trim());
}

// Security headers with CSP in report-only mode (logs violations without blocking)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      reportOnly: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://checkout.razorpay.com",
          "https://js.stripe.com",
        ],
        connectSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://api.stripe.com",
          "ws:",
          "wss:",
        ],
        frameSrc: [
          "'self'",
          "https://api.razorpay.com",
          "https://js.stripe.com",
        ],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
        reportUri: ["/csp-report"],
      },
    },
  })
);

const defaultOrigins = [
  "https://clientmark.app",
  "https://www.clientmark.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultOrigins;

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL.trim())) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}
if (process.env.DOMAIN_URL && !allowedOrigins.includes(process.env.DOMAIN_URL.trim())) {
  allowedOrigins.push(process.env.DOMAIN_URL.trim());
}

export const corsOriginChecker = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, curl, or server-to-server calls)
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  // Allow any localhost / 127.0.0.1 port in non-production environments
  if (
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return callback(null, true);
  }
  return callback(new Error("CORS policy does not allow access from this origin."));
};

//cors setup
app.use(
  cors({
    origin: corsOriginChecker,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-portal-token"],
  }),
);

// JSON parse with body size limit & rawBody preservation for webhooks
app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// General API rate limit (100 requests per minute per IP)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many requests. Please slow down." },
});
app.use(generalLimiter);

// Strict rate limit for login & OTP (10 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
});
app.use("/user/login-by-pass", authLimiter);
app.use("/tenant/register", authLimiter);
app.use("/project/send-whatsapp-otp", authLimiter);
app.use("/user/send-mail-otp", authLimiter);

import fileRouter from "../routers/fileRouter.js";

// Legacy public static file serve (disabled by default for security)
if (process.env.LEGACY_PUBLIC_UPLOADS === "true") {
  app.use(
    "/uploads/images",
    express.static(path.join(__dirname, "..", "uploads/images")),
  );
  app.use(
    "/uploads/pdfs",
    express.static(path.join(__dirname, "..", "uploads/pdfs")),
  );
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rate-limited CSP violation report listener
const cspReportLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many CSP violation reports." },
});

app.post(
  "/csp-report",
  cspReportLimiter,
  express.json({ type: ["application/json", "application/csp-report"] }),
  (req, res) => {
    const report = req.body?.["csp-report"] || req.body;
    console.warn("🛡️ [CSP Report-Only Violation]:", JSON.stringify(report, null, 2));
    return res.status(204).end();
  }
);

// Authenticated private file delivery
app.use("/files", fileRouter);

//routes setup
app.use("/user", userRouter);
app.use("/branch", branchRouter);
app.use("/software-setting", softwareSettingRouter);
app.use("/lead", leadRouter);
app.use("/project", projectRouter);
app.use("/notification", notificationRouter);
app.use("/tenant", tenantRouter);
app.use("/subscription", subscriptionRouter);
app.use("/onboarding", onboardingRouter);
app.use("/chatbot", chatbotRouter);

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

// Root API health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "Clientmark API is running" });
});

export default app;
