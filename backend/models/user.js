
const mongoose=require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // NEW
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['doctor', 'nurse', 'admin'] },
  fullName: { type: String, required: true },
  employeeId: { type: String, unique: true, sparse: true }, // NEW
  isActive: { type: Boolean, default: true }, // NEW
  mfaEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now } // NEW
});
const User = mongoose.model('User', UserSchema);

module.exports={User};