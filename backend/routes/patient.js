const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Patient = require('../models/Patient');

// GET /api/patient/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/patient/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const recentReports = profile.reports
      .slice(-3).reverse()
      .map(r => ({
        _id: r._id,
        reportType: r.reportType,
        fileName: r.fileName,
        uploadedAt: r.uploadedAt,
        abnormalCount: r.abnormalCount
      }));

    const recentSessions = profile.intakeSessions
      .filter(s => s.status === 'submitted')
      .slice(-2).reverse()
      .map(s => ({
        _id: s._id,
        createdAt: s.createdAt,
        urgencyLevel: s.doctorBrief?.urgencyLevel,
        chiefComplaint: s.doctorBrief?.chiefComplaint
      }));

    res.json({
      name: profile.name,
      riskScore: profile.healthState?.riskScore ?? null,
      riskHistory: profile.healthState?.riskHistory?.slice(-6) || [],
      vitals: profile.healthState?.vitals || {},
      conditions: profile.healthState?.conditions || [],
      reportCount: profile.reports.length,
      scenarioCount: profile.scenarios.length,
      recentReports,
      recentSessions,
      timeline: profile.timeline.slice(-8).reverse()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;