import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      default: 0,
    },

    yearlyPrice: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    limits: {
      maxUsers: { type: Number, default: 3 },       // -1 = unlimited
      maxLeads: { type: Number, default: 100 },
      maxBranches: { type: Number, default: 1 },
      maxProjects: { type: Number, default: 5 },
      whatsappEnabled: { type: Boolean, default: false },
      reportsEnabled: { type: Boolean, default: false },
      apiAccessEnabled: { type: Boolean, default: false },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const PlanModel = mongoose.model("plans", PlanSchema);

export default PlanModel;
