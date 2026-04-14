const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Patient = require('../models/Patient');
const { computeRiskScore, runScenario } = require('../services/aiService');

// GET /api/healthtwin/state
router.get('/state', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId)
      .select('healthState scenarios');
    res.json({
      healthState: profile.healthState || {},
      scenarios: profile.scenarios || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/healthtwin/state
router.put('/state', auth, async (req, res) => {
  try {
    const { vitals, lifestyle, conditions, medications } = req.body;
    const profile = await Patient.findById(req.user.patientProfileId);

    if (!profile.healthState) profile.healthState = {};
    if (vitals) profile.healthState.vitals = { ...profile.healthState.vitals, ...vitals };
    if (lifestyle) profile.healthState.lifestyle = { ...profile.healthState.lifestyle, ...lifestyle };
    if (conditions) profile.healthState.conditions = conditions;
    if (medications) profile.healthState.medications = medications;
    profile.healthState.lastUpdated = new Date();

    // Mark as modified (nested object)
    profile.markModified('healthState');
    await profile.save();

    res.json({ healthState: profile.healthState });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/healthtwin/refresh-risk
router.post('/refresh-risk', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId);
    if (!profile.healthState) return res.status(400).json({ message: 'No health state found. Update your profile first.' });

    const result = await computeRiskScore(profile.healthState);

    profile.healthState.riskScore = result.riskScore;
    if (!profile.healthState.riskHistory) profile.healthState.riskHistory = [];
    profile.healthState.riskHistory.push({
      date: new Date(),
      score: result.riskScore,
      note: result.note
    });

    profile.timeline.push({
      eventType: 'scenario_run',
      eventAt: new Date(),
      summary: `Risk score updated: ${result.riskScore}/100 — ${result.note}`
    });

    profile.markModified('healthState');
    await profile.save();

    res.json({ riskScore: result.riskScore, note: result.note, riskHistory: profile.healthState.riskHistory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/healthtwin/scenario
router.post('/scenario', auth, async (req, res) => {
  try {
    const { label, interventions } = req.body;
    if (!label || !interventions?.length)
      return res.status(400).json({ message: 'label and interventions required' });

    const profile = await Patient.findById(req.user.patientProfileId);
    if (!profile.healthState) return res.status(400).json({ message: 'No health state found. Update your profile first.' });

    const result = await runScenario(profile.healthState, interventions, label);

    const scenario = {
      createdAt: new Date(),
      label,
      interventions,
      projectedRisk: result.projectedRisk,
      causalExplanation: result.causalExplanation,
      comparedToBaseline: result.projectedRisk - (profile.healthState.riskScore || 0)
    };

    profile.scenarios.push(scenario);

    profile.timeline.push({
      eventType: 'scenario_run',
      eventAt: new Date(),
      summary: `Scenario "${label}" — projected risk ${result.projectedRisk}/100`
    });

    await profile.save();

    res.status(201).json({
      scenario: profile.scenarios[profile.scenarios.length - 1],
      allScenarios: profile.scenarios
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/healthtwin/scenarios
router.get('/scenarios', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId).select('scenarios healthState');
    res.json({
      scenarios: profile.scenarios || [],
      currentRisk: profile.healthState?.riskScore || null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/healthtwin/scenario/:scenarioId
router.delete('/scenario/:scenarioId', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId);
    profile.scenarios = profile.scenarios.filter(
      s => s._id.toString() !== req.params.scenarioId
    );
    await profile.save();
    res.json({ message: 'Scenario deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;