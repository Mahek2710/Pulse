const dotenv = require('dotenv');
const fetch = require('node-fetch');
dotenv.config();

// ── API CALL ──────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 600,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await response.json();

  if (!data || !data.choices || !data.choices[0]?.message?.content) {
    console.error('Groq API error:', data);
    throw new Error('AI response invalid');
  }

  return data.choices[0].message.content;
}

// ── SAFE JSON PARSER ──────────────────────
function safeParseJSON(text) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start !== -1 && end !== -1) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error('No JSON found');
  } catch {
    throw new Error('AI returned invalid JSON. Raw: ' + text.slice(0, 200));
  }
}

// ── REPORT ANALYSIS ───────────────────────
async function analyzeReport(extractedText, patientProfile) {
  const trimmedText = extractedText.slice(0, 1200);

  const system = `Return ONLY valid JSON:

{
  "reportType": "string",
  "extractedValues": [],
  "abnormalCount": number,
  "overallSummary": "short summary"
}`;

  const user = `Age: ${patientProfile?.age || 'unknown'}
Conditions: ${patientProfile?.conditions?.join(', ') || 'none'}

Report:
${trimmedText}`;

  const raw = await callClaude(system, user);
  return safeParseJSON(raw);
}

// ── REPORT Q&A ────────────────────────────
async function answerReportQuestion(question, report) {
  const system = `You are Pulse. Answer ONLY questions related to the report.

If unrelated, reply:
"I’m Pulse, and I can only help with questions about your health report."

Keep under 120 words.`;

  const user = `Summary: ${report.overallSummary}
Values: ${JSON.stringify(report.extractedValues)}

Question: ${question}`;

  return await callClaude(system, user);
}

// ── ✅ FIXED INTAKE FLOW (NO AI QUESTIONS) ───────────────
function generateNextIntakeQuestion(transcript) {
  const questions = [
    // Patient details
    "What is your name?",
    "What is your age?",
    "What is your gender?",
    "What is your blood group?",

    // Medical intake (clean flow)
    "Describe briefly what brings you in today.",
    "How long have you been experiencing this?",
    "How much is it affecting you? (mild / moderate / severe)",
    "Have you noticed any pattern, trigger, or change?",
    "Do you have any existing medical conditions?"
  ];

  const patientAnswers = transcript.filter(m => m.role === 'patient').length;

  if (patientAnswers >= questions.length) {
    return "INTAKE_COMPLETE";
  }

  return questions[patientAnswers];
}

// ── DOCTOR BRIEF (SMARTER) ───────────────
async function generateDoctorBrief(transcript, patientProfile) {
  const system = `You are generating a structured clinical summary.

Return ONLY valid JSON:

{
  "chiefComplaint": "short phrase",
  "hpi": "brief history of present illness",
  "associatedFactors": "any relevant symptoms or factors",
  "pastHistory": "previous conditions or history",
  "clinicalImpression": "overall clinical impression",
  "urgencyLevel": "low|moderate|high"
}

Rules:
- Keep each field 1–2 lines
- Do NOT leave fields empty
- Infer if needed`;

  const conversation = transcript
    .map(m => `${m.role === 'patient' ? 'Patient' : 'AI'}: ${m.content}`)
    .join('\n');

  const user = `Patient age: ${patientProfile?.age || 'unknown'}
Conditions: ${patientProfile?.conditions?.join(', ') || 'none'}

Conversation:
${conversation}

Generate structured summary.`;

  const raw = await callClaude(system, user);
  return safeParseJSON(raw);
}

module.exports = {
  analyzeReport,
  answerReportQuestion,
  generateNextIntakeQuestion,
  generateDoctorBrief
};