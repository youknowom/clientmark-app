import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * Lazy initialization of Razorpay client.
 * Returns null if credentials are not configured (e.g. initial dev environment).
 */
const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Create a Razorpay Order for a subscription purchase/renewal.
 * Amount is passed in RUPEES, converted to PAISE (multiplied by 100).
 */
export const createRazorpayOrder = async ({
  amountInRupees,
  currency = "INR",
  receipt,
  notes = {},
}) => {
  const razorpay = getRazorpayClient();

  if (!razorpay) {
    throw new Error(
      "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
    );
  }

  const options = {
    amount: Math.round(amountInRupees * 100), // convert to paise
    currency,
    receipt,
    notes,
  };

  return await razorpay.orders.create(options);
};

/**
 * Verify Razorpay payment signature for client checkout callback.
 * Formula: HMAC_SHA256(order_id + "|" + payment_id, key_secret) === signature
 */
export const verifyPaymentSignature = ({
  orderId,
  paymentId,
  signature,
}) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured on server.");
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
};

/**
 * Verify Razorpay Webhook signature using RAW request body buffer.
 * Formula: HMAC_SHA256(rawBody, webhookSecret) === x-razorpay-signature
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured on server.");
  }

  if (!rawBody || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Constant-time buffer comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch (err) {
    return false;
  }
};

/**
 * Fetch payment details from Razorpay by Payment ID
 */
export const fetchPaymentDetails = async (paymentId) => {
  const razorpay = getRazorpayClient();
  if (!razorpay) return null;
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    console.error(`Error fetching payment ${paymentId}:`, error.message);
    return null;
  }
};

export default {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
};
