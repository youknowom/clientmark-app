import mongoose from "mongoose";

const PaymentHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
    transactionId: { type: String },
    method: { type: String, default: "manual" }, // "razorpay", "stripe", "manual"
  },
  { _id: false }
);

const SubscriptionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "plans",
      required: true,
    },

    status: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "trial",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      default: null,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    paymentHistory: {
      type: [PaymentHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

const SubscriptionModel = mongoose.model("subscriptions", SubscriptionSchema);

export default SubscriptionModel;
