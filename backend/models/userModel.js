import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    userName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
    },

    mobileNo: {
      type: String,
    },

    password: {
      type: String,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "roles",
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branches",
      default: null,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "departments",
      default: null,
    },

    reportToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    tokenVersion: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true, autoIndex: false },
);

// Unique partial indexes (manually synced via scripts/createUniqueUserIndexes.js)
UserSchema.index(
  { userName: 1 },
  { unique: true, partialFilterExpression: { userName: { $type: "string", $gt: "" } } }
);
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string", $gt: "" } } }
);
UserSchema.index(
  { mobileNo: 1 },
  { unique: true, partialFilterExpression: { mobileNo: { $type: "string", $gt: "" } } }
);

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;

