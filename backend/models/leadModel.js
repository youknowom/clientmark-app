import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    leadNo: {
      type: String,
    },

    fullName: {
      type: String,
      required: true,
    },

    mobileNo: {
      type: String,
      required: true,
    },

    whatsappNo: {
      type: String,
    },

    email: {
      type: String,
    },

    gender: {
      type: String,
    },

    country: {
      type: String,
    },

    state: {
      type: String,
    },

    city: {
      type: String,
    },

    address: {
      type: String,
    },

    businessName: {
      type: String,
    },

    serviceRequirement: {
      type: String,
    },

    remark: {
      type: String,
    },

    assignedToTelecaller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      index: true,
    },

    assignedToBDE: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      index: true,
    },

    leadStage: {
      type: String,
      default: "NEW",
    },

    callStatus: {
      type: String,
      default: "PENDING",
    },

    leadStatus: {
      type: String,
      default: "NEW",
    },

    currentIndex: {
      type: Number,
      index: true,
    },

    addById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    updateById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { timestamps: true },
);

const LeadModel = mongoose.model("leads", LeadSchema);

export default LeadModel;

