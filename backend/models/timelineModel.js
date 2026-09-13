import mongoose from "mongoose";

const TimelineSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    addById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projects",
      required: true,
      index: true,
    },
    moduleName: {
      type: String,
    },
    phase: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    attachements: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const timelineModel = mongoose.model("timelines", TimelineSchema);

export default timelineModel;
