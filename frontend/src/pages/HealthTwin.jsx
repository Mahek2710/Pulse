import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import useThemeStore from '../store/themeStore';
import { getChartColors } from '../utils/chartTheme';

// ─────────────────────────────────────────────
// INDIAN CONTEXT PRESETS
// ─────────────────────────────────────────────
const INDIAN_PRESETS = [
  {
    category: 'Diet',
    emoji: '🥗',
    items: [
      { label: 'Switch to low-GI diet', sub: 'Brown rice, multigrain roti, more sabzi', interventions: [{ parameter: 'diet', change: 'switch from high-GI foods like white rice and maida to low-GI foods like brown rice, jowar roti, and more vegetables' }] },
      { label: 'Reduce refined carbs', sub: 'Less maida, less sugar in chai', interventions: [{ parameter: 'diet', change: 'reduce maida, white bread, biscuits, and sugar in chai or coffee' }] },
      { label: 'Add more protein daily', sub: 'Dal, paneer, sprouts, eggs', interventions: [{ parameter: 'diet', change: 'increase protein intake through dal, paneer, eggs, or sprouts every day' }] },
    ]
  },
  {
    category: 'Activity',
    emoji: '🚶',
    items: [
      { label: 'Walk 30 min daily', sub: 'Morning or evening walk', interventions: [{ parameter: 'exercise', change: 'add 30 minutes of brisk walking every day' }] },
      { label: 'Yoga 3x per week', sub: 'Pranayama + asanas for stress', interventions: [{ parameter: 'exercise', change: 'practice yoga including pranayama and asanas 3 times per week' }] },
      { label: 'More daily movement', sub: 'Stairs, walk to market, NEAT', interventions: [{ parameter: 'activity', change: 'increase daily movement by taking stairs and doing short walking errands instead of vehicles' }] },
    ]
  },
  {
    category: 'Sleep & Stress',
    emoji: '😴',
    items: [
      { label: 'Sleep before midnight', sub: 'Consistent 7–8 hr schedule', interventions: [{ parameter: 'sleep', change: 'sleep before 11pm and wake at consistent time to get 7-8 hours per night' }] },
      { label: 'Reduce work stress', sub: 'Breaks, boundaries, breathing', interventions: [{ parameter: 'stress', change: 'actively reduce chronic work stress through scheduled breaks, deep breathing exercises, and work-life boundaries' }] },
    ]
  },
  {
    category: 'Medication',
    emoji: '💊',
    items: [
      { label: 'Take medicines regularly', sub: 'No skipping doses', interventions: [{ parameter: 'medication_adherence', change: 'take all prescribed medications every day without skipping' }] },
      { label: 'Stop medication (risk preview)', sub: 'See what happens if you stop', interventions: [{ parameter: 'medication_adherence', change: 'completely stop all prescribed medication' }] },
    ]
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const riskMeta = (score) => {
  if (!score && score !== 0) return { textClass: 'p-muted-text', badgeClass: 'p-badge-neutral', color: 'var(--text2)', label: '—', bg: 'var(--bg-card2)' };
  if (score <= 30) return { textClass: 'p-good-text',   badgeClass: 'p-badge-good', color: 'var(--good)',   label: 'Low risk',      bg: 'var(--good-dim)' };
  if (score <= 55) return { textClass: 'p-warn-text',   badgeClass: 'p-badge-warn', color: 'var(--warn)',   label: 'Moderate risk', bg: 'var(--warn-dim)' };
  if (score <= 75) return { textClass: 'p-danger-text', badgeClass: 'p-badge-bad',  color: 'var(--danger)', label: 'High risk',     bg: 'var(--danger-dim)' };
  return               { textClass: 'p-danger-text', badgeClass: 'p-badge-bad',  color: 'var(--danger)', label: 'Critical',      bg: 'var(--danger-dim)' };
};

// Indian reference ranges
const RANGES = {
  glucose:               { low: 70,  high: 100, unit: 'mg/dL',  label: 'Fasting Glucose',  note: 'IDF Asian: 70–100' },
  hba1c:                 { low: 4.0, high: 5.6, unit: '%',       label: 'HbA1c',            note: '<5.7% normal, <7% if diabetic' },
  bloodPressureSystolic: { low: 90,  high: 130, unit: 'mmHg',   label: 'Systolic BP',      note: 'Target <130 mmHg' },
  bmi:                   { low: 18,  high: 22.9,unit: 'kg/m²',  label: 'BMI',              note: 'Asian normal: 18–23' },
};

// ─────────────────────────────────────────────
// RISK RING
// ─────────────────────────────────────────────
function RiskRing({ score, size = 130 }) {
  const meta = riskMeta(score);
  const r    = size * 0.4;
  const circ = 2 * Math.PI * r;
  const pct  = score ? Math.min(score, 100) / 100 : 0;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={size * 0.072} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={meta.color}
          strokeWidth={size * 0.072}
          strokeDasharray={`${circ * pct} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color: meta.color, letterSpacing: '-2px', lineHeight: 1 }}>
          {score ?? '?'}
        </span>
        <span style={{ fontSize: size * 0.09, color: 'var(--text2)', marginTop: 2 }}>/100</span>
        {score !== null && score !== undefined && (
          <span style={{ fontSize: size * 0.09, color: meta.color, marginTop: 3, fontWeight: 600 }}>{meta.label}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VITAL ROW with range indicator
// ─────────────────────────────────────────────
function VitalRow({ label, value, unit, low, high, note }) {
  if (!value) return null;
  const status = value < low ? 'low' : value > high ? 'high' : 'normal';
  const color  = status === 'normal' ? 'var(--good)' : status === 'high' ? 'var(--danger)' : 'var(--warn)';
  const dimColor = status === 'normal' ? 'var(--good-dim)' : status === 'high' ? 'var(--danger-dim)' : 'var(--warn-dim)';
  const rangeMin = low * 0.7;
  const rangeMax = high * 1.5;
  const markerPct = Math.min(Math.max(((value - rangeMin) / (rangeMax - rangeMin)) * 100, 2), 98);
  const zonePctStart = ((low - rangeMin) / (rangeMax - rangeMin)) * 100;
  const zonePctWidth = ((high - low) / (rangeMax - rangeMin)) * 100;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{unit}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: dimColor, padding: '1px 7px', borderRadius: 20 }}>
            {status === 'normal' ? '✓ Normal' : status === 'high' ? '↑ High' : '↓ Low'}
          </span>
        </div>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
        {/* green zone */}
        <div style={{ position: 'absolute', left: `${zonePctStart}%`, width: `${zonePctWidth}%`, height: '100%', background: 'var(--good-dim)', borderRadius: 2 }} />
        {/* marker */}
        <div style={{ position: 'absolute', left: `calc(${markerPct}% - 3px)`, top: -2, width: 7, height: 9, background: color, borderRadius: 3, transition: 'left .6s ease', boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{note}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// SCENARIO CARD
// ─────────────────────────────────────────────
function ScenarioCard({ scenario, baseline, isActive, onClick, onDelete }) {
  const meta  = riskMeta(scenario.projectedRisk);
  const delta = Math.round(scenario.projectedRisk - (baseline || 0));

  return (
    <div onClick={onClick} style={{
      border: `1px solid ${isActive ? meta.color : 'var(--border)'}`,
      borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
      background: isActive ? meta.bg : 'var(--bg-card)',
      transition: 'all .2s', boxShadow: isActive ? `0 0 0 1px ${meta.color}25` : 'var(--shadow)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, letterSpacing: '-0.2px' }}>
          {scenario.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: delta <= 0 ? 'var(--good)' : 'var(--danger)' }}>
            {delta > 0 ? '+' : ''}{delta} pts
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: meta.color, letterSpacing: '-1px' }}>
            {scenario.projectedRisk}
          </span>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16, lineHeight: 1, padding: '0 2px', fontFamily: 'inherit' }}>
            ×
          </button>
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${scenario.projectedRisk}%`, height: '100%', background: meta.color, borderRadius: 2, transition: 'width .6s ease' }} />
      </div>
      {isActive && scenario.causalExplanation && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{scenario.causalExplanation}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SETUP MODAL
// ─────────────────────────────────────────────
function SetupModal({ form, setForm, onSave, onClose }) {
  const fields = [
    { key: 'glucose',         label: 'Fasting Glucose', unit: 'mg/dL',   ph: '90',  note: 'Normal: 70–100 mg/dL (IDF Asian)' },
    { key: 'hba1c',           label: 'HbA1c',           unit: '%',        ph: '5.5', note: 'Normal: <5.7%, Diabetic target: <7%' },
    { key: 'systolic',        label: 'Systolic BP',     unit: 'mmHg',     ph: '120', note: 'Normal: <130 mmHg' },
    { key: 'diastolic',       label: 'Diastolic BP',    unit: 'mmHg',     ph: '80',  note: 'Normal: <80 mmHg' },
    { key: 'bmi',             label: 'BMI',             unit: 'kg/m²',    ph: '22',  note: 'Asian normal: 18–23 kg/m²' },
    { key: 'sleepHours',      label: 'Sleep',           unit: 'hrs/night',ph: '7',   note: 'Target: 7–8 hours' },
    { key: 'exercisePerWeek', label: 'Exercise',        unit: 'days/wk',  ph: '3',   note: 'Target: at least 3 days' },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 className="p-title" style={{ fontSize: 18 }}>Your health profile</h2>
          <p className="p-subtitle">Using Indian / Asian reference ranges where applicable</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {fields.map(({ key, label, unit, ph, note }) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{unit}</span>
              </div>
              <input className="p-input" placeholder={ph}
                value={form[key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} />
              <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{note}</p>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Conditions</p>
          <input className="p-input" placeholder="e.g. Type 2 Diabetes, Hypertension, Thyroid, PCOD"
            value={form.conditions || ''}
            onChange={e => setForm(prev => ({ ...prev, conditions: e.target.value }))} />
          <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Comma separated</p>
        </div>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Current medications</p>
          <input className="p-input" placeholder="e.g. Metformin 500mg, Telma 40, Thyronorm 50mcg"
            value={form.medications || ''}
            onChange={e => setForm(prev => ({ ...prev, medications: e.target.value }))} />
          <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Comma separated</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="p-btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="p-btn-primary" style={{ flex: 1 }} onClick={onSave}>Save profile</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function HealthTwin() {
  const [state,          setState]         = useState(null);
  const [scenarios,      setScenarios]     = useState([]);
  const [currentRisk,    setCurrentRisk]   = useState(null);
  const [loading,        setLoading]       = useState(true);
  const [refreshing,     setRefreshing]    = useState(false);
  const [runningFor,     setRunningFor]    = useState(null);
  const [customLabel,    setCustomLabel]   = useState('');
  const [customInt,      setCustomInt]     = useState('');
  const [activeScenario, setActiveScenario]= useState(null);
  const [error,          setError]         = useState('');
  const [showSetup,      setShowSetup]     = useState(false);
  const [activeTab,      setActiveTab]     = useState('state');
  const [setupForm,      setSetupForm]     = useState({});

  const { theme } = useThemeStore();
  const C = getChartColors();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [sr, scr] = await Promise.all([api.get('/healthtwin/state'), api.get('/healthtwin/scenarios')]);
      const hs = sr.data.healthState;
      setState(hs);
      setScenarios(scr.data.scenarios || []);
      setCurrentRisk(scr.data.currentRisk);
      if (hs) setSetupForm({
        glucose:          hs.vitals?.glucose ?? '',
        hba1c:            hs.vitals?.hba1c ?? '',
        systolic:         hs.vitals?.bloodPressureSystolic ?? '',
        diastolic:        hs.vitals?.bloodPressureDiastolic ?? '',
        bmi:              hs.vitals?.bmi ?? '',
        sleepHours:       hs.lifestyle?.sleepHours ?? '',
        exercisePerWeek:  hs.lifestyle?.exercisePerWeek ?? '',
        conditions:       hs.conditions?.join(', ') ?? '',
        medications:      hs.medications?.map(m => m.name).join(', ') ?? '',
      });
    } catch { setError('Could not load health data'); }
    finally { setLoading(false); }
  }

  async function refreshRisk() {
    setRefreshing(true); setError('');
    try {
      const { data } = await api.post('/healthtwin/refresh-risk');
      setCurrentRisk(data.riskScore);
      setState(prev => ({ ...prev, riskScore: data.riskScore, riskHistory: data.riskHistory }));
    } catch (err) { setError(err.response?.data?.message || 'Could not compute risk score'); }
    finally { setRefreshing(false); }
  }

  async function saveSetup() {
    try {
      await api.put('/healthtwin/state', {
        vitals: {
          glucose:                Number(setupForm.glucose)   || undefined,
          hba1c:                  Number(setupForm.hba1c)     || undefined,
          bloodPressureSystolic:  Number(setupForm.systolic)  || undefined,
          bloodPressureDiastolic: Number(setupForm.diastolic) || undefined,
          bmi:                    Number(setupForm.bmi)       || undefined,
        },
        lifestyle: {
          sleepHours:      Number(setupForm.sleepHours)      || undefined,
          exercisePerWeek: Number(setupForm.exercisePerWeek) || undefined,
        },
        conditions:  setupForm.conditions  ? setupForm.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: setupForm.medications ? setupForm.medications.split(',').map(s => ({ name: s.trim(), dosage: '', adherence: 'regular' })).filter(m => m.name) : [],
      });
      setShowSetup(false);
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Could not save'); }
  }

  async function runScenario(label, interventions, key) {
    setRunningFor(key); setError('');
    try {
      const { data } = await api.post('/healthtwin/scenario', { label, interventions });
      setScenarios(data.allScenarios);
      setActiveScenario(data.scenario);
      setActiveTab('scenarios');
    } catch (err) { setError(err.response?.data?.message || 'Could not run scenario'); }
    finally { setRunningFor(null); }
  }

  async function runCustom() {
    if (!customLabel.trim() || !customInt.trim()) return;
    await runScenario(customLabel, [{ parameter: 'custom', change: customInt }], 'custom');
    setCustomLabel(''); setCustomInt('');
  }

  async function deleteScenario(id) {
    await api.delete(`/healthtwin/scenario/${id}`);
    setScenarios(prev => prev.filter(s => s._id !== id));
    if (activeScenario?._id === id) setActiveScenario(null);
  }

  const hasState = state && (state.vitals?.glucose || state.conditions?.length || state.medications?.length);
  const riskHistory = state?.riskHistory?.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: h.score,
  })) || [];
  const meta = riskMeta(currentRisk);

  const spinStyle = { width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' };

  if (loading) return (
    <div className="p-page">
      <div className="p-page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[130, 80, 80, 80].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );

  const tabs = [
    { key: 'state',     label: 'Health state' },
    { key: 'scenarios', label: `Scenarios${scenarios.length > 0 ? ` (${scenarios.length})` : ''}` },
    { key: 'insights',  label: 'Run analysis' },
  ];

  return (
    <div className="p-page">
      <div className="p-page-inner animate-in">

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 className="p-title">Health Twin</h1>
            <p className="p-subtitle">Your digital health model — auto-updated from every report and check-in</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="p-btn" onClick={() => setShowSetup(true)}>Edit profile</button>
            <button className="p-btn-primary" onClick={refreshRisk} disabled={refreshing || !hasState}>
              {refreshing
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ ...spinStyle, borderColor: 'var(--bg)', borderTopColor: 'transparent' }} />
                    Computing...
                  </span>
                : 'Compute risk score'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <span className="p-danger-text" style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* no state */}
        {!hasState && (
          <div style={{ border: '1px dashed var(--border2)', borderRadius: 16, padding: '56px 24px', textAlign: 'center', background: 'var(--bg-card)', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🩺</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No health data yet</p>
            <p className="p-muted" style={{ marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
              Add your vitals to get started. Lab reports uploaded in the Reports section automatically update this profile.
            </p>
            <button className="p-btn-primary" onClick={() => setShowSetup(true)}>Add health data</button>
          </div>
        )}

        {hasState && (
          <>
            {/* top: ring + vitals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 20 }}>
              <div className="p-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '28px 36px' }}>
                <p className="p-label" style={{ marginBottom: 4 }}>Risk score</p>
                <RiskRing score={currentRisk} size={130} />
                {!currentRisk && (
                  <p className="p-hint" style={{ textAlign: 'center', maxWidth: 110, marginTop: 4 }}>Click "Compute risk score" above</p>
                )}
              </div>

              <div className="p-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p className="p-label">Vitals — Indian reference ranges</p>
                  <button className="p-btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setShowSetup(true)}>Edit →</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                  <VitalRow label="Fasting Glucose" value={state?.vitals?.glucose} {...RANGES.glucose} />
                  <VitalRow label="HbA1c" value={state?.vitals?.hba1c} {...RANGES.hba1c} />
                  <VitalRow label="Systolic BP" value={state?.vitals?.bloodPressureSystolic} {...RANGES.bloodPressureSystolic} />
                  <VitalRow label="BMI" value={state?.vitals?.bmi} {...RANGES.bmi} />
                </div>
                {(state?.conditions?.length > 0 || state?.medications?.length > 0) && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {state.conditions?.map((c, i) => <span key={i} className="p-badge-accent">{c}</span>)}
                    {state.medications?.map((m, i) => <span key={i} className="p-badge-neutral">{m.name}</span>)}
                  </div>
                )}
              </div>
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  background: activeTab === t.key ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === t.key ? 'var(--text)' : 'var(--text2)',
                  border: 'none', borderRadius: 9, padding: '7px 18px',
                  fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
                  cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                  letterSpacing: '-0.1px',
                  boxShadow: activeTab === t.key ? 'var(--shadow)' : 'none',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* tab: state */}
            {activeTab === 'state' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="animate-in">
                <div className="p-card">
                  <p className="p-section">Risk score over time</p>
                  {riskHistory.length > 1
                    ? <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={riskHistory}>
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.text }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.text }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                            formatter={v => [v + '/100', 'Risk']} labelStyle={{ color: 'var(--text2)' }} />
                          <ReferenceLine y={70} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.5}
                            label={{ value: 'High risk', fontSize: 10, fill: 'var(--danger)' }} />
                          <Line type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2}
                            dot={{ r: 3, fill: C.accent, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p className="p-hint">Compute your risk score to start tracking</p>
                      </div>
                  }
                </div>
                <div className="p-card">
                  <p className="p-section">Lifestyle</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { label: 'Sleep', value: state?.lifestyle?.sleepHours, unit: 'hrs/night', ideal: '7–8 hrs', good: v => v >= 7 && v <= 9 },
                      { label: 'Exercise', value: state?.lifestyle?.exercisePerWeek, unit: 'days/week', ideal: '≥3 days', good: v => v >= 3 },
                    ].map(({ label, value, unit, ideal, good }) => value ? (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 17, fontWeight: 800, color: good(value) ? 'var(--good)' : 'var(--warn)', letterSpacing: '-0.5px' }}>{value}</span>
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{unit}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: good(value) ? 'var(--good)' : 'var(--warn)', background: good(value) ? 'var(--good-dim)' : 'var(--warn-dim)', padding: '1px 7px', borderRadius: 20 }}>
                              {good(value) ? '✓ Good' : `Target: ${ideal}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null)}
                    {!state?.lifestyle?.sleepHours && !state?.lifestyle?.exercisePerWeek && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p className="p-hint">Add lifestyle data in your profile</p>
                        <button className="p-btn" style={{ marginTop: 10, fontSize: 12 }} onClick={() => setShowSetup(true)}>Edit profile</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* tab: scenarios */}
            {activeTab === 'scenarios' && (
              <div className="animate-in">
                {scenarios.length === 0
                  ? <div className="p-card" style={{ textAlign: 'center', padding: '56px 24px' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No scenarios yet</p>
                      <p className="p-hint" style={{ marginBottom: 16 }}>Go to "Run analysis" to test what-if interventions</p>
                      <button className="p-btn" onClick={() => setActiveTab('insights')}>Run an analysis →</button>
                    </div>
                  : <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16 }}>
                        <span className="p-muted" style={{ fontSize: 12, flexShrink: 0 }}>Current baseline</span>
                        <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${currentRisk}%`, height: '100%', background: meta.color, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 800, color: meta.color, letterSpacing: '-1px', flexShrink: 0 }}>{currentRisk ?? '?'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {scenarios.map(s => (
                          <ScenarioCard key={s._id} scenario={s} baseline={currentRisk}
                            isActive={activeScenario?._id === s._id}
                            onClick={() => setActiveScenario(activeScenario?._id === s._id ? null : s)}
                            onDelete={() => deleteScenario(s._id)} />
                        ))}
                      </div>
                    </>
                }
              </div>
            )}

            {/* tab: insights */}
            {activeTab === 'insights' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="animate-in">

                {/* presets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {INDIAN_PRESETS.map(group => (
                    <div key={group.category} className="p-card">
                      <p className="p-section" style={{ marginBottom: 10 }}>{group.emoji} {group.category}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {group.items.map(preset => {
                          const key = group.category + preset.label;
                          const running = runningFor === key;
                          return (
                            <button key={preset.label}
                              onClick={() => runScenario(preset.label, preset.interventions, key)}
                              disabled={!!runningFor || !hasState || !currentRisk}
                              style={{
                                background: running ? 'var(--accent-dim)' : 'var(--bg-card2)',
                                border: `1px solid ${running ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: 10, padding: '10px 14px',
                                textAlign: 'left', cursor: 'pointer', transition: 'all .15s',
                                opacity: (!!runningFor || !hasState || !currentRisk) && !running ? 0.4 : 1,
                                fontFamily: 'inherit',
                              }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: running ? 'var(--accent)' : 'var(--text)', letterSpacing: '-0.2px', marginBottom: 2 }}>
                                {running
                                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                      <span style={{ ...spinStyle, borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                                      Running...
                                    </span>
                                  : preset.label}
                              </p>
                              <p style={{ fontSize: 11, color: 'var(--text2)' }}>{preset.sub}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* custom + ideas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="p-card">
                    <p className="p-section">Custom scenario</p>
                    <p className="p-hint" style={{ marginBottom: 14 }}>Describe any change — the AI reasons about how it affects your specific health profile.</p>
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Scenario name</p>
                      <input className="p-input" placeholder="e.g. Add coconut water daily"
                        value={customLabel} onChange={e => setCustomLabel(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>What changes?</p>
                      <input className="p-input" placeholder="e.g. Replace soft drinks with coconut water every evening"
                        value={customInt} onChange={e => setCustomInt(e.target.value)} />
                    </div>
                    <button className="p-btn-primary" style={{ width: '100%' }}
                      onClick={runCustom}
                      disabled={!!runningFor || !customLabel.trim() || !customInt.trim() || !currentRisk}>
                      {runningFor === 'custom'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                            <span style={{ ...spinStyle, borderColor: 'var(--bg)', borderTopColor: 'transparent' }} />
                            Running...
                          </span>
                        : 'Run custom scenario'}
                    </button>
                    {!currentRisk && hasState && (
                      <p className="p-warn-text" style={{ fontSize: 11, marginTop: 10, textAlign: 'center' }}>
                        Compute your risk score first
                      </p>
                    )}
                  </div>

                  <div className="p-card">
                    <p className="p-section" style={{ marginBottom: 10 }}>Quick ideas</p>
                    {[
                      'Replace evening chai with herbal tea',
                      'Try 16:8 intermittent fasting',
                      'Add 2 tbsp methi seeds soaked overnight',
                      'Walk to market instead of taking auto',
                      'Take 10-min break every 2 hours at work',
                    ].map(idea => (
                      <button key={idea}
                        onClick={() => { setCustomLabel(idea); setCustomInt(idea); }}
                        style={{ display: 'block', width: '100%', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 12, color: 'var(--text2)', fontFamily: 'inherit', marginBottom: 6, transition: 'color .15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}>
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showSetup && <SetupModal form={setupForm} setForm={setSetupForm} onSave={saveSetup} onClose={() => setShowSetup(false)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
