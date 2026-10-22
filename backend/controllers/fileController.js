import jwt from "jsonwebtoken";
import path from "path";
import FileModel from "../models/fileModel.js";
import UserModel from "../models/userModel.js";
import TenantModel from "../models/tenantModel.js";
import ProjectModel from "../models/projectModel.js";
import storageAdapter from "../services/storage/index.js";

/**
 * GET /files/:fileId
 * Serves authenticated private files with streaming, nosniff, and strict tenant/portal isolation.
 */
export const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId || typeof fileId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid file ID" });
    }

    // Guard against path traversal in fileId param
    if (fileId.includes("..") || fileId.includes("/") || fileId.includes("\\")) {
      return res.status(400).json({ success: false, message: "Invalid file identifier" });
    }

    const file = await FileModel.findOne({ fileId }).lean();
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // If file is marked public, allow open retrieval
    if (file.isPublic) {
      return streamFileResponse(file, req, res);
    }

    // Authenticate token: check Bearer header, X-Portal-Token, or query token
    const authHeader = req.headers["authorization"];
    const portalHeader = req.headers["x-portal-token"];
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (portalHeader) {
      token = portalHeader;
    } else if (req.query?.token) {
      token = String(req.query.token);
    } else if (req.query?.portalToken) {
      token = String(req.query.portalToken);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access this file",
      });
    }

    let isAuthorized = false;

    // 1. Try Staff JWT verification
    try {
      const decodedStaff = jwt.verify(token, process.env.JWT_SECRET);
      if (decodedStaff && decodedStaff.purpose !== "portal" && (decodedStaff.userId || decodedStaff._id)) {
        const userId = decodedStaff.userId || decodedStaff._id;
        const user = await UserModel.findById(userId).select("tenantId status tokenVersion").lean();

        if (user && user.status === "Active") {
          const tenant = await TenantModel.findById(user.tenantId).select("status").lean();
          if (tenant && tenant.status !== "Suspended") {
            // Check tenant isolation: staff tenant MUST match file tenant
            if (user.tenantId.toString() === file.tenantId.toString()) {
              isAuthorized = true;
            } else {
              return res.status(403).json({
                success: false,
                message: "Access denied. File belongs to another tenant.",
              });
            }
          }
        }
      }
    } catch (staffJwtErr) {
      // Not a valid staff token, will attempt portal token next
    }

    // 2. If not authorized by staff JWT, try Portal JWT verification
    if (!isAuthorized) {
      try {
        const decodedPortal = jwt.verify(token, process.env.PORTAL_JWT_SECRET);
        if (decodedPortal && decodedPortal.purpose === "portal") {
          const portalTenantId = decodedPortal.tenantId;
          const portalProjectId = decodedPortal.projectId;

          // Tenant must match
          if (portalTenantId && portalTenantId.toString() === file.tenantId.toString()) {
            // Project must match if file is project-scoped
            if (file.projectId && portalProjectId && file.projectId.toString() === portalProjectId.toString()) {
              isAuthorized = true;
            } else if (!file.projectId) {
              // File is tenant-level, portal token only permitted for its specific project files
              return res.status(403).json({
                success: false,
                message: "Access denied. Portal tokens only have access to project-scoped files.",
              });
            } else {
              return res.status(403).json({
                success: false,
                message: "Access denied. Portal token does not match file project.",
              });
            }
          } else {
            return res.status(403).json({
              success: false,
              message: "Access denied. File belongs to another tenant.",
            });
          }
        }
      } catch (portalJwtErr) {
        // Both verifications failed
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token for file access",
      });
    }

    return streamFileResponse(file, req, res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const streamFileResponse = (file, req, res) => {
  const stream = storageAdapter.getStream(file.storagePath);
  if (!stream) {
    return res.status(404).json({ success: false, message: "File data not found on disk" });
  }

  const safeOriginalName = path.basename(file.originalName || "download").replace(/["\r\n]/g, "_");
  const dispositionType = req.query.download === "true" ? "attachment" : "inline";

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(safeOriginalName)}"`);
  if (file.size) {
    res.setHeader("Content-Length", file.size);
  }

  stream.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Error streaming file" });
    }
  });

  stream.pipe(res);
};

export default {
  getFile,
};
