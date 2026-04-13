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
    res.json({
      riskScore: profile.healthState?.riskScore ?? null,
      vitals: profile.healthState?.vitals ?? {},
      reportCount: profile.reports.length,
      recentTimeline: profile.timeline.slice(-5).reverse(),
      scenarios: profile.scenarios
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;