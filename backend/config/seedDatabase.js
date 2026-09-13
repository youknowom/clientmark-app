import PlanModel from "../models/planModel.js";

// ============================================================
// Default Plans — seeded once globally (not per-tenant)
// ============================================================
const DEFAULT_PLANS = [
  {
    planName: "Free",
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
    isActive: true,
    sortOrder: 1,
  },
  {
    planName: "Starter",
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
    isActive: true,
    sortOrder: 2,
  },
  {
    planName: "Professional",
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
    isActive: true,
    sortOrder: 3,
  },
  {
    planName: "Enterprise",
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
    isActive: true,
    sortOrder: 4,
  },
];

// ============================================================
// Seed global data (plans only — runs once on startup)
// ============================================================
const seedDatabase = async () => {
  try {
    // Seed plans if they don't exist
    const planCount = await PlanModel.countDocuments();
    if (planCount === 0) {
      await PlanModel.insertMany(DEFAULT_PLANS);
      console.log("🌱 Plans seeded (Free, Starter, Professional, Enterprise)");
    }

    console.log("✅ Global seed check complete.");
  } catch (error) {
    console.error("❌ Database seeding failed:", error.message);
  }
};

export default seedDatabase;
