import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    permissionName: {
      type: String,
    },

    subPermission: [
      {
        subName: {
          type: String,
        },

        code: {
          type: String,
        },
      },
    ],

    index:{
        type:Number,
    },
  },
  { timestamps: true }
);

const PermissionModel = mongoose.model('permissions',PermissionSchema);

export default PermissionModel;
