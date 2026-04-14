const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Patient = require('../models/Patient');
const { generateNextIntakeQuestion, generateDoctorBrief } = require('../services/aiService');

// ── START ─────────────────────────────
router.post('/start', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    profile.intakeSessions.push({
      createdAt: new Date(),
      status: 'in_progress',
      transcript: [],
      doctorBrief: null,
      patientInfo: {} // ✅ added
    });

    const session = profile.intakeSessions[profile.intakeSessions.length - 1];

    const firstQuestion = generateNextIntakeQuestion([]);

    session.transcript.push({
      role: 'ai',
      content: firstQuestion,
      timestamp: new Date()
    });

    await profile.save();

    res.status(201).json({
      sessionId: session._id,
      question: firstQuestion
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// ── RESPOND ───────────────────────────
router.post('/respond', auth, async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ message: 'sessionId and message required' });
    }

    const profile = await Patient.findById(req.user.patientProfileId);
    const session = profile.intakeSessions.id(sessionId);

    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'in_progress') {
      return res.status(400).json({ message: 'Session already completed' });
    }

    // save message
    session.transcript.push({
      role: 'patient',
      content: message,
      timestamp: new Date()
    });

    // ✅ structured storage
    const patientAnswers = session.transcript
      .filter(m => m.role === 'patient')
      .map(m => m.content);

    if (!session.patientInfo) session.patientInfo = {};

    if (patientAnswers.length === 1) session.patientInfo.name = message;
    if (patientAnswers.length === 2) session.patientInfo.age = Number(message);
    if (patientAnswers.length === 3) session.patientInfo.gender = message;
    if (patientAnswers.length === 4) session.patientInfo.bloodGroup = message;

    const nextStep = generateNextIntakeQuestion(session.transcript);

    // ── COMPLETE ───────────────────
    if (nextStep === "INTAKE_COMPLETE") {
      let brief;

      try {
        brief = await generateDoctorBrief(session.transcript, {
          ...session.patientInfo, // ✅ added
          conditions: profile.healthState?.conditions,
          medications: profile.healthState?.medications
        });

      } catch (err) {
        console.error('AI BRIEF ERROR:', err);

        brief = {
          chiefComplaint: session.transcript.find(m => m.role === 'patient')?.content || 'General concern',
          aiSummary: "Patient reported symptoms. Clinical evaluation recommended.",
          urgencyLevel: "low"
        };
      }

      session.doctorBrief = { ...brief, generatedAt: new Date() };
      session.status = 'submitted';

      profile.timeline.push({
        eventType: 'intake_submitted',
        eventAt: new Date(),
        summary: `Pre-consultation completed — urgency: ${brief.urgencyLevel}`,
        refId: session._id
      });

      await profile.save();

      return res.json({
        complete: true,
        sessionId,
        brief
      });
    }

    // continue
    session.transcript.push({
      role: 'ai',
      content: nextStep,
      timestamp: new Date()
    });

    await profile.save();

    res.json({
      complete: false,
      question: nextStep,
      sessionId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// ── GET SESSIONS ─────────────────────
router.get('/sessions', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId).select('intakeSessions');

    const sessions = profile.intakeSessions.map(s => ({
      _id: s._id,
      createdAt: s.createdAt,
      status: s.status,
      chiefComplaint: s.doctorBrief?.chiefComplaint || null,
      urgencyLevel: s.doctorBrief?.urgencyLevel || null
    })).reverse();

    res.json(sessions);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ── GET ONE SESSION ──────────────────
router.get('/session/:id', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId).select('intakeSessions');
    const session = profile.intakeSessions.id(req.params.id);

    if (!session) return res.status(404).json({ message: 'Session not found' });

    res.json(session);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;