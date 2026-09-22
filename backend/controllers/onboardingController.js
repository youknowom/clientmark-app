import WorkspacePreferencesModel from "../models/workspacePreferencesModel.js";
import LeadModel from "../models/leadModel.js";
import ProjectModel from "../models/projectModel.js";
import ThemeModel from "../models/themeModel.js";

// ── Get Onboarding Status ──────────────────────────────────────────────────
export const getOnboardingStatus = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant ID required" });
    }

    const preferences = await WorkspacePreferencesModel.findOne({ tenantId });
    if (preferences && preferences.onboardingComplete) {
      return res.status(200).json({
        success: true,
        shouldShowOnboarding: false,
        preferences,
      });
    }

    // Check if workspace already has existing data (not a brand new workspace)
    const [leadCount, projectCount] = await Promise.all([
      LeadModel.countDocuments({ tenantId }),
      ProjectModel.countDocuments({ tenantId }),
    ]);

    const hasData = leadCount > 0 || projectCount > 0;
    // Show wizard only if onboarding has not been completed and workspace is empty or has zero leads
    const shouldShow = !preferences?.onboardingComplete && !hasData;

    return res.status(200).json({
      success: true,
      shouldShowOnboarding: shouldShow,
      preferences: preferences || null,
      leadCount,
      projectCount,
    });
  } catch (error) {
    console.error("Error in getOnboardingStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Complete Onboarding ────────────────────────────────────────────────────
export const completeOnboarding = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant ID required" });
    }

    const {
      ownerRole,
      teamSize,
      primaryUseCases,
      industry,
      currentTools,
      brandColor,
    } = req.body;

    const updated = await WorkspacePreferencesModel.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          tenantId,
          userId,
          ownerRole: ownerRole || "",
          teamSize: teamSize || "",
          primaryUseCases: Array.isArray(primaryUseCases) ? primaryUseCases : [],
          industry: industry || "",
          currentTools: currentTools || "",
          brandColor: brandColor || "#E05E3A",
          onboardingComplete: true,
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // If a brand color was selected, update or create ThemeModel for the tenant
    if (brandColor) {
      await ThemeModel.findOneAndUpdate(
        { tenantId },
        {
          $set: {
            tenantId,
            "mainTheme.secondaryColor": brandColor,
          },
        },
        { upsert: true }
      ).catch((err) => console.warn("Failed to sync theme color:", err.message));
    }

    return res.status(200).json({
      success: true,
      message: "Onboarding completed successfully",
      preferences: updated,
    });
  } catch (error) {
    console.error("Error in completeOnboarding:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Skip Onboarding ────────────────────────────────────────────────────────
export const skipOnboarding = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?._id;

    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Tenant ID required" });
    }

    const updated = await WorkspacePreferencesModel.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          tenantId,
          userId,
          onboardingComplete: true,
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Onboarding skipped",
      preferences: updated,
    });
  } catch (error) {
    console.error("Error in skipOnboarding:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
