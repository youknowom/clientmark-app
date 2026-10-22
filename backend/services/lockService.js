import crypto from "crypto";
import LockModel from "../models/lockModel.js";

const INSTANCE_ID = process.env.INSTANCE_ID || crypto.randomUUID();

/**
 * Acquire a distributed lease lock.
 * Atomic findOneAndUpdate ensures only ONE instance acquires the lock.
 *
 * @param {string} lockName - Unique identifier for the job
 * @param {number} ttlSeconds - Duration in seconds before the lock automatically expires
 * @param {string} [ownerId] - Optional custom owner ID (defaults to instance UUID)
 * @returns {Promise<boolean>} True if lock was acquired, false if held by another instance
 */
export const acquireLock = async (lockName, ttlSeconds = 60, ownerId = INSTANCE_ID) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  try {
    // 1. Try atomic acquire on expired or non-existent lock
    const lock = await LockModel.findOneAndUpdate(
      {
        lockName,
        $or: [
          { expiresAt: { $lte: now } },
          { ownerId }, // Re-entrant for the same owner
        ],
      },
      {
        $set: {
          lockName,
          ownerId,
          expiresAt,
          acquiredAt: now,
        },
      },
      { new: true }
    );

    if (lock) {
      return true;
    }

    // 2. If no record was updated, attempt insert (will fail with E11000 if active lock exists)
    await LockModel.create({
      lockName,
      ownerId,
      expiresAt,
      acquiredAt: now,
    });

    return true;
  } catch (err) {
    if (err.code === 11000) {
      // Another instance holds the active lock
      return false;
    }
    console.error(`[LockService] Error acquiring lock '${lockName}':`, err.message);
    return false;
  }
};

/**
 * Release a previously acquired lock if still owned by this instance.
 */
export const releaseLock = async (lockName, ownerId = INSTANCE_ID) => {
  try {
    await LockModel.deleteOne({ lockName, ownerId });
    return true;
  } catch (err) {
    console.error(`[LockService] Error releasing lock '${lockName}':`, err.message);
    return false;
  }
};

/**
 * Run a job with distributed lease lock.
 * Executes job only if lock was successfully acquired, and releases upon completion.
 */
export const withLock = async (lockName, ttlSeconds, fn, ownerId = INSTANCE_ID) => {
  const acquired = await acquireLock(lockName, ttlSeconds, ownerId);
  if (!acquired) {
    return { ran: false, reason: "Lock held by another instance" };
  }

  try {
    const result = await fn();
    return { ran: true, result };
  } finally {
    await releaseLock(lockName, ownerId);
  }
};

export default {
  acquireLock,
  releaseLock,
  withLock,
  INSTANCE_ID,
};
