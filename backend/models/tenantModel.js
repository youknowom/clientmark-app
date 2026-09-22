import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    domain: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Suspended", "Cancelled"],
      default: "Active",
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "plans",
      default: null,
    },

    subscriptionStart: {
      type: Date,
      default: null,
    },

    subscriptionEnd: {
      type: Date,
      default: null,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    isTrialActive: {
      type: Boolean,
      default: true,
    },

    isDemo: {
      type: Boolean,
      default: false,
    },

    settings: {
      logo: { type: String, default: "" },
      favicon: { type: String, default: "" },
      projectName: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const TenantModel = mongoose.model("tenants", TenantSchema);

export default TenantModel;
