import TenantModel from "../models/tenantModel.js";
import { TENANT_STATUS } from "../constants/billingStatuses.js";

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

    // Suspended tenants are blocked everywhere unconditionally
    if (tenant.status === TENANT_STATUS.SUSPENDED) {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
        success: false,
      });
    }

    const fullPath = (req.baseUrl || "") + (req.path || "");

    // Grace Policy: PastDue tenants keep FULL access during GRACE_DAYS
    const graceDays = parseInt(process.env.GRACE_DAYS || "5", 10);
    let isWithinGrace = false;

    if (tenant.status === TENANT_STATUS.PAST_DUE) {
      const graceStart = tenant.gracePeriodStartedAt || tenant.subscriptionEnd || tenant.updatedAt || tenant.createdAt;
      if (graceStart) {
        const daysPast = Math.floor((Date.now() - new Date(graceStart).getTime()) / (1000 * 60 * 60 * 24));
        if (daysPast <= graceDays) {
          isWithinGrace = true;
        }
      }
    }

    // Cancelled, Expired, or PastDue beyond grace period are restricted to billing
    const isRestricted =
      tenant.status === TENANT_STATUS.CANCELLED ||
      tenant.status === TENANT_STATUS.EXPIRED ||
      (tenant.status === TENANT_STATUS.PAST_DUE && !isWithinGrace) ||
      (tenant.status !== TENANT_STATUS.ACTIVE && !tenant.isDemo && !isWithinGrace);

    if (isRestricted) {
      const isGraceAllowed =
        fullPath.startsWith("/subscription") ||
        fullPath === "/tenant/my-tenant" ||
        fullPath === "/user/get-login-user-detail";

      if (!isGraceAllowed) {
        return res.status(403).json({
          message: "Your subscription has expired or is inactive. Please visit billing to continue.",
          success: false,
          isBillingRestricted: true,
        });
      }
    }

    // Attach tenantId and tenant info to request for use in controllers
    req.tenantId = tenantId;
    req.tenant = tenant;
    req.isDemo = tenant.isDemo || req.user?.isDemo || false;

    // Safety guardrails for demo sandbox: block all mutating methods except explicit allow-list
    if (req.isDemo) {
      TenantModel.updateOne({ _id: tenantId }, { $set: { lastActiveAt: new Date() } }).exec().catch(() => {});

      const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

      if (isMutating) {
        // Explicitly block self-profile update in demo mode
        if (fullPath === "/user/update-self-profile") {
          return res.status(403).json({
            success: false,
            isDemoBlocked: true,
            message: "Profile updates are disabled in Live Demo mode.",
          });
        }

        // Exact method + route pattern allow-list
        const isAllowlisted =
          (req.method === "POST" && fullPath === "/lead/create-lead") ||
          (req.method === "PUT" && fullPath === "/lead/update-lead") ||
          (req.method === "POST" && fullPath === "/chatbot/message") ||
          (req.method === "PUT" && fullPath === "/notification/mark-single-read");

        if (!isAllowlisted) {
          return res.status(403).json({
            success: false,
            isDemoBlocked: true,
            message:
              "This action is disabled in Live Demo mode. Start your 14-day free trial to manage your own workspace!",
          });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Tenant validation failed.",
      success: false,
    });
  }
};

export default tenantMiddleware;
