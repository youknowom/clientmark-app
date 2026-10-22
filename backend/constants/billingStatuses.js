/**
 * Centralized Billing & Tenancy Status Constants
 */

export const TENANT_STATUS = Object.freeze({
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  PAST_DUE: "PastDue",
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: "active",
  TRIAL: "trial",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

export default {
  TENANT_STATUS,
  SUBSCRIPTION_STATUS,
};
