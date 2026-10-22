# BUNDLE A: DEPLOYMENT & MIGRATION GUIDE

This document details all deployment scripts, execution order, environment configurations, and verification procedures for Bundle A.

---

## 1. Migration Scripts Inventory & Execution Order

All migration scripts reside in `backend/scripts/`.

| Order | Script Name | Purpose | `--dry-run` Support | Idempotent | Execution Timing |
|:---:|---|---|:---:|:---:|:---:|
| **1** | `deleteLegacyPlaintextOtps.js` | Deletes legacy unhashed OTP records from the `otps` collection to ensure all remaining OTPs use HMAC-SHA256. | Yes (`--dry-run`) | Yes | **BEFORE new code starts** |
| **2** | `createUniqueUserIndexes.js` | Read-only inspection of normalization and duplicate records on `email`, `userName`, and `mobileNo`. NEVER modifies or deletes user data. If duplicates exist, reports offending IDs and aborts. When clean, creates global partial unique indexes on `{ userName: 1 }`, `{ email: 1 }`, `{ mobileNo: 1 }`. | Yes (`--dry-run`) | Yes | **BEFORE new code starts** |
| **3** | `backfillTokenVersion.js` | Sets `tokenVersion: 1` on all user documents missing the field, enabling instantaneous multi-session token revocation. | Yes (`--dry-run`) | Yes | **BEFORE new code starts** |
| **4** | `backfillPortalKeys.js` | Generates cryptographically secure, random 64-character hex `portalKey` strings for any legacy project records missing a portal key and creates a partial unique index. | Yes (`--dry-run`) | Yes | **BEFORE new code starts** |
| **5** | `encryptExistingCredentials.js` *(alias: `migrateCredentials.js`)* | Encrypts plaintext WhatsApp credentials (token, instanceId) and SoftwareSettings (SMTP password, Gemini API key) with AES-256-GCM. Flags legacy bcrypted SMTP passwords with `smtpNeedsReentry: true`. | Yes (`--dry-run`) | Yes | **BEFORE new code starts** |
| **6** | `migrateUploads.js` | Inspects legacy static files in `./uploads`, moves them into tenant-isolated folders, creates database metadata in `FileModel`, and removes public direct links. | Yes (`--dry-run`) | Yes | **BEFORE new code starts** |
| **7** | `verifyDeployment.js` | Comprehensive, **read-only** verification tool that checks database integrity, key parsing, schema fields existence, index presence, file resolution, and SMTP environment setup. | N/A (Read-only) | Yes | **POST-DEPLOY (Verification)** |

> [!NOTE]
> **`migrateCredentials.js` vs `encryptExistingCredentials.js`**:
> They execute the **exact same migration logic**. `migrateCredentials.js` is a direct canonical alias that imports and invokes `encryptExistingCredentials.js`. Both support `--dry-run` and are 100% idempotent.

---

## 2. Environment Variables & Secret Generation

Ensure the following variables are configured in `backend/.env` prior to starting the application:

### A. Core Security Secrets
```bash
# Generate 32-byte hex key (64 hex characters) for AES-256-GCM credential encryption:
node -e "console.log('CREDENTIALS_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'))"

# Generate 32-byte hex key for HMAC-SHA256 OTP hashing:
node -e "console.log('OTP_HMAC_SECRET=' + crypto.randomBytes(32).toString('hex'))"

# Generate 32-byte hex key for Client Portal JWT signing:
node -e "console.log('PORTAL_JWT_SECRET=' + crypto.randomBytes(32).toString('hex'))"

# Primary staff JWT secret:
node -e "console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'))"
```

### B. Platform SMTP Settings
In production (`NODE_ENV=production`), the application refuses to start if these variables are missing:
```env
PLATFORM_SMTP_HOST=smtp.gmail.com
PLATFORM_SMTP_PORT=587
PLATFORM_SMTP_SECURE=false
PLATFORM_SMTP_USER=support@clientmark.app
PLATFORM_SMTP_PASS=app_password_here
PLATFORM_SMTP_FROM="Clientmark Support <support@clientmark.app>"
```

### C. Security & Rate-Limiting Flags
```env
PORTAL_LEGACY_SLUG_ENABLED=false
TENANT_DAILY_OTP_CAP=200
SOCKET_MAX_PER_USER=5
SOCKET_MAX_PER_DEMO_USER=200
TRUST_PROXY=1
GRACE_DAYS=5
DEMO_RESET_CRON=0 */6 * * *
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=uploads
LEGACY_PUBLIC_UPLOADS=false
```

---

## 3. Real Public Route Paths (Mounted in `config/app.js`)

In this backend architecture, routers are mounted directly at root resource paths without an `/api` prefix (with the exception of `/api/health`).

