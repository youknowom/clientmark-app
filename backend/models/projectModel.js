import mongoose from "mongoose";

// Embedded status history schema
const ProjectStatusHistorySchema = new mongoose.Schema(
  {
    oldStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    changedAt: { type: Date, default: Date.now, required: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    budgetAtChange: { type: Number, default: 0 },
  },
  { _id: false },
);

const ProjectSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    ProjectId: {
      type: String,
      unique: true,
      index: true,
    },

    ProjectName: {
      type: String,
      required: true,
      trim: true,
    },

    ClientName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
    },

    mobileNo: {
      type: String,
      trim: true,
    },

    whatsappNo: {
      type: String,
      trim: true,
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

    ProjectType: {
      type: String,
    },

    ProjectDescription: {
      type: String,
    },

    ProjectStartDate: {
      type: Date,
    },

    ProjectEndDate: {
      type: Date,
    },

    ProjectPriority: {
      type: String,
      default: "Medium",
    },

    ProjectStatus: {
      type: String,
      default: "Created",
    },

    AssignedProjectManager: {
      type: String,
    },

    AssignedProjectManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },

    AssignedDevelopers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "users",
      default: [],
    },

    TechnologyStack: {
      type: String,
    },

    EstimatedHours: {
      type: Number,
    },

    ProjectCost: {
      type: Number,
    },

    // Phase Details Array
    PhaseDetails: {
      type: [
        {
          PhaseName: {
            type: String,
            required: true,
            trim: true,
          },
          PhaseDescription: {
            type: String,
            required: true,
            trim: true,
          },
          PhaseDays: {
            type: String,
            required: true,
          },
          PhaseStatus: {
            type: String,
            default: "Not Started",
          },
          PhaseStartDate: {
            type: Date,
          },
          PhaseEndDate: {
            type: Date,
          },
        },
      ],
      default: [],
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    // Embedded status history array
    statusHistory: {
      type: [ProjectStatusHistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

const ProjectModel = mongoose.model("projects", ProjectSchema);

export default ProjectModel;
