import { SkeletonCard, SkeletonMetrics } from '../components/SkeletonLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import api from '../services/api';
import useThemeStore from '../store/themeStore';
import { getChartColors } from '../utils/chartTheme';

// ── helpers ──────────────────────────────────────────────────
const riskMeta = (score) => {
  if (!score && score !== 0) return { textClass: 'p-muted-text', badgeClass: 'p-badge-neutral', bar: 'var(--text2)', label: '—' };
  if (score <= 35) return { textClass: 'p-good-text',   badgeClass: 'p-badge-good',    bar: 'var(--good)',   label: 'Low risk' };
  if (score <= 60) return { textClass: 'p-warn-text',   badgeClass: 'p-badge-warn',    bar: 'var(--warn)',   label: 'Moderate risk' };
  if (score <= 79) return { textClass: 'p-danger-text', badgeClass: 'p-badge-bad',     bar: 'var(--danger)', label: 'High risk' };
  return               { textClass: 'p-danger-text', badgeClass: 'p-badge-bad',     bar: 'var(--danger)', label: 'Critical risk' };
};

const PRESETS = [
  { label: 'Take medication consistently', interventions: [{ parameter: 'medication_adherence', change: 'from irregular to regular' }] },
  { label: 'Improve sleep to 7–8 hours',   interventions: [{ parameter: 'sleep_hours',          change: 'from poor to 7-8 hours per night' }] },
  { label: 'Exercise 4 days per week',      interventions: [{ parameter: 'exercise',             change: 'increase to 4 days per week' }] },
  { label: 'Quit smoking',                  interventions: [{ parameter: 'smoking',              change: 'quit smoking entirely' }] },
  { label: 'Reduce alcohol intake',         interventions: [{ parameter: 'alcohol',              change: 'reduce to under 7 units per week' }] },
  { label: 'Skip medication for a week',    interventions: [{ parameter: 'medication_adherence', change: 'stop taking medication' }] },
];

// ── ring component ───────────────────────────────────────────
function RiskRing({ score }) {
  const meta = riskMeta(score);
  const pct  = score ? score / 100 : 0;
  const r    = 46;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
          <circle cx="55" cy="55" r={r} fill="none"
            stroke={score <= 35 ? 'var(--good)' : score <= 60 ? 'var(--warn)' : 'var(--danger)'}
            strokeWidth="9"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ transition: 'stroke-dasharray .6s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="p-num" style={{ fontSize: 30 }}>{score ?? '—'}</span>
          <span className="p-hint" style={{ fontSize: 10 }}>/100</span>
        </div>
      </div>
      {score !== null && <span className={meta.badgeClass}>{meta.label}</span>}
    </div>
  );
}

