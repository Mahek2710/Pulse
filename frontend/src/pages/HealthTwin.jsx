import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import api from '../services/api';

const riskColor = (score) => {
  if (score <= 35) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', bar: '#16A34A', label: 'Low risk' };
  if (score <= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', bar: '#D97706', label: 'Moderate risk' };
  if (score <= 79) return { text: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-100',   bar: '#EF4444', label: 'High risk' };
  return               { text: 'text-red-700',   bg: 'bg-red-100',  border: 'border-red-200',   bar: '#B91C1C', label: 'Critical risk' };
};

const INTERVENTION_PRESETS = [
  { label: 'Take medication consistently',  interventions: [{ parameter: 'medication_adherence', change: 'from irregular to regular' }] },
  { label: 'Improve sleep to 7-8 hours',    interventions: [{ parameter: 'sleep_hours', change: 'from poor to 7-8 hours per night' }] },
  { label: 'Exercise 4 days per week',      interventions: [{ parameter: 'exercise', change: 'increase to 4 days per week' }] },
  { label: 'Quit smoking',                  interventions: [{ parameter: 'smoking', change: 'quit smoking entirely' }] },
  { label: 'Reduce alcohol intake',         interventions: [{ parameter: 'alcohol', change: 'reduce to under 7 units per week' }] },
  { label: 'Skip medication for a week',    interventions: [{ parameter: 'medication_adherence', change: 'stop taking medication' }] },
];

export default function HealthTwin() {
  const [state, setState] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [currentRisk, setCurrentRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningScenario, setRunningScenario] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customIntervention, setCustomIntervention] = useState('');
  const [activeScenario, setActiveScenario] = useState(null);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    glucose: '', hba1c: '', systolic: '', diastolic: '',
    sleepHours: '', exercisePerWeek: '',
    conditions: '', medications: ''
  });
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [stateRes, scenarioRes] = await Promise.all([
        api.get('/healthtwin/state'),
        api.get('/healthtwin/scenarios')
      ]);
      setState(stateRes.data.healthState);
      setScenarios(scenarioRes.data.scenarios || []);
      setCurrentRisk(scenarioRes.data.currentRisk);
    } catch { setError('Could not load health data'); }
    finally { setLoading(false); }
  }

  async function refreshRisk() {
    setRefreshing(true); setError('');
    try {
      const { data } = await api.post('/healthtwin/refresh-risk');
      setCurrentRisk(data.riskScore);
      setState(prev => ({ ...prev, riskScore: data.riskScore, riskHistory: data.riskHistory }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not compute risk score');
    } finally { setRefreshing(false); }
  }

  async function saveSetup() {
    try {
      await api.put('/healthtwin/state', {
        vitals: {
          glucose: Number(setupForm.glucose) || undefined,
          hba1c: Number(setupForm.hba1c) || undefined,
          bloodPressureSystolic: Number(setupForm.systolic) || undefined,
          bloodPressureDiastolic: Number(setupForm.diastolic) || undefined,
        },
        lifestyle: {
          sleepHours: Number(setupForm.sleepHours) || undefined,
          exercisePerWeek: Number(setupForm.exercisePerWeek) || undefined,
        },
        conditions: setupForm.conditions ? setupForm.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: setupForm.medications
          ? setupForm.medications.split(',').map(s => ({ name: s.trim(), dosage: '', adherence: 'regular' })).filter(m => m.name)
          : []
      });
      setShowSetup(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save');
    }
  }

  async function runPreset(preset) {
    setSelectedPreset(preset.label);
    setRunningScenario(true); setError('');
    try {
      const { data } = await api.post('/healthtwin/scenario', {
        label: preset.label,
        interventions: preset.interventions
      });
      setScenarios(data.allScenarios);
      setActiveScenario(data.scenario);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not run scenario');
    } finally { setRunningScenario(false); setSelectedPreset(null); }
  }

  async function runCustomScenario() {
    if (!customLabel.trim() || !customIntervention.trim()) return;
    setRunningScenario(true); setError('');
    try {
      const { data } = await api.post('/healthtwin/scenario', {
        label: customLabel,
        interventions: [{ parameter: 'custom', change: customIntervention }]
      });
      setScenarios(data.allScenarios);
      setActiveScenario(data.scenario);
      setCustomLabel(''); setCustomIntervention('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not run scenario');
    } finally { setRunningScenario(false); }
  }

  async function deleteScenario(id) {
    await api.delete(`/healthtwin/scenario/${id}`);
    setScenarios(prev => prev.filter(s => s._id !== id));
    if (activeScenario?._id === id) setActiveScenario(null);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasHealthState = state && (state.vitals?.glucose || state.conditions?.length || state.medications?.length);
  const riskHistory = state?.riskHistory?.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: h.score,
    note: h.note
  })) || [];

  const chartData = [
    { name: 'Current', score: currentRisk || 0, type: 'current' },
    ...scenarios.map(s => ({ name: s.label.length > 22 ? s.label.slice(0, 22) + '…' : s.label, score: s.projectedRisk, type: 'scenario', _id: s._id }))
  ];

  const rc = riskColor(currentRisk || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Health Twin</h1>
            <p className="text-gray-400 text-sm mt-0.5">Model your health state and test what-if scenarios</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSetup(true)}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
              Update profile
            </button>
            <button onClick={refreshRisk} disabled={refreshing || !hasHealthState}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
              {refreshing ? 'Computing...' : 'Compute risk score'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

        {/* Setup prompt if no health state */}
        {!hasHealthState && (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center mb-6">
            <p className="text-gray-500 font-medium mb-1">No health data yet</p>
            <p className="text-gray-400 text-sm mb-4">Add your vitals, conditions, and medications to get started. Data from your uploaded reports is auto-filled.</p>
            <button onClick={() => setShowSetup(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
              Set up health profile
            </button>
          </div>
        )}

        {hasHealthState && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

            {/* Risk score card */}
            <div className={`${rc.bg} border ${rc.border} rounded-2xl p-5`}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Current risk score</p>
              {currentRisk !== null ? (
                <>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-5xl font-semibold ${rc.text}`}>{currentRisk}</span>
                    <span className="text-gray-400 text-sm">/ 100</span>
                  </div>
                  <span className={`text-xs font-medium ${rc.text}`}>{rc.label}</span>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-2">Click "Compute risk score" to calculate</p>
              )}
            </div>

            {/* Vitals snapshot */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Vitals snapshot</p>
              <div className="space-y-2">
                {state?.vitals?.glucose && <div className="flex justify-between text-sm"><span className="text-gray-500">Glucose</span><span className="font-medium text-gray-800">{state.vitals.glucose} mg/dL</span></div>}
                {state?.vitals?.hba1c && <div className="flex justify-between text-sm"><span className="text-gray-500">HbA1c</span><span className="font-medium text-gray-800">{state.vitals.hba1c}%</span></div>}
                {state?.vitals?.bloodPressureSystolic && <div className="flex justify-between text-sm"><span className="text-gray-500">Blood pressure</span><span className="font-medium text-gray-800">{state.vitals.bloodPressureSystolic}/{state.vitals.bloodPressureDiastolic} mmHg</span></div>}
                {!state?.vitals?.glucose && !state?.vitals?.hba1c && <p className="text-sm text-gray-400">Upload a lab report to auto-fill vitals</p>}
              </div>
            </div>

            {/* Conditions + meds */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Conditions & meds</p>
              {state?.conditions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {state.conditions.map((c, i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{c}</span>)}
                </div>
              )}
              {state?.medications?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {state.medications.map((m, i) => <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full border border-gray-100">{m.name}</span>)}
                </div>
              )}
              {!state?.conditions?.length && !state?.medications?.length && <p className="text-sm text-gray-400">None added yet</p>}
            </div>
          </div>
        )}

        {/* Risk history chart */}
        {riskHistory.length > 1 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
            <p className="text-sm font-medium text-gray-700 mb-4">Risk score over time</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={riskHistory}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} formatter={(v) => [v + '/100', 'Risk']} />
                <ReferenceLine y={70} stroke="#FCA5A5" strokeDasharray="3 3" label={{ value: 'High risk', fontSize: 10, fill: '#EF4444' }} />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Scenario runner */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-700 mb-1">Run a what-if scenario</p>
            <p className="text-xs text-gray-400 mb-4">Pick a preset or type a custom intervention</p>

            <div className="space-y-2 mb-4">
              {INTERVENTION_PRESETS.map(preset => (
                <button key={preset.label}
                  onClick={() => runPreset(preset)}
                  disabled={runningScenario || !hasHealthState || !currentRisk}
                  className={`w-full text-left text-sm px-3.5 py-2.5 rounded-xl border transition-colors disabled:opacity-40 ${
                    selectedPreset === preset.label
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                  }`}>
                  {selectedPreset === preset.label ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                      Running...
                    </span>
                  ) : preset.label}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-50 pt-4">
              <p className="text-xs text-gray-400 mb-2">Custom scenario</p>
              <input
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm mb-2 outline-none focus:border-blue-400"
                placeholder="Scenario name (e.g. Follow Mediterranean diet)"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
              />
              <input
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm mb-3 outline-none focus:border-blue-400"
                placeholder="What changes? (e.g. switch to plant-based diet)"
                value={customIntervention}
                onChange={e => setCustomIntervention(e.target.value)}
              />
              <button
                onClick={runCustomScenario}
                disabled={runningScenario || !customLabel.trim() || !customIntervention.trim() || !currentRisk}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                {runningScenario && !selectedPreset ? 'Running...' : 'Run custom scenario'}
              </button>
              {!currentRisk && hasHealthState && <p className="text-xs text-amber-600 mt-2 text-center">Compute your risk score first before running scenarios</p>}
            </div>
          </div>

          {/* Scenario results */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-700 mb-4">Scenario comparison</p>

            {scenarios.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p>No scenarios yet</p>
                <p className="text-xs mt-1">Run a preset to see how interventions affect your risk</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} formatter={(v) => [v + '/100', 'Risk']} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={riskColor(entry.score).bar} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-2 mt-4">
                  {scenarios.map(s => {
                    const delta = s.comparedToBaseline;
                    return (
                      <div key={s._id}
                        onClick={() => setActiveScenario(activeScenario?._id === s._id ? null : s)}
                        className="border border-gray-100 rounded-xl p-3 cursor-pointer hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-700 font-medium">{s.label}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${delta < 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {delta > 0 ? '+' : ''}{delta} pts
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor(s.projectedRisk).text} ${riskColor(s.projectedRisk).bg}`}>
                              {s.projectedRisk}/100
                            </span>
                            <button onClick={e => { e.stopPropagation(); deleteScenario(s._id); }}
                              className="text-gray-300 hover:text-red-400 text-xs ml-1">✕</button>
                          </div>
                        </div>
                        {activeScenario?._id === s._id && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{s.causalExplanation}</p>
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

      {/* Setup modal */}
      {showSetup && (
        <div style={{ minHeight: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="fixed inset-0 z-50 p-6" onClick={e => e.target === e.currentTarget && setShowSetup(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update health profile</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Glucose (mg/dL)</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="e.g. 126" value={setupForm.glucose} onChange={e => setSetupForm({...setupForm, glucose: e.target.value})} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">HbA1c (%)</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="e.g. 7.2" value={setupForm.hba1c} onChange={e => setSetupForm({...setupForm, hba1c: e.target.value})} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">BP Systolic</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="e.g. 138" value={setupForm.systolic} onChange={e => setSetupForm({...setupForm, systolic: e.target.value})} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">BP Diastolic</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="e.g. 88" value={setupForm.diastolic} onChange={e => setSetupForm({...setupForm, diastolic: e.target.value})} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sleep (hrs/night)</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="e.g. 6" value={setupForm.sleepHours} onChange={e => setSetupForm({...setupForm, sleepHours: e.target.value})} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Exercise (days/week)</p>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="e.g. 2" value={setupForm.exercisePerWeek} onChange={e => setSetupForm({...setupForm, exercisePerWeek: e.target.value})} />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Conditions (comma separated)</p>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="e.g. Type 2 Diabetes, Hypertension" value={setupForm.conditions} onChange={e => setSetupForm({...setupForm, conditions: e.target.value})} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Medications (comma separated)</p>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="e.g. Metformin, Amlodipine" value={setupForm.medications} onChange={e => setSetupForm({...setupForm, medications: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSetup(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveSetup}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
                Save profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}