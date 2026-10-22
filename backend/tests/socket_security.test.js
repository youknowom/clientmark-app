import http from "http";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Server } from "socket.io";
import { io as ClientIO } from "socket.io-client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import request from "supertest";

import app, { corsOriginChecker } from "../config/app.js";
import initializeSocket from "../config/socket.js";
import { setIO, emitToTenant, emitToUser, disconnectUserSockets, disconnectTenantSockets, ALLOWED_PAYLOAD_KEYS, sanitizePayload } from "../services/realtime.js";
import TenantModel from "../models/tenantModel.js";
import UserModel from "../models/userModel.js";
import RoleModel from "../models/roleModel.js";
import OTPModel from "../models/otpModel.js";
import PasswordResetTokenModel from "../models/passwordResetTokenModel.js";

process.env.JWT_SECRET = "test_jwt_secret_key_12345";
process.env.OTP_HMAC_SECRET = "test_otp_hmac_secret_67890";
process.env.PORTAL_JWT_SECRET = "test_portal_secret_abcde";
process.env.SOCKET_MAX_PER_USER = "5";
process.env.SOCKET_MAX_PER_DEMO_USER = "200";

let mongoServer;
let httpServer;
let ioServer;
let serverPort;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  httpServer = http.createServer(app);
  ioServer = new Server(httpServer, {
    cors: {
      origin: corsOriginChecker,
      methods: ["GET", "POST"],
      credentials: true,
    },
    maxHttpBufferSize: 10 * 1024,
  });

  initializeSocket(ioServer);
  setIO(ioServer);

  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      serverPort = httpServer.address().port;
      resolve();
    });
  });
}, 60000);

