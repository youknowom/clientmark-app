import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./config/app.js";
import connectDB from "./config/db.js";
import seedDatabase from "./config/seedDatabase.js";
import initializeSocket from "./config/socket.js";
import { Server } from "socket.io";
import initScheduledNotifications from "./workers/scheduledNotifications.js";

//DB Connect & Auto-Seed
connectDB().then(() => seedDatabase());

//Server Setup
const server = http.createServer(app);

// Socket
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Call socket initializer
initializeSocket(io);

// Make io available everywhere
app.set("io", io);

// Start Scheduled Cron Notifications (quotes + reminders for developers)
initScheduledNotifications(io);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
