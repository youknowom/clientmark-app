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
  },
  { timestamps: true },
);

const NotificationModel = mongoose.model("notifications", NotificationSchema);

export default NotificationModel;

