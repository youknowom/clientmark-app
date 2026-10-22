import mongoose from "mongoose";

const TenantDailyOtpSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },
    utcDay: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

TenantDailyOtpSchema.index({ tenantId: 1, utcDay: 1 }, { unique: true });

const TenantDailyOtpModel = mongoose.model("tenant_daily_otps", TenantDailyOtpSchema);

export default TenantDailyOtpModel;
