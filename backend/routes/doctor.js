const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Patient = require('../models/Patient');
const User    = require('../models/User');

// GET /api/doctor/patients
// Returns only patients assigned to this doctor
// In dev: if no assignments exist, returns all patients (with a flag)
router.get('/patients', auth, roleCheck('doctor'), async (req, res) => {
  try {
    const doctorId = req.user.userId;

    // find patients assigned to this doctor
    let patientProfiles = await Patient.find({ assignedDoctorId: doctorId })
      .select('name healthState reports intakeSessions timeline');

    const isUnassigned = patientProfiles.length === 0;

    // dev fallback — show all patients but flag it
    if (isUnassigned) {
      patientProfiles = await Patient.find({})
        .select('name healthState reports intakeSessions timeline');
    }

    const list = patientProfiles.map(p => {
      const submittedSessions = p.intakeSessions.filter(s => s.status === 'submitted' || s.status === 'reviewed');
      const lastSession = submittedSessions.at(-1);
      return {
        _id:            p._id,
        name:           p.name,
        riskScore:      p.healthState?.riskScore ?? null,
        conditions:     p.healthState?.conditions || [],
        medications:    p.healthState?.medications || [],
        reportCount:    p.reports.length,
        pendingBriefs:  p.intakeSessions.filter(s => s.status === 'submitted').length,
        lastCheckIn:    lastSession?.createdAt || null,
        lastComplaint:  lastSession?.doctorBrief?.chiefComplaint || null,
        lastUrgency:    lastSession?.doctorBrief?.urgencyLevel || null,
      };
    });

    res.json({ patients: list, isUnassigned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/doctor/patient/:patientId/briefs
router.get('/patient/:patientId/briefs', auth, roleCheck('doctor'), async (req, res) => {
  try {
    const profile = await Patient.findById(req.params.patientId)
      .select('intakeSessions name healthState');
    if (!profile) return res.status(404).json({ message: 'Patient not found' });

    const briefs = profile.intakeSessions
      .filter(s => s.status === 'submitted' || s.status === 'reviewed')
      .reverse()
      .map(s => ({
        _id:        s._id,
        createdAt:  s.createdAt,
        status:     s.status,
        doctorBrief: s.doctorBrief || null
      }));

    res.json({
      patientName: profile.name,
      healthState: profile.healthState,
      briefs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/doctor/assign
// Assign a patient to this doctor
router.post('/assign', auth, roleCheck('doctor'), async (req, res) => {
  try {
    const { patientProfileId } = req.body;
    await Patient.findByIdAndUpdate(patientProfileId, {
      assignedDoctorId: req.user.userId
    });
    res.json({ message: 'Patient assigned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;