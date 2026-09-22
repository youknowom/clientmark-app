import PlanModel from "../models/planModel.js";

// ============================================================
// Default Plans — seeded once globally (not per-tenant)
// ============================================================
const DEFAULT_PLANS = [
  {
    planName: "Free",
    slug: "free",
    description: "Ideal for small teams and agency evaluation.",
    price: 0,
    yearlyPrice: 0,
    currency: "INR",
    limits: {
      maxUsers: 3,
      maxLeads: 100,
      maxBranches: 1,
      maxProjects: 5,
      whatsappEnabled: false,
      reportsEnabled: false,
      apiAccessEnabled: false,
    },
    features: [
      "Up to 3 team members",
      "Up to 100 leads",
      "1 branch location",
      "Up to 5 active projects",
      "Standard email support",
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    planName: "Starter",
    slug: "starter",
    description: "For active agencies closing deals and executing projects.",
    price: 999,
    yearlyPrice: 9990,
    currency: "INR",
    limits: {
      maxUsers: 10,
      maxLeads: 1000,
      maxBranches: 2,
      maxProjects: 20,
      whatsappEnabled: true,
      reportsEnabled: true,
      apiAccessEnabled: false,
    },
    features: [
      "Up to 10 team members",
      "Up to 1,000 leads",
      "2 branch locations",
      "Up to 20 active projects",
      "WhatsApp notifications & client OTP",
      "Export & performance reports",
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    planName: "Professional",
    slug: "professional",
    description: "For established agencies scaling multiple sales and dev teams.",
    price: 2499,
    yearlyPrice: 24990,
    currency: "INR",
    limits: {
      maxUsers: 25,
      maxLeads: 10000,
      maxBranches: 5,
      maxProjects: 100,
      whatsappEnabled: true,
      reportsEnabled: true,
      apiAccessEnabled: true,
    },
    features: [
      "Up to 25 team members",
      "Up to 10,000 leads",
      "5 branch locations",
      "Up to 100 active projects",
      "Full WhatsApp integration & templates",
      "Advanced reports & performance analytics",
      "API access & webhooks",
      "Priority customer support",
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    planName: "Enterprise",
    slug: "enterprise",
    description: "For large firms requiring unlimited scale and custom pipelines.",
    price: 4999,
    yearlyPrice: 49990,
    currency: "INR",
    limits: {
      maxUsers: -1,
      maxLeads: -1,
      maxBranches: -1,
      maxProjects: -1,
      whatsappEnabled: true,
      reportsEnabled: true,
      apiAccessEnabled: true,
    },
    features: [
      "Unlimited team members",
      "Unlimited leads",
      "Unlimited branches",
      "Unlimited projects",
      "Full WhatsApp automation",
      "Full reports & deep analytics",
      "Full API access",
      "Dedicated account manager & SLA",
    ],
    isActive: true,
    sortOrder: 4,
  },
];

// ============================================================
// Seed global data (plans only — runs once on startup)
// ============================================================
const seedDatabase = async () => {
  try {
    // Drop legacy single-tenant indexes on roles collection if they exist
    try {
      const RoleModel = (await import("../models/roleModel.js")).default;
      await RoleModel.collection.dropIndex("roleName_1").catch(() => {});
      await RoleModel.collection.dropIndex("priority_1").catch(() => {});
      await RoleModel.syncIndexes().catch(() => {});
    } catch (e) {
      // index already dropped or missing
    }

    // Upsert/sync plans with latest descriptions, limits, and features
    for (const planData of DEFAULT_PLANS) {
      await PlanModel.findOneAndUpdate(
        { planName: planData.planName },
        {
          $set: {
            slug: planData.slug,
            description: planData.description,
            features: planData.features,
            price: planData.price,
            yearlyPrice: planData.yearlyPrice,
            currency: planData.currency,
            limits: planData.limits,
            isActive: planData.isActive,
            sortOrder: planData.sortOrder,
          },
        },
        { upsert: true, new: true }
      );
    }
    console.log("🌱 Plans synchronized (Free, Starter, Professional, Enterprise)");

    console.log("✅ Global seed check complete.");
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
  }
};

export default seedDatabase;
