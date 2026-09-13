import TenantModel from "../models/tenantModel.js";

/**
 * Tenant validation middleware.
 * Runs AFTER authUser middleware.
 * Extracts tenantId from req.user and validates the tenant is active.
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(403).json({
        message: "Tenant information missing. Access denied.",
        success: false,
      });
    }

    const tenant = await TenantModel.findById(tenantId).lean();

    if (!tenant) {
      return res.status(403).json({
        message: "Tenant not found. Access denied.",
        success: false,
      });
    }

    if (tenant.status === "Suspended") {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
        success: false,
      });
    }

    if (tenant.status === "Cancelled") {
      return res.status(403).json({
        message: "Your account has been cancelled. Please contact support.",
        success: false,
      });
    }

    // Attach tenantId and tenant info to request for use in controllers
    req.tenantId = tenantId;
    req.tenant = tenant;

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Tenant validation failed.",
      success: false,
    });
  }
};

export default tenantMiddleware;
