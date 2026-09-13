import UserModel from "../models/userModel.js";
import LeadModel from "../models/leadModel.js";
import BranchModel from "../models/branchModel.js";
import ProjectModel from "../models/projectModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";

// ══════════════════════════════════════════════════════════════
// GET /subscription/plans — List all available plans (public)
// ══════════════════════════════════════════════════════════════
const getPlans = async (req, res) => {
  try {
    const plans = await PlanModel.find({ isActive: true }).sort({ sortOrder: 1 });

    return res.status(200).json({
      message: "Successfully fetched plans.",
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/my-plan — Get current tenant's plan (protected)
// ══════════════════════════════════════════════════════════════
const getMyPlan = async (req, res) => {
  try {
    const subscription = await SubscriptionModel.findOne({
      tenantId: req.tenantId,
      status: { $in: ["trial", "active"] },
    })
      .populate("planId")
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return res.status(200).json({
        message: "No active subscription.",
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      message: "Successfully fetched subscription.",
      success: true,
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/usage — Get current usage vs limits (protected)
// ══════════════════════════════════════════════════════════════
const getUsage = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Get current plan limits
    const subscription = await SubscriptionModel.findOne({
      tenantId,
      status: { $in: ["trial", "active"] },
    })
      .populate("planId")
      .sort({ createdAt: -1 })
      .lean();

    const limits = subscription?.planId?.limits || {};

    // Count current usage
    const [userCount, leadCount, branchCount, projectCount] = await Promise.all([
      UserModel.countDocuments({ tenantId }),
      LeadModel.countDocuments({ tenantId }),
      BranchModel.countDocuments({ tenantId }),
      ProjectModel.countDocuments({ tenantId }),
    ]);

    return res.status(200).json({
      message: "Successfully fetched usage.",
      success: true,
      data: {
        plan: subscription?.planId?.planName || "No Plan",
        status: subscription?.status || "none",
        trialEndsAt: subscription?.trialEndsAt,
        usage: {
          users: { current: userCount, max: limits.maxUsers || 0 },
          leads: { current: leadCount, max: limits.maxLeads || 0 },
          branches: { current: branchCount, max: limits.maxBranches || 0 },
          projects: { current: projectCount, max: limits.maxProjects || 0 },
        },
        features: {
          whatsapp: limits.whatsappEnabled || false,
          reports: limits.reportsEnabled || false,
          apiAccess: limits.apiAccessEnabled || false,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/upgrade — Upgrade plan (placeholder)
// ══════════════════════════════════════════════════════════════
const upgradePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const tenantId = req.tenantId;

    if (!planId) {
      return res.status(400).json({
        message: "Plan ID is required.",
        success: false,
      });
    }

    const plan = await PlanModel.findById(planId);
    if (!plan) {
      return res.status(404).json({
        message: "Plan not found.",
        success: false,
      });
    }

    // Deactivate current subscription
    await SubscriptionModel.updateMany(
      { tenantId, status: { $in: ["trial", "active"] } },
      { $set: { status: "cancelled" } }
    );

    // Create new subscription
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    const newSubscription = await SubscriptionModel.create({
      tenantId,
      planId: plan._id,
      status: "active",
      startDate: new Date(),
      endDate,
    });

    // Update tenant's plan reference
    await TenantModel.findByIdAndUpdate(tenantId, {
      planId: plan._id,
      isTrialActive: false,
    });

    return res.status(200).json({
      message: `Successfully upgraded to ${plan.planName} plan.`,
      success: true,
      data: newSubscription,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

import TenantModel from "../models/tenantModel.js";

export { getPlans, getMyPlan, getUsage, upgradePlan };
