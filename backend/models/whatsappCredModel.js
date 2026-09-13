import mongoose from "mongoose";

const WhatsappCredSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    instanceId: {
      type: String,
    },
    token: {
      type: String,
    },
  },
  { timestamps: true },
);

const WhatsappCredModel = mongoose.model("whatsappcreds", WhatsappCredSchema);

export default WhatsappCredModel;
