import UserModel from "../models/userModel.js";
import LeadModel from "../models/leadModel.js";
import BranchModel from "../models/branchModel.js";
import ProjectModel from "../models/projectModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import TenantModel from "../models/tenantModel.js";
import WebhookEventModel from "../models/webhookEventModel.js";
import { disconnectTenantSockets } from "../services/realtime.js";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
} from "../services/razorpayService.js";
import {
  getOrCreateStripeCustomer,
  createStripeCheckoutSession,
  constructStripeWebhookEvent,
  retrieveCheckoutSession,
  cancelStripeSubscription,
  createStripeBillingPortalSession,
  updateStripeSubscriptionPlan,
} from "../services/stripeService.js";
import {
  createDodoCheckoutSession,
  retrieveDodoCheckoutSession,
  createDodoCustomerPortalSession,
  verifyDodoWebhook,
} from "../services/dodoService.js";
import { sendTextMail } from "../services/mailService.js";

/**
 * Authorization helper: allows Admins, users with billing permissions, or the registered tenant owner.
 */
export const canManageBilling = (user, tenant) => {
  if (!user) return false;
  const roleName = user.roleId?.roleName;
  if (roleName === "Admin") return true;
  const permissions = user.roleId?.permissions || [];
  if (permissions.includes("manage:billing") || permissions.includes("view:billing")) return true;
  if (tenant?.email && user?.email && tenant.email.toLowerCase() === user.email.toLowerCase()) return true;
  return false;
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/plans — List all available plans (public)
// ══════════════════════════════════════════════════════════════
const getPlans = async (req, res) => {
  try {
    const plans = await PlanModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean();

    return res.status(200).json({
      message: "Successfully fetched plans.",
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/my-plan — Get current tenant's plan (protected)
// ══════════════════════════════════════════════════════════════
const getMyPlan = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const subscription = await SubscriptionModel.findOne({
      tenantId,
      status: { $in: ["trial", "active", "past_due"] },
    })
      .populate("planId")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch live usage vs limits across categories
    const [userCount, leadCount, branchCount, projectCount] = await Promise.all([
      UserModel.countDocuments({ tenantId }),
      LeadModel.countDocuments({ tenantId }),
      BranchModel.countDocuments({ tenantId }),
      ProjectModel.countDocuments({ tenantId }),
    ]);

    const tenantDoc = await TenantModel.findById(tenantId).populate("planId").lean();

    const limits = subscription?.planId?.limits || tenantDoc?.planId?.limits || {
      maxUsers: 3,
      maxLeads: 100,
      maxBranches: 1,
      maxProjects: 5,
    };

    const usageVsLimits = {
      users: { current: userCount, max: limits.maxUsers },
      leads: { current: leadCount, max: limits.maxLeads },
      branches: { current: branchCount, max: limits.maxBranches },
      projects: { current: projectCount, max: limits.maxProjects },
    };

    const graceDays = parseInt(process.env.GRACE_DAYS || "5", 10);
    const isPastDue = tenantDoc?.status === "PastDue" || subscription?.status === "past_due";
    let graceWarning = null;
    let daysLeft = null;
    let reason = null;

    if (isPastDue) {
      const graceStart = subscription?.gracePeriodStartedAt || tenantDoc?.gracePeriodStartedAt || subscription?.currentPeriodEnd || tenantDoc?.subscriptionEnd || tenantDoc?.updatedAt;
      const daysPast = graceStart ? Math.floor((Date.now() - new Date(graceStart).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      daysLeft = Math.max(0, graceDays - daysPast);
      reason = "Your latest subscription payment is past due. Full CRM access continues during your grace period. Please update your payment method to avoid automatic downgrade to the Free plan.";
      graceWarning = {
        isPastDue: true,
        isGracePeriod: daysLeft > 0,
        daysLeft,
        reason,
      };
    }

    if (!subscription) {
      // Fallback: lookup tenant plan directly if subscription record hasn't been created yet
      return res.status(200).json({
        message: "Fetched tenant plan.",
        success: true,
        data: tenantDoc?.planId
          ? {
              tenantId,
              planId: tenantDoc.planId,
              status: tenantDoc.isTrialActive ? "trial" : "active",
              billingCycle: "monthly",
              currentPeriodStart: tenantDoc.subscriptionStart || tenantDoc.createdAt,
              currentPeriodEnd: tenantDoc.subscriptionEnd || tenantDoc.trialEndsAt,
              paymentHistory: [],
              usageVsLimits,
              graceWarning,
              daysLeft,
              reason,
            }
          : null,
      });
    }

    return res.status(200).json({
      message: "Successfully fetched subscription.",
      success: true,
      data: {
        ...subscription,
        usageVsLimits,
        graceWarning,
        daysLeft,
        reason,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/usage — Get current usage vs limits (protected)
// ══════════════════════════════════════════════════════════════
const getUsage = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Get active subscription
    const subscription = await SubscriptionModel.findOne({
      tenantId,
      status: { $in: ["trial", "active", "past_due"] },
    })
      .populate("planId")
      .sort({ createdAt: -1 })
      .lean();

    let limits = subscription?.planId?.limits;

    if (!limits) {
      const tenant = await TenantModel.findById(tenantId).populate("planId").lean();
      limits = tenant?.planId?.limits || {
        maxUsers: 3,
        maxLeads: 100,
        maxBranches: 1,
        maxProjects: 5,
        whatsappEnabled: false,
        reportsEnabled: false,
        apiAccessEnabled: false,
      };
    }

    // Count live usage across models scoped strictly to this tenant
    const [userCount, leadCount, branchCount, projectCount] = await Promise.all([
      UserModel.countDocuments({ tenantId }),
      LeadModel.countDocuments({ tenantId }),
      BranchModel.countDocuments({ tenantId }),
      ProjectModel.countDocuments({ tenantId }),
    ]);

    return res.status(200).json({
      message: "Successfully fetched usage.",
      success: true,
      data: {
        plan: subscription?.planId?.planName || "Free",
        status: subscription?.status || "trial",
        billingCycle: subscription?.billingCycle || "monthly",
        currentPeriodEnd: subscription?.currentPeriodEnd || subscription?.endDate,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
        usage: {
          users: { current: userCount, max: limits.maxUsers ?? 3 },
          leads: { current: leadCount, max: limits.maxLeads ?? 100 },
          branches: { current: branchCount, max: limits.maxBranches ?? 1 },
          projects: { current: projectCount, max: limits.maxProjects ?? 5 },
        },
        features: {
          whatsapp: limits.whatsappEnabled || false,
          reports: limits.reportsEnabled || false,
          apiAccess: limits.apiAccessEnabled || false,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/create-order — Create Razorpay order (protected)
// ══════════════════════════════════════════════════════════════
const createOrder = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const roleName = req.user?.roleId?.roleName;

    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can manage billing and subscriptions.",
      });
    }

    const { planId, billingCycle = "monthly" } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required.",
      });
    }

    const plan = await PlanModel.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected plan does not exist or is inactive.",
      });
    }

    // Handle Free Plan directly without payment gateway
    if (plan.price === 0) {
      // Deactivate current active subscriptions
      await SubscriptionModel.updateMany(
        { tenantId, status: { $in: ["trial", "active"] } },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
      );

      const freeSub = await SubscriptionModel.create({
        tenantId,
        planId: plan._id,
        billingCycle: "monthly",
        status: "active",
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
      });

      await TenantModel.findByIdAndUpdate(tenantId, {
        planId: plan._id,
        isTrialActive: false,
      });

      return res.status(200).json({
        success: true,
        isFreePlan: true,
        message: "Switched to Free plan successfully.",
        data: freeSub,
      });
    }

    // Determine price strictly on server based on billing cycle
    const amountInRupees = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;

    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid pricing configuration for this plan.",
      });
    }

    const receipt = `rcpt_${String(tenantId).slice(-6)}_${Date.now()}`;

    const order = await createRazorpayOrder({
      amountInRupees,
      currency: plan.currency || "INR",
      receipt,
      notes: {
        tenantId: String(tenantId),
        planId: String(plan._id),
        planName: plan.planName,
        billingCycle,
        userEmail: req.user.email || "",
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        plan: {
          id: plan._id,
          name: plan.planName,
          billingCycle,
          amountInRupees,
        },
      },
    });
  } catch (error) {
    console.error("Error creating subscription order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize payment order.",
    });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/verify-payment — Verify payment signature & activate
// ══════════════════════════════════════════════════════════════
const verifyPayment = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const roleName = req.user?.roleId?.roleName;

    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can activate subscriptions.",
      });
    }

    const {
      planId,
      billingCycle = "monthly",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!planId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification parameters.",
      });
    }

    // Verify HMAC SHA256 signature
    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      console.warn(
        `🚨 Invalid payment signature attempt: tenant=${tenantId}, order=${razorpayOrderId}`
      );
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    const plan = await PlanModel.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found.",
      });
    }

    const amountInRupees = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;

    // Calculate billing period
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    if (billingCycle === "yearly") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    // Deactivate previous active subscriptions
    await SubscriptionModel.updateMany(
      { tenantId, status: { $in: ["trial", "active", "past_due"] } },
      { $set: { status: "cancelled", cancelledAt: new Date() } }
    );

    // Create active subscription
    const newSubscription = await SubscriptionModel.create({
      tenantId,
      planId: plan._id,
      billingCycle,
      razorpayOrderId,
      razorpayPaymentId,
      amount: amountInRupees,
      currency: plan.currency || "INR",
      status: "active",
      cancelAtPeriodEnd: false,
      startDate: currentPeriodStart,
      currentPeriodStart,
      currentPeriodEnd,
      paymentHistory: [
        {
          amount: amountInRupees,
          currency: plan.currency || "INR",
          status: "success",
          paidAt: new Date(),
          transactionId: razorpayPaymentId,
          orderId: razorpayOrderId,
          method: "razorpay",
        },
      ],
    });

    // Update Tenant
    await TenantModel.findByIdAndUpdate(tenantId, {
      planId: plan._id,
      subscriptionStart: currentPeriodStart,
      subscriptionEnd: currentPeriodEnd,
      isTrialActive: false,
      status: "Active",
    });

    return res.status(200).json({
      success: true,
      message: `Successfully activated ${plan.planName} plan.`,
      data: newSubscription,
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification encountered an internal error.",
    });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/cancel — Cancel active subscription at period end
