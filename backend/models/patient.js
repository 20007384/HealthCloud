const mongoose=require("mongoose");


const PatientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: String,
  condition: String,
  status: { 
    type: String, 
    default: 'Active',
    enum: ['Active', 'Discharged', 'Critical']
  },
  priority: { 
    type: String, 
    default: 'Medium',
    enum: ['High', 'Medium', 'Low']
  },
  doctor: String,
  admissionDate: String,
  notes: String,
  patientId: String,
  lastVisit: String,
  
  // NEW: Doctor Features
  prescriptions: [{
    id: Number,
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String,
    prescribedDate: String,
    status: { type: String, default: 'Active' },
    prescribedBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  medicalHistory: [{
    id: Number,
    condition: String,
    diagnosis: String,
    treatment: String,
    notes: String,
    dateRecorded: String,
    severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    recordedBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  vitals: [{
    id: Number,
    bloodPressureSystolic: Number,
    bloodPressureDiastolic: Number,
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    painLevel: String,
    notes: String,
    recordedDate: String,
    recordedTime: String,
    recordedBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  nursingNotes: [{
    id: Number,
    category: { 
      type: String, 
      enum: ['General Care', 'Medication', 'Assessment', 'Education', 'Discharge', 'Emergency'],
      default: 'General Care'
    },
    observation: String,
    intervention: String,
    response: String,
    plan: String,
    priority: { 
      type: String, 
      enum: ['Normal', 'Medium', 'High'],
      default: 'Normal'
    },
    noteDate: String,
    noteTime: String,
    nurseName: String,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


const Patient = mongoose.model('Patient', PatientSchema);
module.exports={Patient};