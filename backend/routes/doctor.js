const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Patient = require('../models/Patient');
const User = require('../models/User');

// GET /api/doctor/patients
router.get('/patients', auth, roleCheck('doctor'), async (req, res) => {
  try {
    const patientUsers = await User.find({ role: 'patient' });
    const profiles = await Promise.all(
      patientUsers.map(u => Patient.findById(u.patientProfileId)
        .select('name healthState reports intakeSessions timeline'))
    );

    const list = profiles.filter(Boolean).map(p => ({
      _id: p._id,
      name: p.name,
      riskScore: p.healthState?.riskScore ?? null,
      conditions: p.healthState?.conditions || [],
      reportCount: p.reports.length,
      lastVisit: p.timeline.filter(t => t.eventType === 'intake_submitted').slice(-1)[0]?.eventAt || null,
      pendingBriefs: p.intakeSessions.filter(s => s.status === 'submitted').length
    }));

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/doctor/patient/:patientId
router.get('/patient/:patientId', auth, roleCheck('doctor'), async (req, res) => {
  try {
    const profile = await Patient.findById(req.params.patientId);
    if (!profile) return res.status(404).json({ message: 'Patient not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/doctor/patient/:patientId/briefs
router.get('/patient/:patientId/briefs', auth, roleCheck('doctor'), async (req, res) => {
  try {
    const profile = await Patient.findById(req.params.patientId).select('intakeSessions name');
    const briefs = profile.intakeSessions
      .filter(s => s.status === 'submitted' || s.status === 'reviewed')
      .reverse()
      .map(s => ({
        _id: s._id,
        createdAt: s.createdAt,
        status: s.status,
        doctorBrief: s.doctorBrief
      }));
    res.json({ patientName: profile.name, briefs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;