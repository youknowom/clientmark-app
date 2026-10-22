import DodoPayments from "dodopayments";
import { Webhook } from "standardwebhooks";

/**
 * Initialize Dodo Payments client instance.
 * Reads DODO_PAYMENTS_API_KEY from environment.
 * Default environment: test_mode (unless NODE_ENV === 'production').
 */
export const getDodoClient = () => {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const environment =
    process.env.DODO_PAYMENTS_ENVIRONMENT ||
    (process.env.NODE_ENV === "production" ? "live_mode" : "test_mode");

  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY || process.env.DODO_PAYMENTS_WEBHOOK_SECRET || null;

  return new DodoPayments({
    bearerToken: apiKey,
    environment,
    webhookKey,
  });
};

/**
 * Resolve Dodo Payments product ID from environment configuration or plan document.
 */
export const getDodoProductId = ({ plan, billingCycle = "monthly" }) => {
  if (!plan) return null;

  const cycle = (billingCycle || "monthly").toLowerCase();
  const slug = (plan.slug || plan.planName || "").toLowerCase();

  // 1. Check direct environment overrides
  const envMap = {
    starter_monthly: process.env.DODO_PRODUCT_STARTER_MONTHLY,
    starter_yearly: process.env.DODO_PRODUCT_STARTER_YEARLY,
    professional_monthly: process.env.DODO_PRODUCT_PROFESSIONAL_MONTHLY,
    professional_yearly: process.env.DODO_PRODUCT_PROFESSIONAL_YEARLY,
    enterprise_monthly: process.env.DODO_PRODUCT_ENTERPRISE_MONTHLY,
    enterprise_yearly: process.env.DODO_PRODUCT_ENTERPRISE_YEARLY,
  };

  const envKey = `${slug}_${cycle}`;
  if (envMap[envKey]) {
    return envMap[envKey];
  }

  // 2. Check Plan document fields
  if (cycle === "yearly" && plan.dodoProductIdYearly) {
    return plan.dodoProductIdYearly;
  }
  if (cycle === "monthly" && plan.dodoProductIdMonthly) {
    return plan.dodoProductIdMonthly;
  }

  // 3. Fallback placeholder identifier
  return `pdt_${slug}_${cycle}`;
};

/**
 * Create Dodo Payments Checkout Session
 */
export const createDodoCheckoutSession = async ({
  plan,
  billingCycle = "monthly",
  tenant,
  user,
  clientUrl = "http://localhost:3000",
}) => {
  const client = getDodoClient();
  const productId = getDodoProductId({ plan, billingCycle });

  const returnUrl = `${clientUrl.replace(/\/+$/, "")}/billing?session_id={CHECKOUT_SESSION_ID}&status=success&provider=dodo`;

  // Fallback mock mode if DODO_PAYMENTS_API_KEY is not set or in test mode
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const isMockEnv =
    !client ||
    process.env.DODO_PAYMENTS_MOCK === "true" ||
    (process.env.NODE_ENV === "test" && (!apiKey || apiKey.includes("placeholder")));

  if (isMockEnv) {
    const mockSessionId = `dodo_mock_sess_${Date.now()}`;
    return {
      sessionId: mockSessionId,
      checkoutUrl: `${clientUrl.replace(/\/+$/, "")}/billing?session_id=${mockSessionId}&status=success&provider=dodo&mock=true`,
      isMock: true,
      productId,
    };
  }

  const session = await client.checkoutSessions.create({
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
      },
    ],
    billing: {
      city: tenant?.city || "Mumbai",
      country: "IN",
      state: tenant?.state || "Maharashtra",
      street: tenant?.address || "Commercial Tower",
      zipcode: tenant?.zipCode || "400001",
    },
    customer: {
      email: user?.email || tenant?.email,
      name: user?.name || tenant?.companyName,
    },
    metadata: {
      tenantId: tenant?._id ? tenant._id.toString() : "",
      planId: plan?._id ? plan._id.toString() : "",
      billingCycle,
      provider: "dodo",
    },
    return_url: returnUrl,
  });

  return {
    sessionId: session.session_id,
    checkoutUrl: session.checkout_url || session.payment_link,
    isMock: false,
    productId,
  };
};

/**
 * Retrieve & verify Dodo Checkout Session
 */
export const retrieveDodoCheckoutSession = async (sessionId) => {
  const client = getDodoClient();

  if (!client || process.env.DODO_PAYMENTS_MOCK === "true" || sessionId?.startsWith("dodo_mock_")) {
    return {
      session_id: sessionId,
      status: "complete",
      payment_status: "paid",
      customer: {
        id: "cus_mock_dodo",
        email: "demo-admin@clientmark.app",
        name: "Acme Digital Agency",
      },
      subscription_id: `sub_dodo_mock_${Date.now()}`,
      metadata: {},
    };
  }

  return await client.checkoutSessions.retrieve(sessionId);
};

/**
 * Generate a Dodo Customer Portal session link for managing active subscriptions
 */
export const createDodoCustomerPortalSession = async ({ customerId, returnUrl }) => {
  const client = getDodoClient();

  if (!client || process.env.DODO_PAYMENTS_MOCK === "true" || customerId?.startsWith("cus_mock")) {
    return {
      link: returnUrl || "http://localhost:3000/billing",
      isMock: true,
    };
  }

  const session = await client.customers.customerPortal.create(customerId, {
    return_url: returnUrl,
  });

  return {
    link: session.link,
    isMock: false,
  };
};

/**
 * Verify Dodo Payments webhook payload signature using standardwebhooks.
 * Headers must include: webhook-id, webhook-signature, webhook-timestamp
 */
export const verifyDodoWebhook = ({ rawBody, headers, webhookSecret }) => {
  const secret = webhookSecret || process.env.DODO_PAYMENTS_WEBHOOK_KEY || process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("DODO_PAYMENTS_WEBHOOK_KEY is not configured.");
  }

  // Convert rawBody to string representation if Buffer
  const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

  const wh = new Webhook(secret);
  return wh.verify(bodyString, headers);
};

export default {
  getDodoClient,
  getDodoProductId,
  createDodoCheckoutSession,
  retrieveDodoCheckoutSession,
  createDodoCustomerPortalSession,
  verifyDodoWebhook,
};
