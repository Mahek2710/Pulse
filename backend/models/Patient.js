const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true },
  dob: Date,
  gender: String,
  phone: String,
  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  intakeSessions: [{
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['in_progress', 'submitted', 'reviewed'], default: 'in_progress' },

    // ✅ ADDED (safe)
    patientInfo: {
      name: String,
      age: Number,
      gender: String,
      bloodGroup: String
    },

    transcript: [{
      role: { type: String, enum: ['ai', 'patient'] },
      content: String,
      timestamp: { type: Date, default: Date.now }
    }],

    doctorBrief: {
      urgencyLevel: { type: String, enum: ['low', 'moderate', 'high', 'emergency'] },
      chiefComplaint: String,

      // ✅ ADDED (safe, doesn't break old)
      hpi: String,
      associatedFactors: String,
      pastHistory: String,
      clinicalImpression: String,

      // keep old (so nothing breaks)
      aiSummary: String,

      generatedAt: Date
    }
  }],

  reports: [{
    uploadedAt: { type: Date, default: Date.now },
    fileName: String,
    fileUrl: String,
    reportType: String,
    extractedValues: [{
      name: String,
      value: Number,
      unit: String,
      normalRange: String,
      status: { type: String, enum: ['normal', 'low', 'high', 'critical'] },
      aiExplanation: String
    }],
    abnormalCount: { type: Number, default: 0 },
    overallSummary: String,
    qaThread: [{
      role: { type: String, enum: ['user', 'assistant'] },
      content: String,
      timestamp: { type: Date, default: Date.now }
    }]
  }],

  healthState: {
    lastUpdated: Date,
    vitals: {
      glucose: Number,
      bloodPressureSystolic: Number,
      bloodPressureDiastolic: Number,
      hba1c: Number,
      bmi: Number
    },
    lifestyle: {
      sleepHours: Number,
      exercisePerWeek: Number,
      smokingStatus: String,
      alcoholUnitsPerWeek: Number
    },
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

  timeline: [{
    eventType: String,
    eventAt: { type: Date, default: Date.now },
    summary: String,
    refId: mongoose.Schema.Types.ObjectId
  }]

}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);