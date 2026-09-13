import mongoose from "mongoose";

const WhatsappChatSchema = new mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "tenants",
            required: true,
            index: true,
        },

        leadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "leads",
            required: true,
        },
        leadName: {
            type: String,
            default: "",
        },
        whatsappNo: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
    },
    { timestamps: true },
);

const WhatsappChatModel = mongoose.model("whatsapp_chats", WhatsappChatSchema);

export default WhatsappChatModel;