// ══════════════════════════════════════════════════════════════
const cancelSubscription = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const roleName = req.user?.roleId?.roleName;

    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can cancel subscriptions.",
      });
    }

    const subscription = await SubscriptionModel.findOne({
      tenantId,
      status: { $in: ["trial", "active", "past_due"] },
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found to cancel.",
      });
    }

    if (subscription.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(subscription.stripeSubscriptionId);
      } catch (stripeErr) {
        console.warn("Stripe cancellation warning:", stripeErr.message);
      }
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      message:
        "Subscription scheduled for cancellation. Access remains active until the end of the current billing period.",
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/webhook — Secure Razorpay Webhook Handler
// ══════════════════════════════════════════════════════════════
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing webhook signature" });
    }

    // Verify HMAC signature using raw request body — fail closed (400) on any error
    let isValid = false;
    try {
      isValid = verifyWebhookSignature(req.rawBody, signature);
    } catch (sigErr) {
      console.warn("🚨 Rejected Razorpay webhook:", sigErr.message);
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    if (!isValid) {
      console.warn("🚨 Rejected Razorpay webhook: invalid signature");
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body;
    const eventId = event?.id || req.headers["x-razorpay-event-id"];
    const eventType = event?.event;

    if (!eventId || !eventType) {
      return res.status(400).json({ success: false, message: "Malformed webhook payload" });
    }

    // Idempotency check: Have we processed this event already?
    const existingEvent = await WebhookEventModel.findOne({ eventId });
    if (existingEvent && existingEvent.status === "processed") {
      return res.status(200).json({ status: "ok", message: "Event already processed" });
    }

    // Record webhook reception
    const webhookRecord = await WebhookEventModel.findOneAndUpdate(
      { eventId },
      {
        $setOnInsert: {
          eventId,
          eventType,
          payload: event,
          status: "received",
        },
      },
      { upsert: true, new: true }
    );

    // Process specific events
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    const tenantId =
      paymentEntity?.notes?.tenantId || orderEntity?.notes?.tenantId;
    const planId =
      paymentEntity?.notes?.planId || orderEntity?.notes?.planId;
    const billingCycle =
      paymentEntity?.notes?.billingCycle || orderEntity?.notes?.billingCycle || "monthly";

    switch (eventType) {
      case "order.paid":
      case "payment.captured": {
        if (tenantId && planId) {
          const plan = await PlanModel.findById(planId);
          if (plan) {
            const currentPeriodStart = new Date();
            const currentPeriodEnd = new Date(currentPeriodStart);
            if (billingCycle === "yearly") {
              currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
            } else {
              currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
            }

            // Find existing subscription by orderId or update latest
            let sub = await SubscriptionModel.findOne({
              razorpayOrderId: orderEntity?.id || paymentEntity?.order_id,
            });

            if (!sub) {
              await SubscriptionModel.updateMany(
                { tenantId, status: { $in: ["trial", "active", "past_due"] } },
                { $set: { status: "cancelled", cancelledAt: new Date() } }
              );

              sub = new SubscriptionModel({
                tenantId,
                planId: plan._id,
                billingCycle,
                razorpayOrderId: orderEntity?.id || paymentEntity?.order_id,
                razorpayPaymentId: paymentEntity?.id || "",
                amount: (paymentEntity?.amount || orderEntity?.amount || 0) / 100,
                currency: plan.currency || "INR",
                status: "active",
                startDate: currentPeriodStart,
                currentPeriodStart,
                currentPeriodEnd,
                paymentHistory: [
                  {
                    amount: (paymentEntity?.amount || 0) / 100,
                    currency: paymentEntity?.currency || "INR",
                    status: "success",
                    paidAt: new Date(),
                    transactionId: paymentEntity?.id || "",
                    orderId: paymentEntity?.order_id || "",
                    method: paymentEntity?.method || "razorpay",
                  },
                ],
              });
              sub.gracePeriodStartedAt = null;
              await sub.save();
            } else {
              sub.status = "active";
              sub.gracePeriodStartedAt = null;
              sub.currentPeriodStart = currentPeriodStart;
              sub.currentPeriodEnd = currentPeriodEnd;
              await sub.save();
            }

            await TenantModel.findByIdAndUpdate(tenantId, {
              planId: plan._id,
              subscriptionStart: currentPeriodStart,
              subscriptionEnd: currentPeriodEnd,
              isTrialActive: false,
              status: "Active",
              gracePeriodStartedAt: null,
            });
          }
        }
        break;
      }

      case "payment.failed": {
        if (tenantId) {
          const now = new Date();
          // Record failed payment in subscription history without destructive data loss
          const activeSub = await SubscriptionModel.findOne({
            tenantId,
            status: { $in: ["active", "past_due"] },
          }).sort({ createdAt: -1 });

          if (activeSub) {
            activeSub.paymentHistory.push({
              amount: (paymentEntity?.amount || 0) / 100,
              currency: paymentEntity?.currency || "INR",
              status: "failed",
              paidAt: now,
              transactionId: paymentEntity?.id || "",
              orderId: paymentEntity?.order_id || "",
              method: paymentEntity?.method || "razorpay",
              errorReason: paymentEntity?.error_description || "Payment failed",
            });
            activeSub.status = "past_due";
            if (!activeSub.gracePeriodStartedAt) {
              activeSub.gracePeriodStartedAt = now;
            }
            await activeSub.save();
          }

          // Move tenant to PastDue status and record grace start timestamp
          const tenantUpdate = { status: "PastDue" };
          const existingTenant = await TenantModel.findById(tenantId).select("gracePeriodStartedAt").lean();
          if (!existingTenant?.gracePeriodStartedAt) {
            tenantUpdate.gracePeriodStartedAt = now;
          }
          await TenantModel.findByIdAndUpdate(tenantId, tenantUpdate);

          // Dispatch payment failed notification email
          const tenantDoc = await TenantModel.findById(tenantId).select("email companyName").lean();
          if (tenantDoc?.email) {
            sendTextMail({
              toEmails: tenantDoc.email,
              subject: "Payment Failed - Action Required",
              textMessage: `Hello,\n\nYour subscription renewal payment of ${(paymentEntity?.amount || 0) / 100} ${paymentEntity?.currency || "INR"} could not be completed (${paymentEntity?.error_description || "Payment declined"}).\n\nPlease log in to your account and update your payment method to avoid service interruption.\n\nThank you.`,
              isPlatform: true,
            }).catch((err) => console.warn("[Webhook] Failed to send payment failure email:", err.message));
          }
        }
        break;
      }

      default:
        // Other events logged
        break;
    }

    // Mark webhook as processed
    webhookRecord.status = "processed";
    webhookRecord.processedAt = new Date();
    await webhookRecord.save();

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Error processing Razorpay webhook:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/stripe/create-checkout-session (protected)
// ══════════════════════════════════════════════════════════════
const createStripeSession = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const roleName = req.user?.roleId?.roleName;

    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can manage billing and subscriptions.",
      });
    }

    const { planId, billingCycle = "monthly" } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required.",
      });
    }

    const plan = await PlanModel.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected plan does not exist or is inactive.",
      });
    }

    // Guard: Prevent second active Stripe subscription for one tenant
    const existingActiveSub = await SubscriptionModel.findOne({
      tenantId,
      status: "active",
      stripeSubscriptionId: { $exists: true, $ne: "" },
    });

    if (existingActiveSub) {
      return res.status(400).json({
        success: false,
        hasActiveSubscription: true,
        message:
          "An active Stripe subscription already exists for this workspace. Please update your plan via the Customer Portal to avoid duplicate subscriptions.",
      });
    }

    // Handle Free Plan directly without Stripe checkout
    if (plan.price === 0) {
      await SubscriptionModel.updateMany(
        { tenantId, status: { $in: ["trial", "active"] } },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
      );

      const freeSub = await SubscriptionModel.create({
        tenantId,
        planId: plan._id,
        billingCycle: "monthly",
        status: "active",
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
      });

      await TenantModel.findByIdAndUpdate(tenantId, {
        planId: plan._id,
        isTrialActive: false,
      });

      return res.status(200).json({
        success: true,
        isFreePlan: true,
        message: "Switched to Free plan successfully.",
        data: freeSub,
      });
    }

    const userEmail = req.user?.email;
    const userName = req.user?.fullName || req.user?.name;

    // Get or create Stripe Customer
    let customerId = "";
    try {
      const customer = await getOrCreateStripeCustomer({
        email: userEmail,
        name: userName,
        tenantId,
      });
      customerId = customer?.id;
    } catch (custErr) {
      console.warn("Could not pre-create Stripe customer:", custErr.message);
    }

    const clientUrl = req.headers.origin || process.env.CLIENT_URL || "http://localhost:3000";
    const successUrl = `${clientUrl}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`;
    const cancelUrl = `${clientUrl}/billing?status=cancelled`;

    const session = await createStripeCheckoutSession({
      customerId: customerId || undefined,
      customerEmail: !customerId ? userEmail : undefined,
      plan,
      billingCycle,
      tenantId,
      successUrl,
      cancelUrl,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    let message = error.message || "Failed to initiate Stripe checkout.";
    if (error.type === "StripeAuthenticationError" || error.statusCode === 401) {
      message = "Invalid Stripe API Key. Please verify STRIPE_SECRET_KEY in backend/.env.";
    }
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/stripe/verify-session (protected)
// ══════════════════════════════════════════════════════════════
const verifyStripeSession = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const tenantId = req.tenantId;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required." });
    }

    const session = await retrieveCheckoutSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Stripe session not found." });
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return res.status(400).json({
        success: false,
        message: "Payment for this session has not been completed.",
      });
    }

    const targetTenantId = session.metadata?.tenantId;
    if (!targetTenantId || targetTenantId.toString() !== tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Stripe session does not belong to your authenticated tenant workspace.",
      });
    }

    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle || "monthly";

    const plan = await PlanModel.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found." });
    }

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    if (billingCycle === "yearly") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    }

    const stripeSubId = typeof session.subscription === "object" ? session.subscription?.id : session.subscription;
    const stripeCustId = typeof session.customer === "object" ? session.customer?.id : session.customer;

    let subscription = await SubscriptionModel.findOne({
      tenantId: targetTenantId,
      status: { $in: ["trial", "active", "past_due"] },
    }).sort({ createdAt: -1 });

    const paymentRecord = {
      amount: (session.amount_total || 0) / 100,
      currency: (session.currency || "INR").toUpperCase(),
      status: "success",
      paidAt: new Date(),
      transactionId: session.payment_intent?.id || session.id,
      orderId: session.id,
      method: "stripe",
      receipt: session.customer_details?.email || "",
    };

    if (subscription) {
      subscription.planId = plan._id;
      subscription.billingCycle = billingCycle;
      subscription.stripeSessionId = session.id;
      if (stripeSubId) subscription.stripeSubscriptionId = stripeSubId;
      if (stripeCustId) subscription.stripeCustomerId = stripeCustId;
      subscription.amount = (session.amount_total || 0) / 100;
      subscription.currency = (session.currency || "INR").toUpperCase();
      subscription.status = "active";
      subscription.currentPeriodStart = currentPeriodStart;
      subscription.currentPeriodEnd = currentPeriodEnd;
      subscription.cancelAtPeriodEnd = false;
      subscription.paymentHistory.push(paymentRecord);
      await subscription.save();
    } else {
      subscription = await SubscriptionModel.create({
        tenantId: targetTenantId,
        planId: plan._id,
        billingCycle,
        stripeSessionId: session.id,
        stripeSubscriptionId: stripeSubId || "",
        stripeCustomerId: stripeCustId || "",
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || "INR").toUpperCase(),
        status: "active",
        startDate: currentPeriodStart,
        currentPeriodStart,
        currentPeriodEnd,
        paymentHistory: [paymentRecord],
      });
    }

    await TenantModel.findByIdAndUpdate(targetTenantId, {
      planId: plan._id,
      subscriptionStart: currentPeriodStart,
      subscriptionEnd: currentPeriodEnd,
      isTrialActive: false,
      status: "Active",
    });

    return res.status(200).json({
      success: true,
      message: "Stripe subscription activated successfully!",
      data: subscription,
    });
  } catch (error) {
    console.error("Error verifying Stripe session:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/stripe/create-portal-session (protected)
// ══════════════════════════════════════════════════════════════
const createPortalSession = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const roleName = req.user?.roleId?.roleName;

    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can access the billing portal.",
      });
    }

    const sub = await SubscriptionModel.findOne({
      tenantId,
      stripeCustomerId: { $exists: true, $ne: "" },
    }).sort({ createdAt: -1 });

    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      const tenantDoc = await TenantModel.findById(tenantId).lean();
      const customer = await getOrCreateStripeCustomer({
        email: req.user?.email || tenantDoc?.email,
        name: req.user?.fullName || tenantDoc?.companyName,
        tenantId,
      });
      customerId = customer?.id;
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "No associated Stripe customer found for this workspace.",
      });
    }

    const clientUrl = req.headers.origin || process.env.CLIENT_URL || "http://localhost:3000";
    const returnUrl = `${clientUrl}/billing`;

    const portalSession = await createStripeBillingPortalSession({
      customerId,
      returnUrl,
    });

    return res.status(200).json({
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Error creating Stripe Customer Portal session:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create billing portal session.",
    });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/stripe/change-plan (protected)
