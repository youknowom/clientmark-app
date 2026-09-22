import mongoose from "mongoose";

const WorkspacePreferencesSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
    ownerRole: {
      type: String,
      default: "",
    },
    teamSize: {
      type: String,
      default: "",
    },
    primaryUseCases: [
      {
        type: String,
      },
    ],
    industry: {
      type: String,
      default: "",
    },
    currentTools: {
      type: String,
      default: "",
    },
    brandColor: {
      type: String,
      default: "#E05E3A",
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const WorkspacePreferencesModel = mongoose.model(
  "workspace_preferences",
  WorkspacePreferencesSchema
);

export default WorkspacePreferencesModel;
