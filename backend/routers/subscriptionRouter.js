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
} from "../controllers/subscriptionController.js";

const subscriptionRouter = express.Router();

// ── Public / Webhook Routes ──
subscriptionRouter.get("/plans", getPlans);
subscriptionRouter.post("/webhook", handleWebhook); // Razorpay webhook listener
subscriptionRouter.post("/stripe/webhook", handleStripeWebhook); // Stripe webhook listener

// ── Protected Routes (Tenant Admin) ──
subscriptionRouter.get("/my-plan", authUser, tenantMiddleware, getMyPlan);
subscriptionRouter.get("/usage", authUser, tenantMiddleware, getUsage);

// Stripe Checkout & Verification
subscriptionRouter.post("/stripe/create-checkout-session", authUser, tenantMiddleware, createStripeSession);
subscriptionRouter.get("/stripe/verify-session", authUser, tenantMiddleware, verifyStripeSession);

// Razorpay Fallback Routes
subscriptionRouter.post("/create-order", authUser, tenantMiddleware, createOrder);
subscriptionRouter.post("/verify-payment", authUser, tenantMiddleware, verifyPayment);

// Common Subscription Cancellation
subscriptionRouter.post("/cancel", authUser, tenantMiddleware, cancelSubscription);

export default subscriptionRouter;
