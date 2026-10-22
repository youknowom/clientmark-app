import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:'users',
      required: true,
      index: true,
    },

    notificationType: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
    },

    redirectUrl: {
      type: String,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    jobName: {
      type: String,
      default: null,
      index: true,
    },

    idempotencyKey: {
      type: String,
      default: null,
    },

    dedupKey: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Idempotency: prevent duplicate scheduled notifications per user+job+day
NotificationSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);
NotificationSchema.index(
  { dedupKey: 1 },
  { unique: true, partialFilterExpression: { dedupKey: { $type: "string" } } }
);

const NotificationModel = mongoose.model("notifications", NotificationSchema);

export default NotificationModel;

