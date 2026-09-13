import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    roleName: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: Number,
      required: true,
      min: 1,
    },

    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

//role name and priority uniqueness PER TENANT
RoleSchema.index({ roleName: 1, tenantId: 1 }, { unique: true });
RoleSchema.index({ priority: 1, tenantId: 1 }, { unique: true });

const RoleModel = mongoose.model("roles", RoleSchema);

export default RoleModel;
