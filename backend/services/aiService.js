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
      max_tokens: 800,
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

// ── MODULE 2: REPORT ANALYSIS ─────────────
async function analyzeReport(extractedText, patientProfile) {
  const trimmedText = extractedText.slice(0, 1200); // prevent token overflow

  const system = `You are Pulse — an AI medical report analyzer.

Return ONLY valid JSON. No explanation.

Rules:
- Max 5 test values
- Always complete JSON
- Keep output short

Format:
{
  "reportType": "string",
  "extractedValues": [
    {
      "name": "test",
      "value": number,
      "unit": "unit",
      "normalRange": "range",
      "status": "normal|low|high|critical",
      "aiExplanation": "short explanation"
    }
  ],
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

// ── MODULE 2: Q&A (STRICT CONTROL) ────────
async function answerReportQuestion(question, report, patientProfile, qaHistory) {
  const system = `You are Pulse — an AI assistant for explaining a user's medical lab report.

STRICT RULES:
- Only answer questions related to the lab report
- Allowed topics:
  - meaning of values
  - high/low reasons
  - lifestyle changes
  - health risks (general only)

- If question is unrelated, reply EXACTLY:
"I can only help with questions related to your lab report."

- Do NOT answer general questions, identity questions, or random chat
- Do NOT diagnose or prescribe treatment
- Always include: "Please consult your doctor" if giving health suggestions
- Keep answers under 120 words
`;

  const history = qaHistory
    .map(m => `${m.role === 'user' ? 'User' : 'Pulse'}: ${m.content}`)
    .join('\n');

  const user = `Report Summary:
${report.overallSummary}

Report Values:
${JSON.stringify(report.extractedValues)}

Conversation History:
${history || 'None'}

User Question:
${question}`;

  return await callClaude(system, user);
}

module.exports = { analyzeReport, answerReportQuestion };