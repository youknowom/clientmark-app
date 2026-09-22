import Stripe from "stripe";

const getStripeInstance = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured in environment variables.");
  }
  return new Stripe(secretKey);
};

/**
 * Get or create a Stripe Customer for a given tenant / workspace
 */
export const getOrCreateStripeCustomer = async ({ email, name, tenantId }) => {
  const stripe = getStripeInstance();

  // Search existing customer by email
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return existing.data[0];
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: email || undefined,
    name: name || undefined,
    metadata: {
      tenantId: tenantId?.toString() || "",
    },
  });

  return customer;
};

/**
 * Create a Stripe Checkout Session for subscription upgrade
 */
export const createStripeCheckoutSession = async ({
  customerId,
  customerEmail,
  plan,
  billingCycle,
  tenantId,
  successUrl,
  cancelUrl,
}) => {
  const stripe = getStripeInstance();

  const isYearly = billingCycle === "yearly";
  const amount = isYearly ? (plan.yearlyPrice || plan.price * 10) : plan.price;
  const currency = (plan.currency || "INR").toLowerCase();

  // Determine price item: predefined Stripe price ID or inline recurring price_data
  let lineItem;
  const predefinedPriceId = isYearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

  if (predefinedPriceId) {
    lineItem = {
      price: predefinedPriceId,
      quantity: 1,
    };
  } else {
    // Generate inline recurring price on-the-fly
    lineItem = {
      price_data: {
        currency,
        product_data: {
          name: `Clientmark ${plan.planName} Plan (${isYearly ? "Annual" : "Monthly"})`,
          description: plan.description || `Access to ${plan.planName} tier on Clientmark CRM`,
        },
        unit_amount: Math.round(amount * 100), // Subunit (paise / cents)
        recurring: {
          interval: isYearly ? "year" : "month",
        },
      },
      quantity: 1,
    };
  }

  const sessionParams = {
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [lineItem],
    metadata: {
      tenantId: tenantId?.toString() || "",
      planId: plan._id?.toString() || "",
      billingCycle: isYearly ? "yearly" : "monthly",
    },
    subscription_data: {
      metadata: {
        tenantId: tenantId?.toString() || "",
        planId: plan._id?.toString() || "",
        billingCycle: isYearly ? "yearly" : "monthly",
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
};

/**
 * Construct and verify Stripe webhook event
 */
export const constructStripeWebhookEvent = (rawBody, signature) => {
  const stripe = getStripeInstance();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
};

/**
 * Retrieve checkout session with expanded details
 */
export const retrieveCheckoutSession = async (sessionId) => {
  const stripe = getStripeInstance();
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer", "payment_intent"],
  });
};

/**
 * Cancel a Stripe subscription at period end
 */
export const cancelStripeSubscription = async (subscriptionId) => {
  const stripe = getStripeInstance();
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};
