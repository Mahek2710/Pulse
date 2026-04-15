import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const riskColor = (score) => {
  if (score === null || score === undefined) return { text: 'text-gray-400', bg: 'bg-gray-50', label: 'Not computed' };
  if (score <= 35) return { text: 'text-green-600', bg: 'bg-green-50', label: 'Low risk' };
  if (score <= 60) return { text: 'text-amber-600', bg: 'bg-amber-50', label: 'Moderate risk' };
  if (score <= 79) return { text: 'text-red-500',   bg: 'bg-red-50',   label: 'High risk' };
  return               { text: 'text-red-700',   bg: 'bg-red-100',  label: 'Critical risk' };
};

const urgencyConfig = {
  low:       'bg-green-50 text-green-700',
  moderate:  'bg-amber-50 text-amber-700',
  high:      'bg-red-50 text-red-600',
  emergency: 'bg-red-100 text-red-800'
};

const eventIcons = {
  report_analyzed:  { dot: 'bg-purple-400', label: 'Report analyzed' },
  intake_submitted: { dot: 'bg-blue-400',   label: 'Check-in completed' },
  scenario_run:     { dot: 'bg-amber-400',  label: 'Scenario run' },
  qa_asked:         { dot: 'bg-green-400',  label: 'Question asked' },
  visit_completed:  { dot: 'bg-gray-400',   label: 'Visit completed' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, []);

  async function fetchDashboard() {
    try {
      const { data } = await api.get('/patient/dashboard');
      setData(data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const rc = riskColor(data?.riskScore);
  const riskHistory = data?.riskHistory?.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    score: h.score
  })) || [];

  const isNewUser = !data?.riskScore && data?.reportCount === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Welcome header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {data?.conditions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end max-w-xs">
              {data.conditions.map((c, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
          )}
        </div>

        {/* New user onboarding */}
        {isNewUser && (
          <div className="bg-blue-600 rounded-2xl p-6 mb-6 text-white">
            <p className="font-semibold text-lg mb-1">Welcome to Pulse 👋</p>
            <p className="text-blue-100 text-sm mb-4">Get started by doing any of these — your health profile builds automatically.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Upload a lab report', sub: 'AI explains it in plain English', path: '/reports', cta: 'Upload report' },
                { label: 'Start pre-consultation', sub: 'AI interviews you before your visit', path: '/intake', cta: 'Start check-in' },
                { label: 'Set up health twin', sub: 'Model your health and run scenarios', path: '/healthtwin', cta: 'Open health twin' },
              ].map(item => (
                <div key={item.path} className="bg-white bg-opacity-10 rounded-xl p-4">
                  <p className="font-medium text-sm mb-0.5">{item.label}</p>
                  <p className="text-blue-200 text-xs mb-3">{item.sub}</p>
                  <button onClick={() => navigate(item.path)}
                    className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50">
                    {item.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metric row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Risk score */}
          <div className={`${rc.bg} rounded-2xl p-4 cursor-pointer`} onClick={() => navigate('/healthtwin')}>
            <p className="text-xs text-gray-400 mb-1">Risk score</p>
            {data?.riskScore !== null && data?.riskScore !== undefined ? (
              <div>
                <p className={`text-3xl font-semibold ${rc.text}`}>{data.riskScore}<span className="text-sm font-normal text-gray-400"> /100</span></p>
                <p className={`text-xs mt-0.5 ${rc.text}`}>{rc.label}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-1">Not computed yet</p>
            )}
          </div>

          {/* Reports */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:border-blue-200 transition-colors" onClick={() => navigate('/reports')}>
            <p className="text-xs text-gray-400 mb-1">Reports uploaded</p>
            <p className="text-3xl font-semibold text-gray-800">{data?.reportCount || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.recentReports?.filter(r => r.abnormalCount > 0).length > 0
                ? `${data.recentReports.filter(r => r.abnormalCount > 0).length} with abnormals`
                : 'All values normal'}
            </p>
          </div>

          {/* Glucose */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">Last glucose</p>
            {data?.vitals?.glucose ? (
              <div>
                <p className={`text-3xl font-semibold ${data.vitals.glucose > 100 ? 'text-red-500' : 'text-gray-800'}`}>
                  {data.vitals.glucose}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">mg/dL · normal &lt;100</p>
              </div>
            ) : <p className="text-sm text-gray-400 mt-1">No data yet</p>}
          </div>

          {/* Scenarios */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:border-blue-200 transition-colors" onClick={() => navigate('/healthtwin')}>
            <p className="text-xs text-gray-400 mb-1">Scenarios run</p>
            <p className="text-3xl font-semibold text-gray-800">{data?.scenarioCount || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">What-if analyses</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Risk chart */}
            {riskHistory.length > 1 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-700">Risk score over time</p>
                  <button onClick={() => navigate('/healthtwin')} className="text-xs text-blue-600 hover:underline">View health twin →</button>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={riskHistory}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} formatter={v => [v + '/100', 'Risk']} />
                    <ReferenceLine y={70} stroke="#FCA5A5" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent reports */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-700">Recent reports</p>
                <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:underline">View all →</button>
              </div>
              {data?.recentReports?.length > 0 ? (
                <div className="space-y-2">
                  {data.recentReports.map(r => (
                    <div key={r._id} onClick={() => navigate(`/reports/${r._id}`)}
                      className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-xs font-semibold text-red-400">PDF</div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{r.reportType || r.fileName}</p>
                          <p className="text-xs text-gray-400">{new Date(r.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.abnormalCount === 0 ? 'bg-green-50 text-green-700' : r.abnormalCount <= 2 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                        {r.abnormalCount === 0 ? 'All normal' : `${r.abnormalCount} abnormal`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">No reports yet</p>
                  <button onClick={() => navigate('/reports')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-blue-700">
                    Upload your first report
                  </button>
                </div>
              )}
            </div>

            {/* Recent check-ins */}
            {data?.recentSessions?.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-700">Recent check-ins</p>
                  <button onClick={() => navigate('/intake')} className="text-xs text-blue-600 hover:underline">New check-in →</button>
                </div>
                <div className="space-y-2">
                  {data.recentSessions.map(s => (
                    <div key={s._id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm text-gray-700">{s.chiefComplaint || 'Check-in completed'}</p>
                        <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${urgencyConfig[s.urgencyLevel] || 'bg-gray-50 text-gray-500'}`}>
                        {s.urgencyLevel || 'Completed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — timeline */}
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-sm font-medium text-gray-700 mb-4">Activity timeline</p>
              {data?.timeline?.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {data.timeline.map((event, i) => {
                      const cfg = eventIcons[event.eventType] || { dot: 'bg-gray-300' };
                      return (
                        <div key={i} className="flex gap-3 relative">
                          <div className={`w-6 h-6 rounded-full ${cfg.dot} flex-shrink-0 flex items-center justify-center z-10`}>
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                          <div className="pt-0.5 pb-1">
                            <p className="text-sm text-gray-700 leading-snug">{event.summary}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(event.eventAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Quick actions</p>
              <div className="space-y-2">
                {[
                  { label: 'Upload a report', sub: 'Analyze your lab results', path: '/reports', color: 'text-purple-600 bg-purple-50' },
                  { label: 'Start check-in', sub: 'Pre-consultation interview', path: '/intake', color: 'text-blue-600 bg-blue-50' },
                  { label: 'Run a scenario', sub: 'Test what-if interventions', path: '/healthtwin', color: 'text-amber-600 bg-amber-50' },
                ].map(item => (
                  <button key={item.path} onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                    <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-xs font-bold`}>
                      {item.label.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}