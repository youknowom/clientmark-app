import UserModel from "../models/userModel.js";
import LeadModel from "../models/leadModel.js";
import BranchModel from "../models/branchModel.js";
import ProjectModel from "../models/projectModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import PlanModel from "../models/planModel.js";

/**
 * Helper: Get the active plan limits for a tenant
 */
const getTenantLimits = async (tenantId) => {
  const subscription = await SubscriptionModel.findOne({
    tenantId,
    status: { $in: ["trial", "active"] },
  })
    .sort({ createdAt: -1 })
    .populate("planId")
    .lean();

  if (!subscription || !subscription.planId) {
    return null;
  }

  return subscription.planId.limits;
};

/**
 * Check if tenant has reached max user limit
 */
const checkUserLimit = async (req, res, next) => {
  try {
    const limits = await getTenantLimits(req.tenantId);

    if (!limits) {
      return res.status(403).json({
        message: "No active subscription found. Please subscribe to a plan.",
        success: false,
      });
    }

    if (limits.maxUsers === -1) return next(); // unlimited

    const currentCount = await UserModel.countDocuments({ tenantId: req.tenantId });

    if (currentCount >= limits.maxUsers) {
      return res.status(403).json({
        message: `You've reached the maximum of ${limits.maxUsers} users on your current plan. Please upgrade to add more users.`,
        success: false,
        limitReached: true,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

/**
 * Check if tenant has reached max lead limit
 */
const checkLeadLimit = async (req, res, next) => {
  try {
    const limits = await getTenantLimits(req.tenantId);

    if (!limits) {
      return res.status(403).json({
        message: "No active subscription found. Please subscribe to a plan.",
        success: false,
      });
    }

    if (limits.maxLeads === -1) return next(); // unlimited

    const currentCount = await LeadModel.countDocuments({ tenantId: req.tenantId });

    if (currentCount >= limits.maxLeads) {
      return res.status(403).json({
        message: `You've reached the maximum of ${limits.maxLeads} leads on your current plan. Please upgrade to add more leads.`,
        success: false,
        limitReached: true,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

/**
 * Check if tenant has reached max branch limit
 */
const checkBranchLimit = async (req, res, next) => {
  try {
    const limits = await getTenantLimits(req.tenantId);

    if (!limits) {
      return res.status(403).json({
        message: "No active subscription found. Please subscribe to a plan.",
        success: false,
      });
    }

    if (limits.maxBranches === -1) return next(); // unlimited

    const currentCount = await BranchModel.countDocuments({ tenantId: req.tenantId });

    if (currentCount >= limits.maxBranches) {
      return res.status(403).json({
        message: `You've reached the maximum of ${limits.maxBranches} branches on your current plan. Please upgrade to add more branches.`,
        success: false,
        limitReached: true,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

/**
 * Check if tenant has reached max project limit
 */
const checkProjectLimit = async (req, res, next) => {
  try {
    const limits = await getTenantLimits(req.tenantId);

    if (!limits) {
      return res.status(403).json({
        message: "No active subscription found. Please subscribe to a plan.",
        success: false,
      });
    }

    if (limits.maxProjects === -1) return next(); // unlimited

    const currentCount = await ProjectModel.countDocuments({ tenantId: req.tenantId });

    if (currentCount >= limits.maxProjects) {
      return res.status(403).json({
        message: `You've reached the maximum of ${limits.maxProjects} projects on your current plan. Please upgrade to add more projects.`,
        success: false,
        limitReached: true,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

/**
 * Check if a specific feature is enabled for the tenant's plan
 * Usage: checkFeatureAccess("whatsappEnabled")
 */
const checkFeatureAccess = (featureKey) => {
  return async (req, res, next) => {
    try {
      const limits = await getTenantLimits(req.tenantId);

      if (!limits) {
        return res.status(403).json({
          message: "No active subscription found. Please subscribe to a plan.",
          success: false,
        });
      }

      if (limits[featureKey] !== true) {
        return res.status(403).json({
          message: "This feature is not available on your current plan. Please upgrade.",
          success: false,
          limitReached: true,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: error.message, success: false });
    }
  };
};

export {
  checkUserLimit,
  checkLeadLimit,
  checkBranchLimit,
  checkProjectLimit,
  checkFeatureAccess,
};
