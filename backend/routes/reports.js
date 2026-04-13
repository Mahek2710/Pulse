const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Patient = require('../models/Patient');
const { extractTextFromPDF } = require('../services/pdfParser');
const { analyzeReport, answerReportQuestion } = require('../services/aiService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

// POST /api/reports/upload
router.post('/upload', auth, upload.single('report'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const profile = await Patient.findById(req.user.patientProfileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // 1. Extract text from PDF
    const extractedText = await extractTextFromPDF(req.file.buffer);
    if (!extractedText || extractedText.trim().length < 50)
      return res.status(400).json({ message: 'Could not extract text from this PDF. Make sure it is a text-based PDF, not a scanned image.' });

    // 2. Send to AI for analysis
    const analysis = await analyzeReport(extractedText, {
      conditions: profile.healthState?.conditions,
      age: profile.dob ? Math.floor((Date.now() - new Date(profile.dob)) / 31557600000) : null
    });

    // 3. Build report object
    const newReport = {
      uploadedAt: new Date(),
      fileName: req.file.originalname,
      fileUrl: '',
      reportType: analysis.reportType,
      extractedValues: analysis.extractedValues,
      abnormalCount: analysis.abnormalCount,
      overallSummary: analysis.overallSummary,
      qaThread: []
    };

    // 4. Save to profile
    profile.reports.push(newReport);

    // 5. Auto-update health state vitals from report
    if (!profile.healthState) profile.healthState = { vitals: {}, lifestyle: {}, conditions: [], medications: [] };
    analysis.extractedValues.forEach(v => {
      const name = v.name.toLowerCase();
      if (name.includes('glucose') || name.includes('blood sugar')) profile.healthState.vitals.glucose = v.value;
      if (name.includes('hba1c')) profile.healthState.vitals.hba1c = v.value;
      if (name.includes('systolic')) profile.healthState.vitals.bloodPressureSystolic = v.value;
      if (name.includes('diastolic')) profile.healthState.vitals.bloodPressureDiastolic = v.value;
    });
    profile.healthState.lastUpdated = new Date();

    // 6. Add timeline event
    const savedReport = profile.reports[profile.reports.length - 1];
    profile.timeline.push({
      eventType: 'report_analyzed',
      eventAt: new Date(),
      summary: `${analysis.reportType} analyzed — ${analysis.abnormalCount} abnormal value${analysis.abnormalCount !== 1 ? 's' : ''} found`,
      refId: savedReport._id
    });

    await profile.save();

    res.status(201).json({
      message: 'Report analyzed successfully',
      reportId: savedReport._id,
      report: savedReport
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports
router.get('/', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId).select('reports');
    const list = profile.reports.map(r => ({
      _id: r._id,
      fileName: r.fileName,
      reportType: r.reportType,
      uploadedAt: r.uploadedAt,
      abnormalCount: r.abnormalCount,
      overallSummary: r.overallSummary
    }));
    res.json(list.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/:reportId
router.get('/:reportId', auth, async (req, res) => {
  try {
    const profile = await Patient.findById(req.user.patientProfileId).select('reports');
    const report = profile.reports.id(req.params.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reports/:reportId/ask
router.post('/:reportId/ask', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: 'Question is required' });

    const profile = await Patient.findById(req.user.patientProfileId);
    const report = profile.reports.id(req.params.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Add user question to thread
    report.qaThread.push({ role: 'user', content: question, timestamp: new Date() });

    // Get AI answer
    const answer = await answerReportQuestion(
      question,
      report,
      { conditions: profile.healthState?.conditions },
      report.qaThread.slice(0, -1) // history excluding the question just added
    );

    // Add AI answer to thread
    report.qaThread.push({ role: 'assistant', content: answer, timestamp: new Date() });

    // Timeline event
    profile.timeline.push({
      eventType: 'qa_asked',
      eventAt: new Date(),
      summary: `Asked about ${report.reportType}: "${question.slice(0, 60)}${question.length > 60 ? '...' : ''}"`,
      refId: report._id
    });

    await profile.save();
    res.json({ answer, qaThread: report.qaThread });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;