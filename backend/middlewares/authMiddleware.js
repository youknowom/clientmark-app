import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await UserModel.findOne({ _id: decoded.userId })
      .populate("roleId")
      .select("-password");

    if (!user) {
      return res.status(403).json({ message: "Unauthorized User." });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        message: "User account is not active",
        success: false,
      });
    }

    // Attach tenantId from JWT payload (or from user record as fallback)
    req.user = user;
    req.user.tenantId = decoded.tenantId || user.tenantId;
    req.tenantId = decoded.tenantId || user.tenantId;

    next();
  } catch (error) {
    return res.status(403).json({
      message: "Unauthorized. Invalid or expired token.",
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

    if (user && user.status === "Active") {
      req.user = user;
      req.user.tenantId = decoded.tenantId || user.tenantId;
      req.tenantId = decoded.tenantId || user.tenantId;
    }
  } catch (err) {
    // Ignore invalid/expired token on optional routes
  }

  next();
};

export { authUser, authAccess, optionalAuthUser };
