import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import tenantMiddleware from "../middlewares/tenantMiddleware.js";
import {
  getPlans,
  getMyPlan,
  getUsage,
  createOrder,
  verifyPayment,
  cancelSubscription,
  handleWebhook,
  createStripeSession,
  verifyStripeSession,
  handleStripeWebhook,
  createPortalSession,
  changeStripePlan,
  createDodoSession,
  verifyDodoSession,
  createDodoPortalSession,
  handleDodoWebhook,
} from "../controllers/subscriptionController.js";

const subscriptionRouter = express.Router();

/**
 * Guard middleware for Razorpay endpoints.
 * Disabled by default (returns 404) unless RAZORPAY_ENABLED="true".
 */
const checkRazorpayEnabled = (req, res, next) => {
  if (process.env.RAZORPAY_ENABLED !== "true") {
    return res.status(404).json({
      success: false,
      message: "Razorpay payment gateway is disabled.",
    });
  }
  next();
};

// ── Public / Webhook Routes ──
subscriptionRouter.get("/plans", getPlans);
subscriptionRouter.post("/dodo/webhook", handleDodoWebhook); // Dodo Payments webhook listener (primary)
subscriptionRouter.post("/stripe/webhook", handleStripeWebhook); // Stripe webhook listener (supported)
subscriptionRouter.post("/webhook", checkRazorpayEnabled, handleWebhook); // Razorpay webhook listener (behind flag)

// ── Protected Routes (Strictly Tenant Isolated) ──
subscriptionRouter.use(authUser, tenantMiddleware);

subscriptionRouter.get("/my-plan", getMyPlan);
subscriptionRouter.get("/usage", getUsage);

// Dodo Payments Checkout, Verification & Customer Portal
subscriptionRouter.post("/dodo/create-checkout-session", createDodoSession);
subscriptionRouter.get("/dodo/verify-session", verifyDodoSession);
subscriptionRouter.post("/dodo/create-portal-session", createDodoPortalSession);

// Stripe Checkout, Verification, Customer Portal & Plan Upgrades
subscriptionRouter.post("/stripe/create-checkout-session", createStripeSession);
subscriptionRouter.get("/stripe/verify-session", verifyStripeSession);
subscriptionRouter.post("/stripe/create-portal-session", createPortalSession);
subscriptionRouter.post("/stripe/change-plan", changeStripePlan);

// Razorpay Fallback Routes (Strictly behind RAZORPAY_ENABLED flag)
subscriptionRouter.post("/create-order", checkRazorpayEnabled, createOrder);
subscriptionRouter.post("/verify-payment", checkRazorpayEnabled, verifyPayment);

// Common Subscription Cancellation
subscriptionRouter.post("/cancel", cancelSubscription);

export default subscriptionRouter;
