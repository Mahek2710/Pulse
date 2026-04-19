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
    "What is your name?",
    "What is your age?",
    "What is your gender?",
    "What is your blood group?",
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

// ── Module 3: Health Twin ──────────────────────────────────
async function computeRiskScore(healthState) {
  const system = `You are a clinical health risk assessment engine calibrated for Indian patients.
Use Indian/Asian reference ranges:
- Fasting glucose: normal 70-100 mg/dL, pre-diabetic 100-125, diabetic ≥126
- HbA1c: normal <5.7%, pre-diabetic 5.7-6.4%, diabetic ≥6.5%, well-controlled diabetic target <7%
- BP: normal <130/80 mmHg (JNC 8)
- BMI: Asian normal 18-22.9, overweight 23-27.4, obese ≥27.5 (not the Western 25/30 cutoffs)
- Indians have higher metabolic risk at lower BMI than Western populations

Scoring: 0=very healthy, 100=critical. Return ONLY valid JSON, no markdown:
{ "riskScore": number, "note": "one sentence naming the top 2-3 specific risk drivers with values" }

Scoring guide:
- Healthy young Indian adult, no conditions: 10-20
- One well-controlled condition: 20-35
- Pre-diabetes or borderline BP: 35-50
- Uncontrolled diabetes or hypertension: 50-70
- Multiple uncontrolled conditions or critical values: 70-90
- Emergency indicators: 90-100`;

  const user = `Patient health state:
Vitals: ${JSON.stringify(healthState.vitals || {})}
Conditions: ${(healthState.conditions || []).join(', ') || 'none'}
Medications: ${JSON.stringify(healthState.medications || [])}
Lifestyle: sleep ${healthState.lifestyle?.sleepHours || 'unknown'} hrs/night, exercise ${healthState.lifestyle?.exercisePerWeek || 'unknown'} days/week

Compute the risk score using Indian reference ranges.`;

  const raw = await callClaude(system, user);
  return parseJSON(raw);
}

async function runScenario(healthState, interventions, label) {
  const system = `You are a health scenario advisor for Indian patients. Given a patient's current health state and a proposed lifestyle or medication intervention, estimate the projected risk score and explain the causal chain in simple language.

Use Indian context — mention specific foods (dal, roti, chai, sabzi), Indian lifestyle patterns, and Indian reference ranges where relevant.

Return ONLY valid JSON, no markdown:
{
  "projectedRisk": number,
  "causalExplanation": "2-3 sentences in simple language explaining exactly why this intervention changes the risk, mentioning specific parameters like glucose, BP, or HbA1c"
}

Rules:
- projectedRisk must be a realistic change from current score (not more than 25 points change for single interventions)
- Negative interventions (stopping meds, poor diet) should increase risk realistically
- Be specific — don't just say "improves health", explain the mechanism`;

  const user = `Current health state:
Vitals: ${JSON.stringify(healthState.vitals || {})}
Conditions: ${(healthState.conditions || []).join(', ') || 'none'}
Medications: ${JSON.stringify(healthState.medications || [])}
Lifestyle: sleep ${healthState.lifestyle?.sleepHours || 'unknown'} hrs/night, exercise ${healthState.lifestyle?.exercisePerWeek || 'unknown'} days/week
Current risk score: ${healthState.riskScore || 'unknown'}

Scenario: "${label}"
Proposed interventions: ${JSON.stringify(interventions)}

What is the projected risk and causal explanation?`;

  const raw = await callClaude(system, user);
  return parseJSON(raw);
}

module.exports = {
  analyzeReport,
  answerReportQuestion,
  generateNextIntakeQuestion,
  generateDoctorBrief,
  computeRiskScore,
  runScenario
};