import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true },
  token: { type: String, required: true },
  expires_at: { type: Date, required: true },
}, { timestamps: true });

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

export { PasswordReset };
