import mongoose from "mongoose";

const SoftwareSettingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    mainLogo: {
      type: String,
    },

    logoWidth: {
      type: Number,
    },

    logoHeight: {
      type: Number,
    },

    projectName: {
      type: String,
    },

    host: {
      type: String,
    },

    email: {
      type: String,
    },

    password: {
      type: String,
    },

    phone: {
      type: String,
    },

    companyWhatsapp: {
      type: String,
    },

    favicon: {
      type: String,
    },
  },
  { timestamps: true },
);

const SoftwareSettingModel = mongoose.model(
  "software_settings",
  SoftwareSettingSchema,
);

export default SoftwareSettingModel;
