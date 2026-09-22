import mongoose from "mongoose";

const WebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["received", "processed", "ignored", "failed"],
      default: "received",
      index: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    errorMessage: {
      type: String,
      default: "",
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const WebhookEventModel = mongoose.model("webhook_events", WebhookEventSchema);

export default WebhookEventModel;
