import mongoose from "mongoose";

const BranchSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    branchName: {
      type: String,
      required: true,
    },

    branchCode:{
        type:String,
        required: true,
    },

    address: {
      type: String,
    },

  },
  { timestamps: true }
);

const BranchModel = mongoose.model("branches", BranchSchema);

export default BranchModel;