### Routers Mounted in `config/app.js`:
- `GET  /api/health` — System health check
- `USE  /files` — `fileRouter` (Private authenticated file streaming)
- `USE  /user` — `userRouter` (Authentication, profiles, passwords, user CRUD)
- `USE  /branch` — `branchRouter` (Branch management)
- `USE  /software-setting` — `softwareSettingRouter` (Software branding, SMTP settings)
- `USE  /lead` — `leadRouter` (Lead management, stages, transfers)
- `USE  /project` — `projectRouter` (Project tracking, timeline, portal access)
- `USE  /notification` — `notificationRouter` (In-app notifications)
- `USE  /tenant` — `tenantRouter` (Tenant registration, workspace switcher, demo sandbox)
- `USE  /subscription` — `subscriptionRouter` (Plans, Stripe/Razorpay billing & webhooks)
- `USE  /onboarding` — `onboardingRouter` (Initial tenant setup wizard)
- `USE  /chatbot` — `chatbotRouter` (AI assistant & chat logs)

### All Routes in `subscriptionRouter.js`:
- `GET  /subscription/plans` — Public plan listing
- `POST /subscription/webhook` — Razorpay webhook endpoint
- `POST /subscription/stripe/webhook` — Stripe webhook endpoint
- `GET  /subscription/my-plan` — Protected tenant plan, usage vs limits, and grace status
- `GET  /subscription/usage` — Protected current tenant resource usage
- `POST /subscription/stripe/create-checkout-session` — Protected create Stripe checkout session
- `GET  /subscription/stripe/verify-session` — Protected verify Stripe session on redirect
- `POST /subscription/create-order` — Protected create Razorpay order
- `POST /subscription/verify-payment` — Protected verify Razorpay payment signature
- `POST /subscription/cancel` — Protected cancel active subscription

> **Why `/api/subscriptions/...` was referenced previously**:
> Standard REST conventions frequently assume `/api/<plural>` prefixes. The CRM routes are mounted directly as `/subscription/...` in `config/app.js`. All external configurations, documentation, and webhook subscriptions MUST use `/subscription/...`.

---

## 4. Payment Gateway Webhook Configuration

Register the exact public paths and subscribe strictly to the handled events:

### Stripe Dashboard
- **Public URL**: `POST https://<YOUR_API_DOMAIN>/subscription/stripe/webhook`
- **Handled Events in Code (`handleStripeWebhook` switch cases)**:
  - `checkout.session.completed` — Fulfills checkout, resets `gracePeriodStartedAt`, activates plan
  - `customer.subscription.deleted` — Cancels subscription, downgrades to Free if available or marks Cancelled
  - `customer.subscription.updated` — Updates subscription status; sets `gracePeriodStartedAt` if `past_due`/`unpaid`, clears if `active`

### Razorpay Dashboard
- **Public URL**: `POST https://<YOUR_API_DOMAIN>/subscription/webhook`
- **Flow Details**: The CRM integrates with Razorpay via **one-time Orders (`createOrder` / `razorpay.orders.create`)** with plan metadata. It does NOT use the Razorpay Subscriptions API. Therefore, `subscription.*` events are NOT handled and should not be subscribed.
- **Handled Events in Code (`handleWebhook` switch cases)**:
  - `order.paid` — Activates plan, creates/renews subscription, clears `gracePeriodStartedAt`
  - `payment.captured` — Activates plan, records payment in history, clears `gracePeriodStartedAt`
  - `payment.failed` — Records failed payment in history, marks status `PastDue`, and sets `gracePeriodStartedAt`

---

## 5. Step-by-Step Production Deployment Runbook

Execute these steps in exact order:

### Step 1: Backup Database and Uploaded Assets
```bash
mongodump --uri="<MONGO_URI>" --out="./backup_pre_bundle_a_$(date +%Y%m%d_%H%M%S)"
tar -czf "./backup_uploads_$(date +%Y%m%d_%H%M%S).tar.gz" ./uploads
```

### Step 2: Run Database Migrations in `--dry-run` Mode First
```bash
cd backend
node scripts/deleteLegacyPlaintextOtps.js --dry-run
node scripts/createUniqueUserIndexes.js --dry-run
node scripts/backfillTokenVersion.js --dry-run
node scripts/backfillPortalKeys.js --dry-run
node scripts/migrateCredentials.js --dry-run
node scripts/migrateUploads.js --dry-run
```

### Step 3: Execute Live Migrations (BEFORE starting new server)
```bash
node scripts/deleteLegacyPlaintextOtps.js
node scripts/createUniqueUserIndexes.js
node scripts/backfillTokenVersion.js
node scripts/backfillPortalKeys.js
node scripts/migrateCredentials.js
node scripts/migrateUploads.js
```

### Step 4: Start or Reload Server
```bash
# E.g. with PM2 or systemd:
pm2 reload server
```

### Step 5: Run Read-Only Verification Suite
```bash
node scripts/verifyDeployment.js
```
*Must report `All pre/post deployment verification checks passed successfully!` with 0 failures.*
