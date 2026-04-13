const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  // linked to User
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // demographics
  name: { type: String, required: true },
  dob: Date,
  gender: String,
  phone: String,
  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Module 1 — intake sessions
  intakeSessions: [{
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['in_progress', 'submitted', 'reviewed'], default: 'in_progress' },
    transcript: [{ role: { type: String, enum: ['ai', 'patient'] }, content: String, timestamp: { type: Date, default: Date.now } }],
    doctorBrief: {
      urgencyLevel: { type: String, enum: ['low', 'moderate', 'high', 'emergency'] },
      chiefComplaint: String,
      keySymptoms: [String],
      redFlags: [String],
      currentMedications: [String],
      aiSummary: String,
      generatedAt: Date
    }
  }],

  // Module 2 — reports
  reports: [{
    uploadedAt: { type: Date, default: Date.now },
    fileName: String,
    fileUrl: String,
    reportType: String,
    extractedValues: [{
      name: String, value: Number, unit: String,
      normalRange: String,
      status: { type: String, enum: ['normal', 'low', 'high', 'critical'] },
      aiExplanation: String
    }],
    abnormalCount: { type: Number, default: 0 },
    overallSummary: String,
    qaThread: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, timestamp: { type: Date, default: Date.now } }]
  }],

  // Module 3 — health twin
  healthState: {
    lastUpdated: Date,
    vitals: { glucose: Number, bloodPressureSystolic: Number, bloodPressureDiastolic: Number, hba1c: Number, bmi: Number },
    lifestyle: { sleepHours: Number, exercisePerWeek: Number, smokingStatus: String, alcoholUnitsPerWeek: Number },
    conditions: [String],
    medications: [{ name: String, dosage: String, adherence: String }],
    riskScore: Number,
    riskHistory: [{ date: Date, score: Number, note: String }]
  },

  scenarios: [{
    createdAt: { type: Date, default: Date.now },
    label: String,
    interventions: [{ parameter: String, change: String }],
    projectedRisk: Number,
    causalExplanation: String,
    comparedToBaseline: Number
  }],

  // shared timeline
  timeline: [{
    eventType: String,
    eventAt: { type: Date, default: Date.now },
    summary: String,
    refId: mongoose.Schema.Types.ObjectId
  }]

}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);