import { validateUserSession } from "../middlewares/authMiddleware.js";

const SOCKET_MAX_PER_USER = parseInt(process.env.SOCKET_MAX_PER_USER || "5", 10);
const SOCKET_MAX_PER_DEMO_USER = parseInt(process.env.SOCKET_MAX_PER_DEMO_USER || "200", 10);

// IP rate limiting storage: ip -> { totalCount, failedCount, resetAt }
const ipLimits = new Map();

// Periodic cleanup of expired IP tracking entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipLimits.entries()) {
    if (entry.resetAt < now) {
      ipLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const getClientIp = (socket) => {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return socket.request?.ip || socket.handshake.address || "unknown";
};

const checkIpLimits = (ip) => {
  const now = Date.now();
  let entry = ipLimits.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { totalCount: 1, failedCount: 0, resetAt: now + 60 * 1000 };
    ipLimits.set(ip, entry);
    return { allowed: true };
  }

  entry.totalCount += 1;
  if (entry.totalCount > 300) {
    return { allowed: false, message: "Too many connection attempts from this IP.", code: "RATE_LIMITED" };
  }
  if (entry.failedCount >= 20) {
    return { allowed: false, message: "Too many failed authentication attempts from this IP.", code: "AUTH_RATE_LIMITED" };
  }

  return { allowed: true };
};

const recordFailedAuth = (ip) => {
  const entry = ipLimits.get(ip);
  if (entry) {
    entry.failedCount += 1;
  }
};

/**
 * Configure Socket.IO authentication, room isolation, and lifecycle management.
 */
const initializeSocket = (io) => {
  // Authentication & Pre-connection middleware
  io.use(async (socket, next) => {
    const clientIp = getClientIp(socket);

    // 1. IP Rate Limiting
    const ipCheck = checkIpLimits(clientIp);
    if (!ipCheck.allowed) {
      const err = new Error(ipCheck.message);
      err.data = { code: ipCheck.code };
      return next(err);
    }

    // 2. Read token ONLY from handshake.auth, NEVER query string
    const token = socket.handshake.auth?.token;
    if (!token) {
      recordFailedAuth(clientIp);
      const err = new Error("Authentication required");
      err.data = { code: "AUTH_REQUIRED" };
      return next(err);
    }

    // 3. Authenticate with shared validateUserSession
    try {
      const { user, tenant, tenantId, decoded } = await validateUserSession(token);

      // 4. Per-user connection cap: disconnect OLDEST socket if cap is exceeded
      const isDemo = user.isDemo || tenant.isDemo || tenant.slug === "demo-workspace";
      const maxCap = isDemo ? SOCKET_MAX_PER_DEMO_USER : SOCKET_MAX_PER_USER;

      const userRoom = `user:${user._id.toString()}`;
      const existingSockets = await io.in(userRoom).fetchSockets();

      if (existingSockets.length >= maxCap) {
        // Sort oldest first by connection time
        existingSockets.sort((a, b) => (a.handshake.issued || 0) - (b.handshake.issued || 0));
        const excess = existingSockets.length - maxCap + 1;
        for (let i = 0; i < excess; i++) {
          existingSockets[i].disconnect(true);
        }
      }

      // Attach authenticated context to socket instance
      socket.user = user;
      socket.tenant = tenant;
      socket.tenantId = tenantId;
      socket.authToken = token;
      socket.tokenExp = decoded.exp ? decoded.exp * 1000 : null;

      next();
    } catch (err) {
      recordFailedAuth(clientIp);
      const authErr = new Error(err.message || "Authentication failed");
      const socketCode =
        err.code === "TENANT_SUSPENDED" || err.code === "SESSION_REVOKED"
          ? "SESSION_REVOKED"
          : err.code || "TOKEN_INVALID";
      authErr.data = { code: socketCode };
      return next(authErr);
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const tenantRoom = `tenant:${socket.tenantId.toString()}`;
    const userRoom = `user:${socket.user._id.toString()}`;

    // Join strictly the authorized tenant and user rooms
    socket.join(tenantRoom);
    socket.join(userRoom);

    // Drop all client-to-server custom event listeners (built-in ping/pong is used for heartbeat)
    // Client cannot broadcast or join arbitrary rooms

    // Token expiry disconnect timer
    let expiryTimer = null;
    if (socket.tokenExp) {
      const msUntilExpiry = Math.max(0, socket.tokenExp - Date.now());
      expiryTimer = setTimeout(() => {
        socket.disconnect(true);
      }, msUntilExpiry);
    }

    // Periodic session re-validation every 10 minutes
    const periodicCheck = setInterval(async () => {
      try {
        const session = await validateUserSession(socket.authToken);
        if (!session || !session.user) {
          clearInterval(periodicCheck);
          socket.disconnect(true);
        }
      } catch (err) {
        clearInterval(periodicCheck);
        socket.disconnect(true);
      }
    }, 10 * 60 * 1000);

    socket.on("disconnect", () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      clearInterval(periodicCheck);
    });
  });
};

export default initializeSocket;