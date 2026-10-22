import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app, { corsOriginChecker } from "./config/app.js";
import connectDB from "./config/db.js";
import seedDatabase from "./config/seedDatabase.js";
import { seedDemoTenant } from "./config/seedDemoTenant.js";
import initializeSocket from "./config/socket.js";
import { Server } from "socket.io";
import initScheduledNotifications from "./workers/scheduledNotifications.js";
import { initExpiryCron } from "./workers/expiryJob.js";
import { initDemoResetCron } from "./workers/demoResetJob.js";
import { validateCryptoConfig } from "./services/crypto.js";
import { validatePlatformMailConfig } from "./services/mailService.js";

// Validate security & communication configurations (refuses to start in production if key or platform SMTP is missing)
validateCryptoConfig();
validatePlatformMailConfig();

//DB Connect & Auto-Seed
connectDB().then(async () => {
  await seedDatabase();
  await seedDemoTenant();
});

import { setIO } from "./services/realtime.js";

// Server Setup
const server = http.createServer(app);

// Socket
const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 10 * 1024, // 10 KB max payload size
});

// Call socket initializer
initializeSocket(io);

// Register io with centralized realtime service
setIO(io);

// Start Scheduled Background Workers & Crons
initScheduledNotifications();
initExpiryCron();
initDemoResetCron();

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
