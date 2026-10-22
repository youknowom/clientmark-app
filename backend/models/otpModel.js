import mongoose from "mongoose";

const OTPSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      required: true,
      enum: ["password_reset", "portal_access"],
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    hash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

OTPSchema.index({ subject: 1, purpose: 1 });

const OTPModel = mongoose.model("otps", OTPSchema);

export default OTPModel;
