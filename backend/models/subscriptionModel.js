import mongoose from "mongoose";

const PaymentHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "success" }, // "success", "failed", "pending", "refunded"
    paidAt: { type: Date, default: Date.now },
    transactionId: { type: String }, // razorpay_payment_id
    orderId: { type: String }, // razorpay_order_id
    method: { type: String, default: "razorpay" }, // "razorpay", "manual"
    errorReason: { type: String, default: "" },
    receipt: { type: String, default: "" },
  },
  { _id: true }
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

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    razorpayOrderId: {
      type: String,
      default: "",
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    razorpaySubscriptionId: {
      type: String,
      default: "",
      index: true,
    },

    razorpayCustomerId: {
      type: String,
      default: "",
    },

    stripeCustomerId: {
      type: String,
      default: "",
      index: true,
    },

    stripeSubscriptionId: {
      type: String,
      default: "",
      index: true,
    },

    stripeSessionId: {
      type: String,
      default: "",
      index: true,
    },

    amount: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled", "expired"],
      default: "trial",
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      default: null,
    },

    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },

    currentPeriodEnd: {
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
