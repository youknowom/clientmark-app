import UserModel from "../models/userModel.js";
import LeadModel from "../models/leadModel.js";
import BranchModel from "../models/branchModel.js";
import ProjectModel from "../models/projectModel.js";
import PlanModel from "../models/planModel.js";
import SubscriptionModel from "../models/subscriptionModel.js";
import TenantModel from "../models/tenantModel.js";
import WebhookEventModel from "../models/webhookEventModel.js";
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
} from "../services/stripeService.js";

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

    if (!subscription) {
      // Fallback: lookup tenant plan directly if subscription record hasn't been created yet
      const tenant = await TenantModel.findById(tenantId).populate("planId").lean();
      return res.status(200).json({
        message: "Fetched tenant plan.",
        success: true,
        data: tenant?.planId
          ? {
              tenantId,
              planId: tenant.planId,
              status: tenant.isTrialActive ? "trial" : "active",
              billingCycle: "monthly",
              currentPeriodStart: tenant.subscriptionStart || tenant.createdAt,
              currentPeriodEnd: tenant.subscriptionEnd || tenant.trialEndsAt,
              paymentHistory: [],
            }
          : null,
      });
    }

    return res.status(200).json({
      message: "Successfully fetched subscription.",
      success: true,
      data: subscription,
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

    if (roleName !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators can manage billing and subscriptions.",
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

    if (roleName !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators can activate subscriptions.",
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

    if (roleName !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators can cancel subscriptions.",
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

    // Verify HMAC signature using raw request body
    const isValid = verifyWebhookSignature(req.rawBody, signature);
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
              await sub.save();
            }

            await TenantModel.findByIdAndUpdate(tenantId, {
              planId: plan._id,
              subscriptionStart: currentPeriodStart,
              subscriptionEnd: currentPeriodEnd,
              isTrialActive: false,
              status: "Active",
            });
          }
        }
        break;
      }

      case "payment.failed": {
        if (tenantId) {
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
              paidAt: new Date(),
              transactionId: paymentEntity?.id || "",
              orderId: paymentEntity?.order_id || "",
              method: paymentEntity?.method || "razorpay",
              errorReason: paymentEntity?.error_description || "Payment failed",
            });
            activeSub.status = "past_due";
            await activeSub.save();
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

    if (roleName !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only workspace Administrators can manage billing and subscriptions.",
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

    const targetTenantId = session.metadata?.tenantId || tenantId;
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
// POST /subscription/stripe/webhook (public, verified)
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
      case "checkout.session.completed": {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        const planId = session.metadata?.planId;
        const billingCycle = session.metadata?.billingCycle || "monthly";

        if (tenantId && planId) {
          const plan = await PlanModel.findById(planId);
          if (plan) {
            const currentPeriodStart = new Date();
            const currentPeriodEnd = new Date();
            if (billingCycle === "yearly") {
              currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
            } else {
              currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
            }

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
              sub.stripeSubscriptionId = session.subscription || sub.stripeSubscriptionId;
              sub.stripeCustomerId = session.customer || sub.stripeCustomerId;
              sub.amount = (session.amount_total || 0) / 100;
              sub.currency = (session.currency || "INR").toUpperCase();
              sub.status = "active";
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
                stripeSubscriptionId: session.subscription || "",
                stripeCustomerId: session.customer || "",
                amount: (session.amount_total || 0) / 100,
                currency: (session.currency || "INR").toUpperCase(),
                status: "active",
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
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subObject = event.data.object;
        const tenantId = subObject.metadata?.tenantId;
        if (tenantId) {
          await SubscriptionModel.updateMany(
            { tenantId, stripeSubscriptionId: subObject.id },
            { $set: { status: "cancelled", cancelledAt: new Date() } }
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subObject = event.data.object;
        const tenantId = subObject.metadata?.tenantId;
        if (tenantId) {
          const sub = await SubscriptionModel.findOne({
            tenantId,
            stripeSubscriptionId: subObject.id,
          });
          if (sub) {
            sub.cancelAtPeriodEnd = subObject.cancel_at_period_end || false;
            if (subObject.status === "active") sub.status = "active";
            if (subObject.status === "past_due") sub.status = "past_due";
            await sub.save();
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
};
