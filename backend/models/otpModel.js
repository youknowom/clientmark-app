import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const OTPSchema = new mongoose.Schema(
  {
    //email, mobileNo, or any thing
    userName: {
      type: String,
      required: true,
    },

    otp: {
      type: Number,
      required: true,
    },

    expiry: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const OTPModel = mongoose.model("otps", OTPSchema);

export default OTPModel;