afterAll(async () => {
  if (ioServer) {
    await new Promise((resolve) => ioServer.close(resolve));
  }
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Helper: Seed tenant, role, and staff user
async function createTestTenantAndUser({
  companyName = "Agency One",
  slug = "agency-one",
  userName = "user_one",
  email = "one@agency.com",
  status = "Active",
  isDemo = false,
} = {}) {
  const tenant = await TenantModel.create({
    companyName,
    slug,
    email,
    status,
    isDemo,
  });

  const role = await RoleModel.create({
    tenantId: tenant._id,
    roleName: "Admin",
    priority: 1,
    permissions: ["all"],
  });

  const hashedPassword = await bcrypt.hash("Password@123", 10);
  const user = await UserModel.create({
    tenantId: tenant._id,
    roleId: role._id,
    fullName: "Test User",
    userName,
    email,
    password: hashedPassword,
    status: "Active",
    tokenVersion: 1,
  });

  const token = jwt.sign(
    {
      userId: user._id,
      role: role.roleName,
      tenantId: tenant._id,
      tokenVersion: user.tokenVersion || 1,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return { tenant, role, user, token };
}

// Helper: Connect client socket with timeout
function connectClientSocket(token, options = {}) {
  return new Promise((resolve, reject) => {
    const socket = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ["websocket"],
      reconnection: false,
      auth: token ? { token } : {},
      ...options,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Connection timeout"));
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      resolve({ error: err, socket });
    });
  });
}

describe("Phase 1C: Socket.IO Security Suite", () => {
  // ─── 1. Authentication & Rejection Tests ──────────────────────────────────
  describe("Authentication on Connect (io.use)", () => {
    test("Connection refused when token is missing (AUTH_REQUIRED)", async () => {
      const result = await connectClientSocket(null);
      expect(result.error).toBeDefined();
      expect(result.error.data?.code).toBe("AUTH_REQUIRED");
      result.socket?.disconnect();
    });

    test("Connection refused when token is invalid or corrupt (TOKEN_INVALID)", async () => {
      const result = await connectClientSocket("corrupt_or_fake_token");
      expect(result.error).toBeDefined();
      expect(result.error.data?.code).toBe("TOKEN_INVALID");
      result.socket?.disconnect();
    });

    test("Connection refused when token has purpose portal (TOKEN_INVALID)", async () => {
      const portalToken = jwt.sign(
        { purpose: "portal", projectId: "123", tenantId: "456" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      const result = await connectClientSocket(portalToken);
      expect(result.error).toBeDefined();
      expect(result.error.data?.code).toBe("TOKEN_INVALID");
      result.socket?.disconnect();
    });

    test("Connection refused when token is expired (TOKEN_INVALID)", async () => {
      const { user, role, tenant } = await createTestTenantAndUser();
      const expiredToken = jwt.sign(
        { userId: user._id, role: role.roleName, tenantId: tenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" }
      );
      const result = await connectClientSocket(expiredToken);
      expect(result.error).toBeDefined();
      expect(result.error.data?.code).toBe("TOKEN_INVALID");
      result.socket?.disconnect();
    });

    test("Connection refused when user is inactive or deleted (SESSION_REVOKED)", async () => {
      const { user, token } = await createTestTenantAndUser();
      await UserModel.updateOne({ _id: user._id }, { $set: { status: "Inactive" } });

      const result = await connectClientSocket(token);
      expect(result.error).toBeDefined();
      expect(result.error.data?.code).toBe("SESSION_REVOKED");
      result.socket?.disconnect();
    });

    test("Connection refused when tenant is Suspended, Cancelled, Expired, or PastDue (SESSION_REVOKED) and reconnect fails", async () => {
      const blockedStatuses = ["Suspended", "Cancelled", "Expired", "PastDue"];

      for (let i = 0; i < blockedStatuses.length; i++) {
        const status = blockedStatuses[i];
        const { tenant, token } = await createTestTenantAndUser({
          companyName: `${status} Tenant`,
          slug: `tenant_blocked_${status.toLowerCase()}_${i}`,
          userName: `user_blocked_${status.toLowerCase()}_${i}`,
          email: `blocked_${status.toLowerCase()}_${i}@test.com`,
        });
        await TenantModel.updateOne({ _id: tenant._id }, { $set: { status } });

        // Initial connect must be refused with SESSION_REVOKED
        const result = await connectClientSocket(token);
        expect(result.error).toBeDefined();
        expect(result.error.data?.code).toBe("SESSION_REVOKED");
        result.socket?.disconnect();

        // Reconnect attempt must also be refused
        const reconnectResult = await connectClientSocket(token);
        expect(reconnectResult.error).toBeDefined();
        expect(reconnectResult.error.data?.code).toBe("SESSION_REVOKED");
        reconnectResult.socket?.disconnect();
      }
    });
  });

  // ─── 2. Multi-Tenant Room Isolation ───────────────────────────────────────
  describe("Multi-Tenant Room Isolation (emitToTenant)", () => {
    test("Tenant A events are received by Tenant A, but NEVER by Tenant B", async () => {
      const tenantA = await createTestTenantAndUser({ companyName: "Tenant Alpha", slug: "alpha", userName: "user_a", email: "a@a.com" });
      const tenantB = await createTestTenantAndUser({ companyName: "Tenant Beta", slug: "beta", userName: "user_b", email: "b@b.com" });

      const socketA = await connectClientSocket(tenantA.token);
      const socketB = await connectClientSocket(tenantB.token);

      expect(socketA.connected).toBe(true);
      expect(socketB.connected).toBe(true);

      const receivedA = [];
      const receivedB = [];

      socketA.on("project:created", (data) => receivedA.push(data));
      socketB.on("project:created", (data) => receivedB.push(data));

      emitToTenant(tenantA.tenant._id, "project:created", { projectId: "proj_alpha_1" });

      await new Promise((r) => setTimeout(r, 200));

      expect(receivedA.length).toBe(1);
      expect(receivedA[0].projectId).toBe("proj_alpha_1");
      expect(receivedB.length).toBe(0); // Tenant B received NOTHING

      socketA.disconnect();
      socketB.disconnect();
    });
  });

  // ─── 3. User-Targeted Event Isolation ─────────────────────────────────────
  describe("User-Targeted Event Isolation (emitToUser)", () => {
    test("User-targeted notifications reach only that specific user's socket", async () => {
      const tenantData = await createTestTenantAndUser({ userName: "user_target", email: "target@t.com" });

      // Create a second user in the same tenant
      const hashedPassword = await bcrypt.hash("Pass@123", 10);
      const user2 = await UserModel.create({
        tenantId: tenantData.tenant._id,
        roleId: tenantData.role._id,
        fullName: "User Other",
        userName: "user_other",
        email: "other@t.com",
        password: hashedPassword,
        status: "Active",
        tokenVersion: 1,
      });
      const token2 = jwt.sign(
        { userId: user2._id, role: "Admin", tenantId: tenantData.tenant._id, tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const socket1 = await connectClientSocket(tenantData.token);
      const socket2 = await connectClientSocket(token2);

      const received1 = [];
      const received2 = [];

      socket1.on("notification:new", (data) => received1.push(data));
      socket2.on("notification:new", (data) => received2.push(data));

      emitToUser(tenantData.user._id, "notification:new", { title: "For User 1 Only" });

      await new Promise((r) => setTimeout(r, 200));

      expect(received1.length).toBe(1);
      expect(received1[0].title).toBe("For User 1 Only");
      expect(received2.length).toBe(0); // User 2 received NOTHING

      socket1.disconnect();
      socket2.disconnect();
    });
  });

  // ─── 4. Client Cannot Join Arbitrary Rooms or Emit Broadcasts ──────────────
  describe("No Client-to-Server Event Handlers / Broadcast Prevention", () => {
    test("Client emitting arbitrary event is ignored and does not broadcast to other clients", async () => {
      const tenant = await createTestTenantAndUser();
      const socket1 = await connectClientSocket(tenant.token);
      const socket2 = await connectClientSocket(tenant.token);

      const rogueReceived = [];
      socket2.on("malicious_broadcast", (data) => rogueReceived.push(data));

      // Attempt client-side broadcast
      socket1.emit("malicious_broadcast", { secret: "hacked" });

      await new Promise((r) => setTimeout(r, 200));
      expect(rogueReceived.length).toBe(0);

      socket1.disconnect();
      socket2.disconnect();
    });
  });

  // ─── 5. Per-User Connection Cap (Disconnects Oldest) ──────────────────────
  describe("Per-User Connection Cap (SOCKET_MAX_PER_USER = 5)", () => {
    test("When user opens 6th socket, the oldest socket is disconnected; new socket connects", async () => {
      const tenant = await createTestTenantAndUser();
      const sockets = [];

      // Open 5 sockets (at limit)
      for (let i = 0; i < 5; i++) {
        const s = await connectClientSocket(tenant.token);
        expect(s.connected).toBe(true);
        sockets.push(s);
        await new Promise((r) => setTimeout(r, 20)); // staggered handshake issue time
      }

      const oldestSocket = sockets[0];
      let oldestDisconnected = false;
      oldestSocket.on("disconnect", () => {
        oldestDisconnected = true;
      });

      // Connect 6th socket
      const sixthSocket = await connectClientSocket(tenant.token);
      expect(sixthSocket.connected).toBe(true);
      sockets.push(sixthSocket);

      await new Promise((r) => setTimeout(r, 200));

      expect(oldestDisconnected).toBe(true);
      expect(oldestSocket.connected).toBe(false); // Oldest dropped
      expect(sixthSocket.connected).toBe(true); // Newest accepted

      // Cleanup
      sockets.forEach((s) => s.connected && s.disconnect());
    });

    test("Demo shared account with > 5 sockets stays connected (SOCKET_MAX_PER_DEMO_USER = 200)", async () => {
      const demoTenant = await createTestTenantAndUser({
        companyName: "Demo Workspace",
        slug: "demo-workspace",
        isDemo: true,
      });

      const sockets = [];
      // Connect 7 sockets (more than 5)
      for (let i = 0; i < 7; i++) {
        const s = await connectClientSocket(demoTenant.token);
        expect(s.connected).toBe(true);
        sockets.push(s);
      }

      await new Promise((r) => setTimeout(r, 200));

      // All 7 should remain connected
      for (let i = 0; i < 7; i++) {
        expect(sockets[i].connected).toBe(true);
      }

      sockets.forEach((s) => s.connected && s.disconnect());
    });
  });

  // ─── 6. Immediate Socket Disconnect on Revocation & Suspension ─────────────
  describe("Socket Revocation on Password Change & Tenant Suspension", () => {
    test("User password reset / deactivation immediately disconnects active socket", async () => {
      const tenant = await createTestTenantAndUser();
      const socket = await connectClientSocket(tenant.token);
      expect(socket.connected).toBe(true);

      let disconnected = false;
      socket.on("disconnect", () => {
        disconnected = true;
      });

      await disconnectUserSockets(tenant.user._id);

      await new Promise((r) => setTimeout(r, 200));
      expect(disconnected).toBe(true);
      expect(socket.connected).toBe(false);
    });

    test("Tenant suspension through real HTTP PUT /tenant/update disconnects its sockets", async () => {
      const tenant = await createTestTenantAndUser();
      const socket = await connectClientSocket(tenant.token);
      expect(socket.connected).toBe(true);

      let disconnected = false;
      socket.on("disconnect", () => {
        disconnected = true;
      });

      // Update tenant status to Suspended via real route
      const res = await request(app)
        .put("/tenant/update")
        .set("Authorization", `Bearer ${tenant.token}`)
        .send({ status: "Suspended" });

      expect(res.status).toBe(200);

      await new Promise((r) => setTimeout(r, 200));
      expect(disconnected).toBe(true);
      expect(socket.connected).toBe(false);
    });
  });

  // ─── 7. Payload Sanitization & Leakage Prevention ─────────────────────────
  describe("Payload Sanitization", () => {
    test("Emitted payload strips tenantId, passwords, emails, phones, and costs", async () => {
      const tenant = await createTestTenantAndUser();
      const socket = await connectClientSocket(tenant.token);

      let receivedPayload = null;
      socket.on("lead:created", (data) => {
        receivedPayload = data;
      });

      // Emit with potential sensitive leaks
      emitToTenant(tenant.tenant._id, "lead:created", {
        leadId: "lead_123",
        tenantId: tenant.tenant._id.toString(),
        email: "leak@test.com",
        mobileNo: "+1234567890",
        phone: "555-5555",
        password: "secret_hash",
        ProjectCost: 99999,
        action: "created",
      });

      await new Promise((r) => setTimeout(r, 200));

      expect(receivedPayload).toBeDefined();
      expect(receivedPayload.leadId).toBe("lead_123");
      expect(receivedPayload.action).toBe("created");
      // All sensitive fields MUST be undefined
      expect(receivedPayload.tenantId).toBeUndefined();
      expect(receivedPayload.email).toBeUndefined();
      expect(receivedPayload.mobileNo).toBeUndefined();
      expect(receivedPayload.phone).toBeUndefined();
      expect(receivedPayload.password).toBeUndefined();
      expect(receivedPayload.ProjectCost).toBeUndefined();

      socket.disconnect();
    });

    test("Emitted payload strictly strips keys outside the ALLOWLIST (fails if any foreign key is present)", async () => {
      const tenant = await createTestTenantAndUser({
        companyName: "Allowlist Tenant",
        slug: "allowlist-tenant-unique",
        userName: "user_allowlist_unique",
        email: "allowlist_unique@test.com",
      });
      const socket = await connectClientSocket(tenant.token);

      let receivedPayload = null;
      socket.on("project:updated", (data) => {
        receivedPayload = data;
      });

      emitToTenant(tenant.tenant._id, "project:updated", {
        projectId: "proj_999",
        projectName: "Redesign 2.0",
        action: "updated",
        unauthorizedField: "secret_data",
        internalServerMetrics: { cpu: "99%" },
        userPasswordHash: "xyz123",
        creditCard: "4111-1111",
      });

      await new Promise((r) => setTimeout(r, 200));

      expect(receivedPayload).toBeDefined();
      expect(receivedPayload.projectId).toBe("proj_999");
      expect(receivedPayload.projectName).toBe("Redesign 2.0");
      expect(receivedPayload.action).toBe("updated");

      // Verify EVERY key in the received payload is inside ALLOWED_PAYLOAD_KEYS
      const payloadKeys = Object.keys(receivedPayload);
      for (const k of payloadKeys) {
        expect(ALLOWED_PAYLOAD_KEYS.has(k)).toBe(true);
      }

      // Foreign keys must NOT exist
      expect(receivedPayload.unauthorizedField).toBeUndefined();
      expect(receivedPayload.internalServerMetrics).toBeUndefined();
      expect(receivedPayload.userPasswordHash).toBeUndefined();
      expect(receivedPayload.creditCard).toBeUndefined();

      socket.disconnect();
    });
  });

  // ─── 8. Codebase Grep Enforcement ─────────────────────────────────────────
  describe("Codebase Grep Enforcement Test", () => {
    test("No backend file outside realtime.js and config/socket.js uses io.emit, io.to, io.sockets, socket.broadcast, app.get('io') or req.app.get('io')", () => {
      const backendDir = path.resolve(process.cwd());
      const prohibitedPatterns = [
        /\bio\.emit\b/,
        /\bio\.to\b/,
        /\bio\.sockets\b/,
        /\bsocket\.broadcast\b/,
        /app\.get\(\s*["']io["']\s*\)/,
        /req\.app\.get\(\s*["']io["']\s*\)/,
      ];

      const allowedFiles = [
        path.normalize(path.join(backendDir, "services", "realtime.js")),
        path.normalize(path.join(backendDir, "config", "socket.js")),
      ];

      const violations = [];

      function scanDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file === "node_modules" || file === "tests" || file === ".git") continue;
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (file.endsWith(".js")) {
            const normalized = path.normalize(fullPath);
            if (allowedFiles.includes(normalized)) continue;

            const content = fs.readFileSync(fullPath, "utf8");
            for (const pattern of prohibitedPatterns) {
              if (pattern.test(content)) {
                violations.push({ file: fullPath, pattern: pattern.toString() });
              }
            }
          }
        }
      }

      scanDir(backendDir);
      expect(violations).toEqual([]);
    });
  });
});
