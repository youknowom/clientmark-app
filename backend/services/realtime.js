let ioInstance = null;

/**
 * Register the initialized Socket.IO server instance.
 */
export const setIO = (io) => {
  ioInstance = io;
};

/**
 * Retrieve the active Socket.IO server instance.
 */
export const getIO = () => {
  return ioInstance;
};

/**
 * Strict allowlist of permitted keys in emitted realtime payloads.
 * (id, ids, action, and small summary/identifier fields).
 */
export const ALLOWED_PAYLOAD_KEYS = new Set([
  "id",
  "ids",
  "action",
  "projectId",
  "projectIds",
  "projectName",
  "leadId",
  "leadIds",
  "notificationId",
  "title",
  "message",
  "notificationType",
  "redirectUrl",
  "type",
  "count",
]);

/**
 * Filter payload keys strictly through the allowlist.
 * Emitted payloads must contain ONLY permitted allowlisted fields.
 */
export const sanitizePayload = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  const sanitized = {};
  for (const key of Object.keys(payload)) {
    if (ALLOWED_PAYLOAD_KEYS.has(key)) {
      sanitized[key] = payload[key];
    }
  }
  return sanitized;
};

/**
 * Emit an event strictly to a specific tenant's room.
 * @param {string|ObjectId} tenantId - The owning tenant ID
 * @param {string} event - The structured event name (e.g. "project:created", "lead:updated")
 * @param {object} payload - Minimal summary payload (IDs and action summary only)
 */
export const emitToTenant = (tenantId, event, payload = {}) => {
  if (!ioInstance || !tenantId) return;
  const room = `tenant:${tenantId.toString()}`;
  const cleanPayload = sanitizePayload(payload);
  ioInstance.to(room).emit(event, cleanPayload);
};

/**
 * Emit an event strictly to a specific user's room.
 * @param {string|ObjectId} userId - Target user ID
 * @param {string} event - The event name (e.g. "notification:new")
 * @param {object} payload - Minimal notification payload
 */
export const emitToUser = (userId, event, payload = {}) => {
  if (!ioInstance || !userId) return;
  const room = `user:${userId.toString()}`;
  const cleanPayload = sanitizePayload(payload);
  ioInstance.to(room).emit(event, cleanPayload);
};

/**
 * Disconnect all active sockets belonging to a specific user.
 * Triggered on password change, password reset, or account deactivation.
 * @param {string|ObjectId} userId
 */
export const disconnectUserSockets = async (userId) => {
  if (!ioInstance || !userId) return;
  try {
    const room = `user:${userId.toString()}`;
    const sockets = await ioInstance.in(room).fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }
  } catch (err) {
    console.error(`[Realtime] Failed to disconnect sockets for user ${userId}:`, err.message);
  }
};

/**
 * Disconnect all active sockets belonging to all users within a tenant.
 * Triggered on tenant suspension or cancellation.
 * @param {string|ObjectId} tenantId
 */
export const disconnectTenantSockets = async (tenantId) => {
  if (!ioInstance || !tenantId) return;
  try {
    const room = `tenant:${tenantId.toString()}`;
    const sockets = await ioInstance.in(room).fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }
  } catch (err) {
    console.error(`[Realtime] Failed to disconnect sockets for tenant ${tenantId}:`, err.message);
  }
};

export default {
  setIO,
  getIO,
  emitToTenant,
  emitToUser,
  disconnectUserSockets,
  disconnectTenantSockets,
};
