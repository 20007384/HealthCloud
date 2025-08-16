const mongoose=require("mongoose");


const PatientSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  age: Number,
  gender: String,
  phone: String,
  email: String,
  address: String,
  condition: String,
  status: String,
  priority: String,
  doctor: String,
  admissionDate: String,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

const Patient = mongoose.model('Patient', PatientSchema);
module.exports={Patient};