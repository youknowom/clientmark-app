import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";
import ProjectModel from "../models/projectModel.js";

const getPortalSecret = () => {
  const secret = process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: PORTAL_JWT_SECRET or JWT_SECRET must be configured in production.");
    }
    return "dev_portal_jwt_secret_only";
  }
  return secret;
};

/**
 * Middleware for Client Portal access.
 * Accepts either:
 * 1. Client Portal Token (signed with PORTAL_JWT_SECRET, purpose: "portal", matching projectId and portalVersion)
 * 2. Authenticated Staff User Token (signed with JWT_SECRET, active user, matching project.tenantId === user.tenantId)
 */
export const verifyPortalSession = async (req, res, next) => {
  try {
    const rawAuthHeader = req.headers.authorization || req.headers.Authorization;
    const portalTokenHeader = req.headers["x-portal-token"];
    let token = null;

    if (portalTokenHeader && typeof portalTokenHeader === "string") {
      token = portalTokenHeader.trim();
    } else if (rawAuthHeader && rawAuthHeader.startsWith("Bearer ")) {
      token = rawAuthHeader.split(" ")[1]?.trim();
    }

    // Determine the requested project identifier from params or query
    const identifier = (req.query?.slug || req.query?.portalKey || req.params?.slug || req.params?.portalKey || "").trim();
    if (!identifier) {
      return res.status(400).json({ success: false, message: "Project identifier is required." });
    }

    // Dual-lookup: lookup project by portalKey or legacy slug
    const project = await ProjectModel.findOne({
      $or: [{ portalKey: identifier }, { slug: identifier }],
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    req.project = project;

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "PORTAL_AUTH_REQUIRED",
        message: "Portal access token is missing. Please verify with WhatsApp OTP.",
      });
    }

    // Attempt 1: Verify as Client Portal Token
    try {
      const decodedPortal = jwt.verify(token, getPortalSecret());
      if (decodedPortal && decodedPortal.purpose === "portal") {
        if (decodedPortal.projectId?.toString() !== project._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Portal session token does not match the requested project.",
          });
        }

        const currentVersion = project.portalVersion || 1;
        if (decodedPortal.portalVersion !== currentVersion) {
          return res.status(401).json({
            success: false,
            code: "PORTAL_ROTATED",
            message: "This portal link has been regenerated. Please re-verify.",
          });
        }

        req.isPortalClient = true;
        req.portalSession = decodedPortal;
        return next();
      }
    } catch (portalErr) {
      // Not a valid portal token, fall through to check staff token
    }

    // Attempt 2: Verify as Internal Staff Token
    try {
      const decodedStaff = jwt.verify(token, process.env.JWT_SECRET);
      if (decodedStaff && decodedStaff.userId) {
        if (decodedStaff.purpose === "portal") {
          return res.status(401).json({
            success: false,
            message: "Portal tokens cannot access staff contexts.",
          });
        }

        const user = await UserModel.findById(decodedStaff.userId).lean();
        if (!user || user.status !== "Active") {
          return res.status(401).json({
            success: false,
            message: "Staff user account is inactive or not found.",
          });
        }

        // Check if password changed after token was issued
        if (user.passwordChangedAt && decodedStaff.iat) {
          const changedAtTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
          if (decodedStaff.iat < changedAtTime) {
            return res.status(401).json({
              success: false,
              message: "Session expired due to password change. Please log in again.",
            });
          }
        }

        // Cross-tenant verification: staff can ONLY access projects belonging to their own tenant
        if (project.tenantId.toString() !== user.tenantId.toString()) {
          return res.status(403).json({
            success: false,
            message: "Cross-tenant access forbidden. You do not have permission to view this project.",
          });
        }

        req.user = user;
        req.tenantId = user.tenantId;
        req.isStaff = true;
        return next();
      }
    } catch (staffErr) {
      // Neither valid portal token nor valid staff token
    }

    return res.status(401).json({
      success: false,
      code: "INVALID_SESSION",
      message: "Invalid or expired session. Please verify via WhatsApp OTP.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
