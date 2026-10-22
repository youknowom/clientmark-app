import mongoose from "mongoose";

const LockSchema = new mongoose.Schema(
  {
    lockName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const LockModel = mongoose.model("locks", LockSchema);
export default LockModel;