// ══════════════════════════════════════════════════════════════
const changeStripePlan = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const roleName = req.user?.roleId?.roleName;

    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can modify subscription plans.",
      });
    }

    const { planId, billingCycle = "monthly" } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required." });
    }

    const targetPlan = await PlanModel.findById(planId);
    if (!targetPlan || !targetPlan.isActive) {
      return res.status(404).json({ success: false, message: "Target plan not found or inactive." });
    }

    const activeSub = await SubscriptionModel.findOne({
      tenantId,
      status: "active",
      stripeSubscriptionId: { $exists: true, $ne: "" },
    }).sort({ createdAt: -1 });

    if (!activeSub) {
      return res.status(400).json({
        success: false,
        message: "No active Stripe subscription found to update. Please start a new checkout.",
      });
    }

    const isYearly = billingCycle === "yearly";
    const newPriceId = isYearly ? targetPlan.stripePriceIdYearly : targetPlan.stripePriceIdMonthly;

    if (!newPriceId) {
      const clientUrl = req.headers.origin || process.env.CLIENT_URL || "http://localhost:3000";
      const portalSession = await createStripeBillingPortalSession({
        customerId: activeSub.stripeCustomerId,
        returnUrl: `${clientUrl}/billing`,
      });
      return res.status(200).json({
        success: true,
        usePortal: true,
        url: portalSession.url,
        message: "Redirecting to Stripe Billing Portal to complete plan update.",
      });
    }

    await updateStripeSubscriptionPlan({
      subscriptionId: activeSub.stripeSubscriptionId,
      newPriceId,
    });

    activeSub.planId = targetPlan._id;
    activeSub.billingCycle = billingCycle;
    await activeSub.save();

    await TenantModel.findByIdAndUpdate(tenantId, { planId: targetPlan._id });

    return res.status(200).json({
      success: true,
      message: `Plan updated to ${targetPlan.planName} with proration.`,
      data: activeSub,
    });
  } catch (error) {
    console.error("Error changing Stripe plan:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update subscription plan.",
    });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/stripe/webhook (public, verified)
