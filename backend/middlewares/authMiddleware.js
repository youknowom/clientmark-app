import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";
import TenantModel from "../models/tenantModel.js";

/**
 * Normalize tokenVersion across user records and JWT payloads.
 * Default is 1 if unset/missing.
 */
export const normalizeTokenVersion = (user) => {
  return user?.tokenVersion ?? 1;
};

/**
 * Shared validation logic for both HTTP authUser and Socket.IO connection authentication.
 * Derives tenantId and userId STRICTLY from database user/tenant records.
 */
export const validateUserSession = async (token, { allowGraceStatus = false } = {}) => {
  if (!token) {
    const err = new Error("Authentication required");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (jwtErr) {
    const err = new Error("Invalid or expired token");
    err.code = "TOKEN_INVALID";
    throw err;
  }

  // Reject tokens with purpose "portal" from accessing staff contexts
  if (decoded && decoded.purpose === "portal") {
    const err = new Error("Portal tokens are not valid for staff contexts");
    err.code = "TOKEN_INVALID";
    throw err;
  }

  const user = await UserModel.findOne({ _id: decoded.userId })
    .populate("roleId")
    .select("-password");

  if (!user || user.status !== "Active" || !user.tenantId) {
    const err = new Error("User account is inactive or not found");
    err.code = "SESSION_REVOKED";
    throw err;
  }

  const tenant = await TenantModel.findById(user.tenantId).lean();
  if (!tenant || tenant.status === "Suspended") {
    const err = new Error("Tenant account is suspended");
    err.code = "TENANT_SUSPENDED";
    throw err;
  }

  const blockedStatuses = ["Cancelled", "Expired", "PastDue"];
  if (blockedStatuses.includes(tenant.status) && !allowGraceStatus) {
    const err = new Error(`Tenant account is ${tenant.status.toLowerCase()}`);
    err.code = "SESSION_REVOKED";
    throw err;
  }

  const activeVersion = normalizeTokenVersion(user);
  const tokenVersion = decoded.tokenVersion ?? 1;

  // Invalidate sessions with stale tokenVersion or issued prior to password change
  if (
    tokenVersion !== activeVersion ||
    (user.passwordChangedAt && decoded.iat && decoded.iat * 1000 < user.passwordChangedAt.getTime())
  ) {
    const err = new Error("Session expired due to password change. Please log in again.");
    err.code = "SESSION_REVOKED";
    throw err;
  }

  return { user, tenant, tenantId: user.tenantId, decoded };
};

// Auth user — verifies JWT and attaches user + tenantId to request
const authUser = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized. Token is required.", success: false });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { user, tenant } = await validateUserSession(token, { allowGraceStatus: true });

    req.user = user;
    req.user.tenantId = user.tenantId;
    req.tenantId = user.tenantId;
    req.tenant = tenant;

    next();
  } catch (error) {
    let statusCode = 401;
    if (error.code === "TENANT_SUSPENDED") {
      statusCode = 403;
    } else if (error.code === "AUTH_REQUIRED" || error.code === "TOKEN_INVALID" || error.code === "SESSION_REVOKED") {
      statusCode = 401;
    } else {
      statusCode = 403;
    }
    return res.status(statusCode).json({
      message: error.message || "Unauthorized.",
      success: false,
    });
  }
};

// Permission auth
const authAccess = (...access) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.roleId) {
        return res
          .status(403)
          .json({ message: "Access Denied", success: false });
      }

      const permissions = user.roleId.permissions || [];

      const hasPermission = access.some((p) => permissions.includes(p));

      if (!hasPermission) {
        return res.status(403).json({
          message: "You don't have required permission",
          success: false,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message: error.message,
        success: false,
      });
    }
  };
};

// Optional auth — attaches user and tenantId if valid token provided, but doesn't block unauthenticated requests
const optionalAuthUser = async (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.tenantId) {
      req.tenantId = decoded.tenantId;
    }

    const user = await UserModel.findOne({ _id: decoded.userId })
      .populate("roleId")
      .select("-password");

    if (user && user.status === "Active" && user.tenantId) {
      req.user = user;
      req.user.tenantId = user.tenantId;
      req.tenantId = user.tenantId;
    }
  } catch (err) {
    // Ignore invalid/expired token on optional routes
  }

  next();
};

export { authUser, authAccess, optionalAuthUser };
