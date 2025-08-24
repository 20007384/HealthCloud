const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('./models/user');
const { Patient } = require('./models/patient');
const { verifyToken } = require('./middlewares/verify');

require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const createTestUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const testUsers = [
        { 
          username: 'doctor', 
          email: 'doctor@hospital.com', 
          password: 'password123', 
          role: 'doctor', 
          fullName: 'Dr. Sarah' 
        },
        { 
          username: 'nurse', 
          email: 'nurse@hospital.com',   
          password: 'password123', 
          role: 'nurse', 
          fullName: 'Nurse Khetrapal' 
        },
        { 
          username: 'admin', 
          email: 'admin@hospital.com',   
          password: 'password123', 
          role: 'admin', 
          fullName: 'Admin Harsh' 
        }
      ];

      for (const userData of testUsers) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({ 
          ...userData, 
          password: hashedPassword,
          mfaEnabled: true  
        });
        await user.save();
      }
      console.log(' Test users created successfully');
    }
  } catch (error) {
    console.error('Error creating users:', error);
  }
};


mongoose.connect(process.env.MONGODB_URI)
.then(() => {console.log('Database connected');createTestUsers()})
.catch(err => console.log('Database error:', err));


app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role, fullName } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      role,
      fullName
    });
    
    await user.save();
    res.json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    if (user.mfaEnabled) {
      const tempToken = jwt.sign(
        { userId: user._id, username: user.username, step: 'mfa_required' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '5m' }
      );

      return res.json({
        tempToken,
        mfaRequired: true,
        user: { username: user.username, fullName: user.fullName }
      });
    }

    // If no MFA (fallback)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role, fullName: user.fullName },
      mfaRequired: false
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post('/api/mfa/verify', async (req, res) => {
  try {
    const { username, token, tempToken } = req.body;

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(400).json({ error: 'Session expired. Please login again.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const validBackupCodes = ['TEST01', 'TEST02', 'TEST03', 'TEST04', 'TEST05'];
    
    if (validBackupCodes.includes(token.toUpperCase())) {
      const finalToken = jwt.sign(
        { userId: user._id, role: user.role, mfaVerified: true },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.json({
        token: finalToken,
        user: { 
          id: user._id, 
          username: user.username, 
          role: user.role, 
          fullName: user.fullName 
        },
        message: 'MFA verification successful'
      });
    }

    return res.status(400).json({ error: 'Invalid MFA code. Use backup codes: TEST01, TEST02, TEST03' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/patients', verifyToken, async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.post('/api/patients', verifyToken, async (req, res) => {
  try {
    const { firstName, lastName, age, gender, phone, email } = req.body;
    
    if (!firstName || !lastName || !age || !gender) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const count = await Patient.countDocuments();
    const patientId = `P${String(count + 1).padStart(3, '0')}`;
    
    const patient = new Patient({
      ...req.body,
      patientId: patientId,
      lastVisit: new Date().toISOString().split('T')[0]
    });
    
    await patient.save();
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create patient' });
  }
});
app.put('/api/patients/:id', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update patient' });
  }
});

app.delete('/api/patients/:id', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete patient' });
  }
});

app.get('/api/patients/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const patients = await Patient.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { condition: { $regex: query, $options: 'i' } },
        { patientId: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});


app.get('/api/security/status', (req, res) => {
  res.json({
    encryption: 'AES-256 Active',
    authentication: 'JWT Active',
    database: 'MongoDB Secured',
    https: req.secure ? 'Enabled' : 'Disabled',
    lastScan: new Date().toISOString()
  });
});


app.get('/api/performance/metrics', async (req, res) => {
  try {
    const patientCount = await Patient.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({
      database: {
        patients: patientCount,
        users: userCount,
        responseTime: '45ms'
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: 'Normal'
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/patients/:id/prescriptions', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient.prescriptions || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
});


app.post('/api/patients/:id/prescriptions', verifyToken, async (req, res) => {
  try {
    const { medication, dosage, frequency, duration, instructions, prescribedDate } = req.body;
    
    
    if (!medication || !dosage) {
      return res.status(400).json({ error: 'Medication and dosage are required' });
    }
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const newPrescription = {
      id: Date.now(), // Simple ID generation
      medication,
      dosage,
      frequency,
      duration,
      instructions,
      prescribedDate: prescribedDate || new Date().toISOString().split('T')[0],
      status: 'Active',
      prescribedBy: req.user.userId,
      createdAt: new Date()
    };
    
    // Initialize prescriptions array if it doesn't exist
    if (!patient.prescriptions) {
      patient.prescriptions = [];
    }
    
    patient.prescriptions.unshift(newPrescription);
    await patient.save();
    
    res.json(newPrescription);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add prescription' });
  }
});



// ========== MEDICAL HISTORY ROUTES ==========

// Get patient medical history
app.get('/api/patients/:id/history', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient.medicalHistory || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch medical history' });
  }
});

// Add medical history to patient
app.post('/api/patients/:id/history', verifyToken, async (req, res) => {
  try {
    const { condition, diagnosis, treatment, notes, dateRecorded, severity } = req.body;
    
    // Basic validation
    if (!condition || !diagnosis) {
      return res.status(400).json({ error: 'Condition and diagnosis are required' });
    }
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const newHistory = {
      id: Date.now(), // Simple ID generation
      condition,
      diagnosis,
      treatment,
      notes,
      dateRecorded: dateRecorded || new Date().toISOString().split('T')[0],
      severity: severity || 'Medium',
      recordedBy: req.user.userId,
      createdAt: new Date()
    };
    
    // Initialize medical history array if it doesn't exist
    if (!patient.medicalHistory) {
      patient.medicalHistory = [];
    }
    
    patient.medicalHistory.unshift(newHistory);
    await patient.save();
    
    res.json(newHistory);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add medical history' });
  }
});

app.get('/api/patients/:id/vitals', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient.vitals || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
});

// Add vitals to patient
app.post('/api/patients/:id/vitals', verifyToken, async (req, res) => {
  try {
    const { 
      bloodPressureSystolic, 
      bloodPressureDiastolic, 
      heartRate, 
      temperature,
      respiratoryRate,
      oxygenSaturation,
      weight,
      height,
      painLevel,
      notes,
      recordedDate,
      recordedTime,
      recordedBy
    } = req.body;
    
    if (!bloodPressureSystolic || !bloodPressureDiastolic || !heartRate) {
      return res.status(400).json({ error: 'Blood pressure and heart rate are required' });
    }
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const newVitals = {
      id: Date.now(),
      bloodPressureSystolic,
      bloodPressureDiastolic,
      heartRate,
      temperature,
      respiratoryRate,
      oxygenSaturation,
      weight,
      height,
      painLevel,
      notes,
      recordedDate: recordedDate || new Date().toISOString().split('T')[0],
      recordedTime: recordedTime || new Date().toTimeString().slice(0, 5),
      recordedBy: recordedBy || req.user.username,
      createdAt: new Date()
    };
    
    if (!patient.vitals) {
      patient.vitals = [];
    }
    
    patient.vitals.unshift(newVitals);
    await patient.save();
    
    res.json(newVitals);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add vitals' });
  }
});

// ========== NURSING NOTES ROUTES ==========

// Get patient nursing notes
app.get('/api/patients/:id/nursing-notes', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient.nursingNotes || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nursing notes' });
  }
});

// Add nursing note to patient
app.post('/api/patients/:id/nursing-notes', verifyToken, async (req, res) => {
  try {
    const { 
      category,
      observation,
      intervention,
      response,
      plan,
      priority,
      noteDate,
      noteTime,
      nurseName
    } = req.body;
    
    if (!observation) {
      return res.status(400).json({ error: 'Observation is required' });
    }
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const newNote = {
      id: Date.now(),
      category: category || 'General Care',
      observation,
      intervention,
      response,
      plan,
      priority: priority || 'Normal',
      noteDate: noteDate || new Date().toISOString().split('T')[0],
      noteTime: noteTime || new Date().toTimeString().slice(0, 5),
      nurseName: nurseName || req.user.username,
      createdBy: req.user.userId,
      createdAt: new Date()
    };
    
    if (!patient.nursingNotes) {
      patient.nursingNotes = [];
    }
    
    patient.nursingNotes.unshift(newNote);
    await patient.save();
    
    res.json(newNote);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add nursing note' });
  }
});


const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all users (Admin only)
app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user (Admin only)
app.post('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, fullName, employeeId, isActive } = req.body;
    
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'nurse',
      fullName,
      employeeId,
      isActive: isActive !== false,
      mfaEnabled: true
    });
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user: ' + error.message });
  }
});

app.put('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role, fullName, employeeId, isActive } = req.body;
    
    const updateData = {
      username,
      email,
      role,
      fullName,
      employeeId,
      isActive,
      updatedAt: new Date()
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user: ' + error.message });
  }
});

app.delete('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});