// ── scenario bar row ─────────────────────────────────────────
function ScenarioBar({ label, score, isActive, onToggle, onDelete, delta }) {
  const meta = riskMeta(score);
  return (
    <div
      onClick={onToggle}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'border-color .15s',
        background: isActive ? 'var(--accent-dim)' : 'var(--bg-card2)'
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="p-body" style={{ fontWeight: 500, flex: 1 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {delta !== undefined && (
            <span style={{ fontSize: 12, fontWeight: 700 }} className={delta < 0 ? 'p-good-text' : 'p-danger-text'}>
              {delta > 0 ? '+' : ''}{delta} pts
            </span>
          )}
          <span className={meta.badgeClass}>{score}/100</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
          >✕</button>
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: meta.bar, borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────
export default function HealthTwin() {
  const [state,            setState]           = useState(null);
  const [scenarios,        setScenarios]       = useState([]);
  const [currentRisk,      setCurrentRisk]     = useState(null);
  const [loading,          setLoading]         = useState(true);
  const [refreshing,       setRefreshing]      = useState(false);
  const [runningScenario,  setRunningScenario] = useState(false);
  const [selectedPreset,   setSelectedPreset]  = useState(null);
  const [customLabel,      setCustomLabel]     = useState('');
  const [customInt,        setCustomInt]       = useState('');
  const [activeScenario,   setActiveScenario]  = useState(null);
  const [error,            setError]           = useState('');
  const [showSetup,        setShowSetup]       = useState(false);
  const [setupForm,        setSetupForm]       = useState({
    glucose: '', hba1c: '', systolic: '', diastolic: '',
    sleepHours: '', exercisePerWeek: '', conditions: '', medications: ''
  });

  const { theme } = useThemeStore();
  const C = getChartColors();
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [sr, scr] = await Promise.all([
        api.get('/healthtwin/state'),
        api.get('/healthtwin/scenarios')
      ]);
      setState(sr.data.healthState);
      setScenarios(scr.data.scenarios || []);
      setCurrentRisk(scr.data.currentRisk);
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
        },
        lifestyle: {
          sleepHours:       Number(setupForm.sleepHours)      || undefined,
          exercisePerWeek:  Number(setupForm.exercisePerWeek) || undefined,
        },
        conditions:  setupForm.conditions  ? setupForm.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: setupForm.medications ? setupForm.medications.split(',').map(s => ({ name: s.trim(), dosage: '', adherence: 'regular' })).filter(m => m.name) : []
      });
      setShowSetup(false);
      await fetchData();
    } catch (err) { setError(err.response?.data?.message || 'Could not save'); }
  }

  async function runPreset(preset) {
    setSelectedPreset(preset.label); setRunningScenario(true); setError('');
    try {
      const { data } = await api.post('/healthtwin/scenario', { label: preset.label, interventions: preset.interventions });
      setScenarios(data.allScenarios);
      setActiveScenario(data.scenario);
    } catch (err) { setError(err.response?.data?.message || 'Could not run scenario'); }
    finally { setRunningScenario(false); setSelectedPreset(null); }
  }

  async function runCustom() {
    if (!customLabel.trim() || !customInt.trim()) return;
    setRunningScenario(true); setError('');
    try {
      const { data } = await api.post('/healthtwin/scenario', {
        label: customLabel,
        interventions: [{ parameter: 'custom', change: customInt }]
      });
      setScenarios(data.allScenarios);
      setActiveScenario(data.scenario);
      setCustomLabel(''); setCustomInt('');
    } catch (err) { setError(err.response?.data?.message || 'Could not run scenario'); }
    finally { setRunningScenario(false); }
  }

  async function deleteScenario(id) {
    await api.delete(`/healthtwin/scenario/${id}`);
    setScenarios(prev => prev.filter(s => s._id !== id));
    if (activeScenario?._id === id) setActiveScenario(null);
  }

  // ── loading ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-in">
        <SkeletonMetrics count={3} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    </div>
  );

  const hasHealthState = state && (state.vitals?.glucose || state.conditions?.length || state.medications?.length);
  const riskHistory = state?.riskHistory?.map(h => ({
    date:  new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: h.score,
    note:  h.note
  })) || [];

  // ── render ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }} className="animate-in">

        {/* ── page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="p-title">Health Twin</h1>
            <p className="p-subtitle">Model your health and test what-if scenarios</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="p-btn" onClick={() => setShowSetup(true)}>Update profile</button>
            <button
              className="p-btn-primary"
              onClick={refreshRisk}
              disabled={refreshing || !hasHealthState}
            >
              {refreshing ? 'Computing...' : 'Compute risk score'}
            </button>
          </div>
        </div>

        {/* ── error ── */}
        {error && (
          <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 12, padding: '10px 16px', marginBottom: 16 }}>
            <span className="p-danger-text" style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* ── no health state prompt ── */}
        {!hasHealthState && (
          <div style={{
            border: '1px dashed var(--border2)', borderRadius: 14,
            padding: '48px 24px', textAlign: 'center', marginBottom: 20,
            background: 'var(--bg-card)'
          }}>
            <p className="p-body" style={{ fontWeight: 600, marginBottom: 6 }}>No health data yet</p>
            <p className="p-muted" style={{ marginBottom: 20 }}>
              Add your vitals, conditions, and medications to get started.
              Data from uploaded reports is auto-filled.
            </p>
            <button className="p-btn-primary" onClick={() => setShowSetup(true)}>
              Set up health profile
            </button>
          </div>
        )}

        {/* ── top metrics row ── */}
        {hasHealthState && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* risk ring */}
            <div className="p-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, padding: 24 }}>
              <p className="p-label" style={{ marginBottom: 16 }}>Current risk score</p>
              {currentRisk !== null
                ? <RiskRing score={currentRisk} />
                : <p className="p-muted" style={{ textAlign: 'center', fontSize: 13 }}>Click "Compute risk score" to calculate</p>
              }
            </div>

            {/* vitals */}
            <div className="p-card">
              <p className="p-label">Vitals snapshot</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {state?.vitals?.glucose && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="p-muted-text" style={{ fontSize: 13 }}>Glucose</span>
                    <span className="p-num" style={{ fontSize: 16, color: state.vitals.glucose > 100 ? 'var(--danger)' : 'var(--num)' }}>
                      {state.vitals.glucose} <span className="p-hint" style={{ fontWeight: 400, fontSize: 11 }}>mg/dL</span>
                    </span>
                  </div>
                )}
                {state?.vitals?.hba1c && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="p-muted-text" style={{ fontSize: 13 }}>HbA1c</span>
                    <span className="p-num" style={{ fontSize: 16, color: state.vitals.hba1c > 5.7 ? 'var(--warn)' : 'var(--num)' }}>
                      {state.vitals.hba1c} <span className="p-hint" style={{ fontWeight: 400, fontSize: 11 }}>%</span>
                    </span>
                  </div>
                )}
                {state?.vitals?.bloodPressureSystolic && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="p-muted-text" style={{ fontSize: 13 }}>Blood pressure</span>
                    <span className="p-num" style={{ fontSize: 16 }}>
                      {state.vitals.bloodPressureSystolic}/{state.vitals.bloodPressureDiastolic}
                      <span className="p-hint" style={{ fontWeight: 400, fontSize: 11 }}> mmHg</span>
                    </span>
                  </div>
                )}
                {!state?.vitals?.glucose && !state?.vitals?.hba1c && (
                  <p className="p-muted" style={{ fontSize: 12 }}>Upload a lab report to auto-fill vitals</p>
                )}
              </div>
            </div>

            {/* conditions + meds */}
            <div className="p-card">
              <p className="p-label">Conditions & meds</p>
              {state?.conditions?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {state.conditions.map((c, i) => (
                    <span key={i} className="p-badge-accent">{c}</span>
                  ))}
                </div>
              )}
              {state?.medications?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {state.medications.map((m, i) => (
                    <span key={i} className="p-badge-neutral">{m.name}</span>
                  ))}
                </div>
              )}
              {!state?.conditions?.length && !state?.medications?.length && (
                <p className="p-muted" style={{ fontSize: 12 }}>None added yet</p>
              )}
            </div>
          </div>
        )}

        {/* ── risk history chart ── */}
        {riskHistory.length > 1 && (
          <div className="p-card" style={{ marginBottom: 20 }}>
            <p className="p-section">Risk score over time</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={riskHistory}>
                <XAxis dataKey="date"  tick={{ fontSize: 11, fill: C.text }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: C.text }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                  formatter={v => [v + '/100', 'Risk']}
                  labelStyle={{ color: 'var(--text2)' }}
                />
                <ReferenceLine y={70} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.4}
                  label={{ value: 'High risk', fontSize: 10, fill: 'var(--danger)' }} />
                <Line type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2}
                  dot={{ r: 4, fill: C.accent, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── bottom two columns ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* scenario runner */}
          <div className="p-card">
            <p className="p-section">Run a what-if scenario</p>
            <p className="p-muted" style={{ marginBottom: 16, fontSize: 12 }}>Pick a preset or describe a custom intervention</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => runPreset(preset)}
                  disabled={runningScenario || !hasHealthState || !currentRisk}
                  style={{
                    background: selectedPreset === preset.label ? 'var(--accent-dim)' : 'var(--bg-card2)',
                    color: selectedPreset === preset.label ? 'var(--accent)' : 'var(--text2)',
                    border: `1px solid ${selectedPreset === preset.label ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '9px 14px', fontSize: 13,
                    textAlign: 'left', cursor: 'pointer', transition: 'all .15s',
                    opacity: (runningScenario || !hasHealthState || !currentRisk) ? 0.4 : 1
                  }}
                >
                  {selectedPreset === preset.label ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      Running...
                    </span>
                  ) : preset.label}
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p className="p-muted" style={{ fontSize: 12, marginBottom: 8 }}>Custom scenario</p>
              <input
                className="p-input" style={{ marginBottom: 8 }}
                placeholder="Scenario name (e.g. Follow Mediterranean diet)"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
              />
              <input
                className="p-input" style={{ marginBottom: 12 }}
                placeholder="What changes? (e.g. switch to plant-based diet)"
                value={customInt}
                onChange={e => setCustomInt(e.target.value)}
              />
              <button
                className="p-btn-primary" style={{ width: '100%' }}
                onClick={runCustom}
                disabled={runningScenario || !customLabel.trim() || !customInt.trim() || !currentRisk}
              >
                {runningScenario && !selectedPreset ? 'Running...' : 'Run custom scenario'}
              </button>
              {!currentRisk && hasHealthState && (
                <p className="p-warn-text" style={{ fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                  Compute your risk score first
                </p>
              )}
            </div>
          </div>

          {/* scenario results */}
          <div className="p-card">
            <p className="p-section">Scenario comparison</p>

            {scenarios.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p className="p-muted">No scenarios yet</p>
                <p className="p-hint" style={{ marginTop: 6 }}>Run a preset to see how interventions affect your risk</p>
              </div>
            ) : (
              <>
                {/* inline bar chart using CSS — avoids hardcoded chart colors */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="p-muted" style={{ fontSize: 12 }}>Current</span>
                    <span className={riskMeta(currentRisk).textClass} style={{ fontSize: 12, fontWeight: 700 }}>{currentRisk}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ width: `${currentRisk}%`, height: '100%', background: riskMeta(currentRisk).bar, borderRadius: 3 }} />
                  </div>

                  {scenarios.map(s => {
                    const meta  = riskMeta(s.projectedRisk);
                    const delta = s.comparedToBaseline;
                    const open  = activeScenario?._id === s._id;
                    return (
                      <div key={s._id} style={{ marginBottom: 10 }}>
                        <div
                          onClick={() => setActiveScenario(open ? null : s)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 5, cursor: 'pointer'
                          }}
                        >
                          <span className="p-muted-text" style={{ fontSize: 12, flex: 1 }}>{s.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={delta < 0 ? 'p-good-text' : 'p-danger-text'} style={{ fontSize: 12, fontWeight: 700 }}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                            <span className={meta.badgeClass}>{s.projectedRisk}</span>
                            <button
                              onClick={e => { e.stopPropagation(); deleteScenario(s._id); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, lineHeight: 1, padding: '0 2px' }}
                            >✕</button>
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${s.projectedRisk}%`, height: '100%', background: meta.bar, borderRadius: 2, transition: 'width .5s ease' }} />
                        </div>
                        {open && (
                          <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <p className="p-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>{s.causalExplanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ── setup modal ── */}
      {showSetup && (
        <div
          onClick={e => e.target === e.currentTarget && setShowSetup(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
          }}
        >
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
            <h2 className="p-title" style={{ fontSize: 18, marginBottom: 20 }}>Update health profile</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { key: 'glucose',       label: 'Glucose (mg/dL)',    ph: 'e.g. 126' },
                { key: 'hba1c',         label: 'HbA1c (%)',          ph: 'e.g. 7.2'  },
                { key: 'systolic',      label: 'BP Systolic',        ph: 'e.g. 138'  },
                { key: 'diastolic',     label: 'BP Diastolic',       ph: 'e.g. 88'   },
                { key: 'sleepHours',    label: 'Sleep (hrs/night)',  ph: 'e.g. 6'    },
                { key: 'exercisePerWeek', label: 'Exercise (days/week)', ph: 'e.g. 2' },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <p className="p-muted" style={{ fontSize: 11, marginBottom: 5 }}>{label}</p>
                  <input
                    className="p-input"
                    placeholder={ph}
                    value={setupForm[key]}
                    onChange={e => setSetupForm({ ...setupForm, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <p className="p-muted" style={{ fontSize: 11, marginBottom: 5 }}>Conditions (comma separated)</p>
              <input className="p-input" placeholder="e.g. Type 2 Diabetes, Hypertension"
                value={setupForm.conditions} onChange={e => setSetupForm({ ...setupForm, conditions: e.target.value })} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <p className="p-muted" style={{ fontSize: 11, marginBottom: 5 }}>Medications (comma separated)</p>
              <input className="p-input" placeholder="e.g. Metformin, Amlodipine"
                value={setupForm.medications} onChange={e => setSetupForm({ ...setupForm, medications: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="p-btn" style={{ flex: 1 }} onClick={() => setShowSetup(false)}>Cancel</button>
              <button className="p-btn-primary" style={{ flex: 1 }} onClick={saveSetup}>Save profile</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}