
const mongoose=require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  fullName: { type: String, required: true },
  mfaEnabled: { type: Boolean, default: true }, // NEW: Enable MFA for all users
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

module.exports={User};