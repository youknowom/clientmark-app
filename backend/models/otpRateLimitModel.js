import mongoose from "mongoose";

const OTPRateLimitSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      default: null,
      index: true,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    sendTimestamps: {
      type: [Date],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

OTRateLimitSchema_unique: OTPRateLimitSchema.index({ subject: 1, purpose: 1 }, { unique: true });

const OTPRateLimitModel = mongoose.model("otp_rate_limits", OTPRateLimitSchema);

export default OTPRateLimitModel;
