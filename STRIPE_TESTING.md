# STRIPE BILLING & WEBHOOK TESTING GUIDE

This guide details the exact steps for end-to-end testing of Stripe recurring subscriptions, Customer Portal sessions, test clocks, and webhook event handling on **Clientmark CRM**.

---

## 1. Prerequisites & Environment Setup

1. **Install Stripe CLI**:
   - Windows (via Scoop/Chocolatey): `scoop install stripe` or download from [Stripe CLI GitHub](https://github.com/stripe/stripe-cli/releases).
   - Verify: `stripe --version`
2. **Authenticate with Stripe**:
   ```powershell
   stripe login
   ```
3. **Configure Backend Environment Variables (`backend/.env`)**:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   RAZORPAY_ENABLED=false
   CLIENT_URL=http://localhost:3000
   ```

---

## 2. Starting Local Webhook Forwarding

Start forwarding Stripe events directly to your local backend server:

```powershell
stripe listen --forward-to localhost:8081/subscription/stripe/webhook
```

When started, Stripe CLI outputs your unique forwarding signing secret:
```text
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Copy this `whsec_...` value into your `backend/.env` under `STRIPE_WEBHOOK_SECRET` and restart the backend server so incoming webhooks pass HMAC SHA-256 signature verification.

---

## 3. Stripe Dashboard Webhook Subscriptions

In production or staging, configure your Stripe Dashboard Webhook endpoint URL:
`https://yourdomain.com/subscription/stripe/webhook`

Subscribe **strictly** to these 5 events:
1. `checkout.session.completed`
2. `invoice.paid`
3. `invoice.payment_failed`
4. `customer.subscription.updated`
5. `customer.subscription.deleted`

---

## 4. End-to-End Scenarios with Stripe Test Clocks

Stripe Test Clocks allow advancing time artificially to simulate recurring billing cycles, renewals, retries, and cancellations without waiting days or months.

### Creating a Customer with a Test Clock
```powershell
# 1. Create a test clock
stripe test-clocks create --name="Tenant Billing Clock" --frozen-time=$(Get-Date -UFormat %s)

# 2. Note the test clock ID (clock_xxxx) and create a customer attached to it:
stripe customers create --name="Acme Corp" --email="billing@acmecorp.test" --test-clock=clock_xxxx
```

---

### Scenario A: New Subscription (Checkout Flow)

1. **Trigger**:
   - Tenant Admin navigates to `/billing` on the frontend.
   - Selects a paid plan (e.g., Professional or Enterprise) and clicks **Select Plan**.
   - Clientmark creates a Stripe Checkout Session with `mode: "subscription"`.
   - Browser redirects to Stripe Hosted Checkout. Complete using test card `4242 4242 4242 4242` (any future expiry, CVC 123).
2. **Expected Webhook Events**:
   - `customer.created`
   - `customer.subscription.created`
   - `checkout.session.completed` (Primary)
   - `invoice.created`
   - `invoice.paid`
3. **Backend Action**:
   - Verifies `mode === "subscription"` and `payment_status === "paid"`.
   - Persists `stripeCustomerId`, `stripeSubscriptionId`, and `stripeSessionId` on `SubscriptionModel`.
   - Sets `status: "active"`, initializes `currentPeriodStart` and `currentPeriodEnd`.
   - Updates `TenantModel` to `status: "Active"`.
4. **CLI Simulation Alternative**:
   ```powershell
   stripe trigger checkout.session.completed
   ```

---

### Scenario B: Recurring Subscription Renewal (`invoice.paid`)

1. **Trigger**:
   - Advance the test clock forward by 1 month to simulate renewal:
   ```powershell
   stripe test-clocks advance clock_xxxx --months=1
   ```
2. **Expected Webhook Events**:
   - `invoice.created`
   - `invoice.finalized`
   - `payment_intent.succeeded`
   - `invoice.paid` (Primary)
3. **Backend Action**:
   - Matches incoming invoice to tenant via `stripeSubscriptionId` or `stripeCustomerId`.
   - Reads `invoice.lines.data[0].period.end` (Unix epoch timestamp).
   - Updates `SubscriptionModel.currentPeriodEnd` and `TenantModel.subscriptionEnd`.
   - Resets `gracePeriodStartedAt` to `null` and ensures `status: "active"`.
   - Appends successful renewal transaction to `SubscriptionModel.paymentHistory`.
4. **CLI Simulation Alternative**:
   ```powershell
   stripe trigger invoice.paid
   ```

---

### Scenario C: Failed Renewal Payment (`invoice.payment_failed`)

1. **Trigger**:
   - Attach a failing test card (e.g., `4000 0000 0000 0002` - Card Declined) as default payment method in the Customer Portal.
   - Advance the clock forward by 1 month:
   ```powershell
   stripe test-clocks advance clock_xxxx --months=1
   ```
2. **Expected Webhook Events**:
   - `invoice.created`
   - `invoice.payment_failed` (Primary)
   - `customer.subscription.updated` (`status: "past_due"`)
3. **Backend Action**:
   - Sets `SubscriptionModel.status = "past_due"`.
   - Records `gracePeriodStartedAt = new Date()`.
   - Updates `TenantModel.status = "PastDue"`.
   - Appends failed transaction to `SubscriptionModel.paymentHistory` with error reason.
   - Sends notification email to tenant owner warning of grace period.
   - **Data Preserved**: Workspace reads continue unimpeded during grace days; creates are gated.
4. **CLI Simulation Alternative**:
   ```powershell
   stripe trigger invoice.payment_failed
   ```

---

### Scenario D: Plan Upgrade / Downgrade with Proration

1. **Trigger**:
   - Existing active subscriber selects a new plan from `/billing` or clicks **Manage Invoices & Cards (Stripe Portal)**.
   - Calls `POST /subscription/stripe/change-plan` with target `planId`.
2. **Expected Webhook Events**:
   - `customer.subscription.updated` (Primary)
   - `invoice.created` (prorated difference)
   - `invoice.paid`
3. **Backend Action**:
   - Stripe updates subscription items with `proration_behavior: "create_prorations"`.
   - `customer.subscription.updated` updates `planId` and synchronizes new period end.
   - Duplicate subscription guard prevents creating a second checkout session.

---

### Scenario E: Mid-Period Failed Checkout Attempt (Safety Check)

1. **Trigger**:
   - A tenant currently mid-period with an active paid subscription attempts a one-time checkout or abandons an incomplete checkout.
2. **Backend Action**:
   - Webhook handler checks: if `session.mode !== "subscription"` or `session.payment_status !== "paid"`, the webhook **changes nothing**.
   - Active subscription period, tenant status, and entitlements remain 100% active and untouched.

---

### Scenario F: Subscription Cancellation & Period-End Expiry

1. **Trigger**:
   - User cancels subscription via Customer Portal or `/subscription/cancel`.
2. **Expected Webhook Events (Immediate)**:
   - `customer.subscription.updated` with `cancel_at_period_end: true`.
   - Backend marks `SubscriptionModel.cancelAtPeriodEnd = true`; access remains active until `currentPeriodEnd`.
3. **Expected Webhook Events (At Period End)**:
   - Clock advances past period end:
   ```powershell
   stripe test-clocks advance clock_xxxx --days=35
   ```
   - Stripe terminates the subscription:
   - `customer.subscription.deleted` (Primary)
4. **Backend Action**:
   - Sets `SubscriptionModel.status = "cancelled"` and `cancelledAt = new Date()`.
   - Automatically downgrades workspace to the active `Free` plan in `TenantModel`.
   - If no Free plan exists, marks `status = "Suspended"` and disconnects active realtime sockets.

---

## 5. Webhook Idempotency Verification

Stripe may deliver identical webhook events more than once. Clientmark CRM enforces idempotency via `WebhookEventModel`:

```powershell
# Send the same event twice
stripe trigger invoice.paid
stripe trigger invoice.paid
```

Verify in server logs:
- First delivery returns HTTP 200 `{ status: "ok" }` and processes the event.
- Second delivery identifies duplicate `eventId` in `WebhookEventModel` and returns HTTP 200 `{ status: "already_processed" }` without re-running period extensions or charging history.

---

## 6. Running Automated Billing Test Suite

To verify all Stripe behaviors, guards, and webhook processing programmatically:

```powershell
cd backend
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/stripe_billing.test.js --runInBand
```
