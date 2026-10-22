import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "projects",
      default: null,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    fileCategory: {
      type: String,
      enum: ["timeline", "avatar", "pdf", "branding", "document"],
      default: "timeline",
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

const FileModel = mongoose.model("files", FileSchema);
export default FileModel;
