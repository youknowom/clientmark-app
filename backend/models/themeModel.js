import mongoose from "mongoose";

const ThemeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tenants",
      required: true,
      index: true,
    },

    mainTheme: {
      primaryColor: { type: String, required: true },
      secondaryColor: { type: String, required: true },
      backgroundColor: { type: String, required: true },
      textColor: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const ThemeModel = mongoose.model("themes", ThemeSchema);

export default ThemeModel;