// Handled: checkout.session.completed, invoice.paid, invoice.payment_failed,
//          customer.subscription.updated, customer.subscription.deleted
// ══════════════════════════════════════════════════════════════
const handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing Stripe signature header." });
    }

    let event;
    try {
      event = constructStripeWebhookEvent(req.rawBody, signature);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
    }

    // Deduplicate via WebhookEventModel
    const existingEvent = await WebhookEventModel.findOne({ eventId: event.id });
    if (existingEvent) {
      return res.status(200).json({ status: "already_processed", eventId: event.id });
    }

    const webhookRecord = await WebhookEventModel.create({
      eventId: event.id,
      eventType: event.type,
      payload: event.data.object,
      status: "received",
    });

    switch (event.type) {
      // 1. Initial checkout completed for a subscription
      case "checkout.session.completed": {
        const session = event.data.object;

        // Guard: Only process subscription mode checkouts. A one-time or failed attempt changes nothing.
        if (session.mode !== "subscription") {
          break;
        }
        if (session.payment_status !== "paid" && session.status !== "complete") {
          break;
        }

        const tenantId = session.metadata?.tenantId;
        const planId = session.metadata?.planId;
        const billingCycle = session.metadata?.billingCycle || "monthly";

        if (tenantId && planId) {
          const plan = await PlanModel.findById(planId);
          if (plan) {
            const currentPeriodStart = new Date();
            let currentPeriodEnd = new Date();
            if (billingCycle === "yearly") {
              currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
            } else {
              currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
            }

            const stripeSubId = typeof session.subscription === "object" ? session.subscription?.id : session.subscription;
            const stripeCustId = typeof session.customer === "object" ? session.customer?.id : session.customer;

            let sub = await SubscriptionModel.findOne({
              tenantId,
              status: { $in: ["trial", "active", "past_due"] },
            }).sort({ createdAt: -1 });

            const paymentRecord = {
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || "INR").toUpperCase(),
              status: "success",
              paidAt: new Date(),
              transactionId: session.payment_intent || session.id,
              orderId: session.id,
              method: "stripe",
              receipt: session.customer_details?.email || "",
            };

            if (sub) {
              sub.planId = plan._id;
              sub.billingCycle = billingCycle;
              sub.stripeSessionId = session.id;
              if (stripeSubId) sub.stripeSubscriptionId = stripeSubId;
              if (stripeCustId) sub.stripeCustomerId = stripeCustId;
              sub.amount = (session.amount_total || 0) / 100;
              sub.currency = (session.currency || "INR").toUpperCase();
              sub.status = "active";
              sub.gracePeriodStartedAt = null;
              sub.currentPeriodStart = currentPeriodStart;
              sub.currentPeriodEnd = currentPeriodEnd;
              sub.cancelAtPeriodEnd = false;
              sub.paymentHistory.push(paymentRecord);
              await sub.save();
            } else {
              sub = await SubscriptionModel.create({
                tenantId,
                planId: plan._id,
                billingCycle,
                stripeSessionId: session.id,
                stripeSubscriptionId: stripeSubId || "",
                stripeCustomerId: stripeCustId || "",
                amount: (session.amount_total || 0) / 100,
                currency: (session.currency || "INR").toUpperCase(),
                status: "active",
                gracePeriodStartedAt: null,
                startDate: currentPeriodStart,
                currentPeriodStart,
                currentPeriodEnd,
                paymentHistory: [paymentRecord],
              });
            }

            await TenantModel.findByIdAndUpdate(tenantId, {
              planId: plan._id,
              subscriptionStart: currentPeriodStart,
              subscriptionEnd: currentPeriodEnd,
              isTrialActive: false,
              status: "Active",
              gracePeriodStartedAt: null,
            });
          }
        }
        break;
      }

      // 2. Renewal or invoice paid: updates subscription period end
      case "invoice.paid": {
        const invoice = event.data.object;
        const stripeSubId = typeof invoice.subscription === "object" ? invoice.subscription?.id : invoice.subscription;
        const stripeCustId = typeof invoice.customer === "object" ? invoice.customer?.id : invoice.customer;

        let sub = null;
        if (stripeSubId) {
          sub = await SubscriptionModel.findOne({ stripeSubscriptionId: stripeSubId }).sort({ createdAt: -1 });
        }
        if (!sub && stripeCustId) {
          sub = await SubscriptionModel.findOne({ stripeCustomerId: stripeCustId }).sort({ createdAt: -1 });
        }

        if (sub) {
          const lineItemPeriod = invoice.lines?.data?.[0]?.period;
          const currentPeriodStart = lineItemPeriod?.start ? new Date(lineItemPeriod.start * 1000) : new Date();
          const currentPeriodEnd = lineItemPeriod?.end
            ? new Date(lineItemPeriod.end * 1000)
            : invoice.period_end
            ? new Date(invoice.period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          sub.status = "active";
          sub.gracePeriodStartedAt = null;
          sub.currentPeriodStart = currentPeriodStart;
          sub.currentPeriodEnd = currentPeriodEnd;

          const transactionId = invoice.payment_intent || invoice.id;
          const alreadyRecorded = sub.paymentHistory.some(
            (p) => p.transactionId === transactionId || p.orderId === invoice.id
          );
          if (!alreadyRecorded) {
            sub.paymentHistory.push({
              amount: (invoice.amount_paid || 0) / 100,
              currency: (invoice.currency || "INR").toUpperCase(),
              status: "success",
              paidAt: new Date(),
              transactionId,
              orderId: invoice.id,
              method: "stripe",
              receipt: invoice.customer_email || invoice.hosted_invoice_url || "",
            });
          }

          await sub.save();

          await TenantModel.findByIdAndUpdate(sub.tenantId, {
            status: "Active",
            subscriptionEnd: currentPeriodEnd,
            gracePeriodStartedAt: null,
          });
        }
        break;
      }

      // 3. Invoice payment failed: transitions status to past_due, records grace start, notifies tenant
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeSubId = typeof invoice.subscription === "object" ? invoice.subscription?.id : invoice.subscription;
        const stripeCustId = typeof invoice.customer === "object" ? invoice.customer?.id : invoice.customer;

        let sub = null;
        if (stripeSubId) {
          sub = await SubscriptionModel.findOne({ stripeSubscriptionId: stripeSubId }).sort({ createdAt: -1 });
        }
        if (!sub && stripeCustId) {
          sub = await SubscriptionModel.findOne({ stripeCustomerId: stripeCustId }).sort({ createdAt: -1 });
        }

        if (sub) {
          const now = new Date();
          sub.status = "past_due";
          if (!sub.gracePeriodStartedAt) {
            sub.gracePeriodStartedAt = now;
          }

          const transactionId = invoice.payment_intent || invoice.id;
          sub.paymentHistory.push({
            amount: (invoice.amount_due || 0) / 100,
            currency: (invoice.currency || "INR").toUpperCase(),
            status: "failed",
            paidAt: now,
            transactionId,
            orderId: invoice.id,
            method: "stripe",
            errorReason: "Recurring invoice charge failed",
          });

          await sub.save();

          const tenantDoc = await TenantModel.findById(sub.tenantId).select("email companyName gracePeriodStartedAt").lean();
          const tenantUpdate = { status: "PastDue" };
          if (!tenantDoc?.gracePeriodStartedAt) {
            tenantUpdate.gracePeriodStartedAt = now;
          }
          await TenantModel.findByIdAndUpdate(sub.tenantId, tenantUpdate);

          if (tenantDoc?.email) {
            sendTextMail({
              toEmails: tenantDoc.email,
              subject: "Subscription Renewal Payment Failed - Action Required",
              textMessage: `Hello,\n\nYour subscription renewal payment of ${(invoice.amount_due || 0) / 100} ${(invoice.currency || "INR").toUpperCase()} could not be processed.\n\nYour account has entered the grace period. Please log in to your account or visit the billing portal to update your payment method.\n\nThank you.`,
              isPlatform: true,
            }).catch((err) => console.warn("[Webhook] Failed to send invoice payment failure email:", err.message));
          }
        }
        break;
      }

      // 4. Subscription status updated in Stripe (active, past_due, unpaid, canceled)
      case "customer.subscription.updated": {
        const subObject = event.data.object;
        const tenantId = subObject.metadata?.tenantId;
        const stripeSubId = subObject.id;

        let sub = await SubscriptionModel.findOne({ stripeSubscriptionId: stripeSubId });
        if (!sub && tenantId) {
          sub = await SubscriptionModel.findOne({ tenantId }).sort({ createdAt: -1 });
        }

        if (sub) {
          sub.cancelAtPeriodEnd = subObject.cancel_at_period_end || false;
          if (subObject.current_period_end) {
            sub.currentPeriodEnd = new Date(subObject.current_period_end * 1000);
          }
          if (subObject.current_period_start) {
            sub.currentPeriodStart = new Date(subObject.current_period_start * 1000);
          }

          if (subObject.status === "active") {
            sub.status = "active";
            sub.gracePeriodStartedAt = null;
            await TenantModel.findByIdAndUpdate(sub.tenantId, {
              status: "Active",
              subscriptionEnd: sub.currentPeriodEnd,
              gracePeriodStartedAt: null,
            });
          }
          if (subObject.status === "past_due" || subObject.status === "unpaid") {
            sub.status = "past_due";
            const now = new Date();
            if (!sub.gracePeriodStartedAt) {
              sub.gracePeriodStartedAt = now;
            }
            const tenantDoc = await TenantModel.findById(sub.tenantId).select("gracePeriodStartedAt").lean();
            const tenantUpdate = { status: "PastDue" };
            if (!tenantDoc?.gracePeriodStartedAt) {
              tenantUpdate.gracePeriodStartedAt = now;
            }
            await TenantModel.findByIdAndUpdate(sub.tenantId, tenantUpdate);
            await disconnectTenantSockets(sub.tenantId);
          }
          if (subObject.status === "canceled") {
            sub.status = "cancelled";
            const freePlan = await PlanModel.findOne({ price: 0, isActive: true });
            if (freePlan) {
              await TenantModel.findByIdAndUpdate(sub.tenantId, {
                planId: freePlan._id,
                status: "Active",
                subscriptionEnd: null,
                gracePeriodStartedAt: null,
              });
            } else {
              await TenantModel.findByIdAndUpdate(sub.tenantId, { status: "Suspended" });
              await disconnectTenantSockets(sub.tenantId);
            }
          }
          await sub.save();
        }
        break;
      }

      // 5. Subscription deleted / terminated
      case "customer.subscription.deleted": {
        const subObject = event.data.object;
        const tenantId = subObject.metadata?.tenantId;
        const stripeSubId = subObject.id;

        let sub = await SubscriptionModel.findOne({ stripeSubscriptionId: stripeSubId });
        if (!sub && tenantId) {
          sub = await SubscriptionModel.findOne({ tenantId }).sort({ createdAt: -1 });
        }

        if (sub) {
          sub.status = "cancelled";
          sub.cancelledAt = new Date();
          await sub.save();

          const freePlan = await PlanModel.findOne({ price: 0, isActive: true });
          if (freePlan) {
            await TenantModel.findByIdAndUpdate(sub.tenantId, {
              planId: freePlan._id,
              status: "Active",
              subscriptionEnd: null,
              gracePeriodStartedAt: null,
            });
          } else {
            await TenantModel.findByIdAndUpdate(sub.tenantId, { status: "Cancelled" });
            await disconnectTenantSockets(sub.tenantId);
          }
        }
        break;
      }

      default:
        break;
    }

    webhookRecord.status = "processed";
    webhookRecord.processedAt = new Date();
    await webhookRecord.save();

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error in Stripe webhook:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/dodo/create-checkout-session (protected)
// ══════════════════════════════════════════════════════════════
const createDodoSession = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can manage subscriptions.",
      });
    }

    const { planId, billingCycle = "monthly" } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: "Plan ID is required." });
    }

    const plan = await PlanModel.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Selected plan does not exist or is inactive." });
    }

    if (plan.slug === "free" || plan.price === 0) {
      return res.status(200).json({
        success: true,
        isFreePlan: true,
        message: "Switched to Free plan.",
      });
    }

    const clientUrl = req.headers.origin || process.env.CLIENT_URL || "http://localhost:3000";

    const session = await createDodoCheckoutSession({
      plan,
      billingCycle,
      tenant: req.tenant,
      user: req.user,
      clientUrl,
    });

    return res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      url: session.checkoutUrl,
      isMock: session.isMock,
      productId: session.productId,
    });
  } catch (error) {
    console.error("Error creating Dodo checkout session:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// GET /subscription/dodo/verify-session (protected)
// ══════════════════════════════════════════════════════════════
const verifyDodoSession = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { sessionId, planId, billingCycle = "monthly" } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId query parameter is required." });
    }

    const session = await retrieveDodoCheckoutSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Dodo checkout session not found." });
    }

    // Resolve plan
    const targetPlanId = session.metadata?.planId || planId;
    const targetCycle = session.metadata?.billingCycle || billingCycle;
    let plan = null;
    if (targetPlanId) {
      plan = await PlanModel.findById(targetPlanId);
    }
    if (!plan) {
      plan = await PlanModel.findOne({ slug: "starter" });
    }

    const now = new Date();
    const periodDays = targetCycle === "yearly" ? 365 : 30;
    const currentPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    const paymentRecord = {
      amount: plan ? (targetCycle === "yearly" ? plan.yearlyPrice : plan.price) : 0,
      currency: "INR",
      status: "success",
      paidAt: now,
      transactionId: session.payment_id || sessionId,
      orderId: sessionId,
      method: "dodo",
      receipt: "",
    };

    let sub = await SubscriptionModel.findOne({ tenantId }).sort({ createdAt: -1 });
    if (sub) {
      sub.planId = plan._id;
      sub.billingCycle = targetCycle;
      sub.billingProvider = "dodo";
      sub.dodoCustomerId = session.customer?.id || session.customer_id || sub.dodoCustomerId || "";
      sub.dodoSubscriptionId = session.subscription_id || sub.dodoSubscriptionId || "";
      sub.status = "active";
      sub.amount = paymentRecord.amount;
      sub.currency = paymentRecord.currency;
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = currentPeriodEnd;
      sub.gracePeriodStartedAt = null;
      sub.paymentHistory.push(paymentRecord);
      await sub.save();
    } else {
      sub = await SubscriptionModel.create({
        tenantId,
        planId: plan._id,
        billingCycle: targetCycle,
        billingProvider: "dodo",
        dodoCustomerId: session.customer?.id || session.customer_id || "",
        dodoSubscriptionId: session.subscription_id || "",
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd,
        gracePeriodStartedAt: null,
        paymentHistory: [paymentRecord],
      });
    }

    await TenantModel.findByIdAndUpdate(tenantId, {
      planId: plan._id,
      status: "Active",
      subscriptionStart: now,
      subscriptionEnd: currentPeriodEnd,
      isTrialActive: false,
      gracePeriodStartedAt: null,
    });

    return res.status(200).json({
      success: true,
      message: "Dodo Payments subscription verified and activated successfully.",
      data: sub,
    });
  } catch (error) {
    console.error("Error verifying Dodo session:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/dodo/create-portal-session (protected)
// ══════════════════════════════════════════════════════════════
const createDodoPortalSession = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!canManageBilling(req.user, req.tenant)) {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators or billing managers can access the billing portal.",
      });
    }

    const sub = await SubscriptionModel.findOne({ tenantId }).sort({ createdAt: -1 });
    const customerId = sub?.dodoCustomerId;

    const clientUrl = req.headers.origin || process.env.CLIENT_URL || "http://localhost:3000";
    const returnUrl = `${clientUrl.replace(/\/+$/, "")}/billing`;

    const portalSession = await createDodoCustomerPortalSession({
      customerId: customerId || "cus_default",
      returnUrl,
    });

    return res.status(200).json({
      success: true,
      url: portalSession.link,
      isMock: portalSession.isMock,
    });
  } catch (error) {
    console.error("Error creating Dodo Customer Portal session:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscription/dodo/webhook (public)
// ══════════════════════════════════════════════════════════════
const handleDodoWebhook = async (req, res) => {
  try {
    const webhookHeaders = {
      "webhook-id": req.headers["webhook-id"] || req.headers["Webhook-Id"] || req.headers["webhook_id"],
      "webhook-signature": req.headers["webhook-signature"] || req.headers["Webhook-Signature"] || req.headers["webhook_signature"],
      "webhook-timestamp": req.headers["webhook-timestamp"] || req.headers["Webhook-Timestamp"] || req.headers["webhook_timestamp"],
    };

    let event;
    try {
      event = verifyDodoWebhook({
        rawBody: req.rawBody || JSON.stringify(req.body),
        headers: webhookHeaders,
      });
    } catch (verifyErr) {
      console.warn("⚠️ [Dodo Webhook Signature Verification Failed]:", verifyErr.message);
      return res.status(400).json({ success: false, message: `Webhook signature verification failed: ${verifyErr.message}` });
    }

    const eventId = event.event_id || event.id || webhookHeaders["webhook-id"];
    const eventType = event.type;
    const eventData = event.data || {};

    if (!eventId) {
      return res.status(400).json({ success: false, message: "Missing event identifier" });
    }

    // Idempotency check via WebhookEventModel
    let webhookRecord;
    try {
      webhookRecord = await WebhookEventModel.create({
        eventId: `dodo_${eventId}`,
        eventType: eventType || "unknown",
        status: "received",
        payload: event,
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        // Duplicate event already processed
        return res.status(200).json({ received: true, duplicate: true });
      }
      throw dbErr;
    }

    // Process event types
    switch (eventType) {
      case "subscription.active": {
        const subData = eventData;
        const tenantId = subData.metadata?.tenantId;
        const planId = subData.metadata?.planId;
        const subId = subData.subscription_id || subData.id;
        const custId = subData.customer?.customer_id || subData.customer?.id;

        if (tenantId) {
          const now = new Date();
          const periodEnd = subData.next_billing_date ? new Date(subData.next_billing_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          let sub = await SubscriptionModel.findOne({ tenantId }).sort({ createdAt: -1 });
          if (sub) {
            if (planId) sub.planId = planId;
            sub.billingProvider = "dodo";
            sub.dodoSubscriptionId = subId;
            sub.dodoCustomerId = custId || sub.dodoCustomerId;
            sub.status = "active";
            sub.currentPeriodStart = now;
            sub.currentPeriodEnd = periodEnd;
            sub.gracePeriodStartedAt = null;
            await sub.save();
          }

          const tenantUpdate = {
            status: "Active",
            subscriptionStart: now,
            subscriptionEnd: periodEnd,
            isTrialActive: false,
            gracePeriodStartedAt: null,
          };
          if (planId) tenantUpdate.planId = planId;
          await TenantModel.findByIdAndUpdate(tenantId, tenantUpdate);
        }
        break;
      }

      case "subscription.renewed":
      case "payment.succeeded": {
        const payData = eventData;
        const subId = payData.subscription_id;
        const tenantId = payData.metadata?.tenantId;

        let sub = null;
        if (subId) {
          sub = await SubscriptionModel.findOne({ dodoSubscriptionId: subId }).sort({ createdAt: -1 });
        }
        if (!sub && tenantId) {
          sub = await SubscriptionModel.findOne({ tenantId }).sort({ createdAt: -1 });
        }

        if (sub) {
          const now = new Date();
          const periodEnd = payData.next_billing_date ? new Date(payData.next_billing_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          sub.status = "active";
          sub.currentPeriodEnd = periodEnd;
          sub.gracePeriodStartedAt = null;
          sub.paymentHistory.push({
            amount: (payData.total_amount || payData.amount || 0) / 100,
            currency: (payData.currency || "INR").toUpperCase(),
            status: "success",
            paidAt: now,
            transactionId: payData.payment_id || payData.id,
            orderId: subId || "",
            method: "dodo",
          });
          await sub.save();

          await TenantModel.findByIdAndUpdate(sub.tenantId, {
            status: "Active",
            subscriptionEnd: periodEnd,
            gracePeriodStartedAt: null,
          });
        }
        break;
      }

      case "subscription.failed":
      case "subscription.on_hold": {
        const failData = eventData;
        const subId = failData.subscription_id || failData.id;
        let sub = await SubscriptionModel.findOne({ dodoSubscriptionId: subId }).sort({ createdAt: -1 });
        if (sub) {
          const now = new Date();
          sub.status = "past_due";
          if (!sub.gracePeriodStartedAt) sub.gracePeriodStartedAt = now;
          await sub.save();

          await TenantModel.findByIdAndUpdate(sub.tenantId, {
            status: "PastDue",
            gracePeriodStartedAt: now,
          });
        }
        break;
      }

      case "subscription.cancelled": {
        const cancelData = eventData;
        const subId = cancelData.subscription_id || cancelData.id;
        let sub = await SubscriptionModel.findOne({ dodoSubscriptionId: subId }).sort({ createdAt: -1 });
        if (sub) {
          sub.status = "cancelled";
          sub.cancelAtPeriodEnd = true;
          sub.cancelledAt = new Date();
          await sub.save();
        }
        break;
      }

      default:
        break;
    }

    webhookRecord.status = "processed";
    webhookRecord.processedAt = new Date();
    await webhookRecord.save();

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error processing Dodo webhook:", err);
    return res.status(500).json({ error: err.message });
  }
};

export {
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
};
