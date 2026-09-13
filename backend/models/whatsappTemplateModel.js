import mongoose from "mongoose";

const WhatsappTemplateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },
    templateName: { type: String, required: true },
    templateText: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  },
  { timestamps: true }
);

const WhatsappTemplateModel = mongoose.model("whatsapp_templates", WhatsappTemplateSchema);
export default WhatsappTemplateModel;