import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const urgencyConfig = {
  low:       { style: 'bg-green-50 text-green-700', label: 'Low' },
  moderate:  { style: 'bg-amber-50 text-amber-700', label: 'Moderate' },
  high:      { style: 'bg-red-50 text-red-600',     label: 'High' },
  emergency: { style: 'bg-red-100 text-red-800',    label: 'Emergency' }
};

const riskBadge = (score) => {
  if (score === null || score === undefined) return 'bg-gray-50 text-gray-400';
  if (score <= 35) return 'bg-green-50 text-green-700';
  if (score <= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-600';
};

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [activeBrief, setActiveBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { fetchPatients(); }, []);

  async function fetchPatients() {
    try {
      const { data } = await api.get('/doctor/patients');
      setPatients(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setActiveBrief(null);
    try {
      const { data } = await api.get(`/doctor/patient/${patient._id}/briefs`);
      setBriefs(data.briefs || []);
    } catch { setBriefs([]); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pendingCount = patients.filter(p => p.pendingBriefs > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Doctor dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome back, Dr. {user?.name?.split(' ').slice(-1)[0]}</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm px-4 py-2 rounded-xl">
              {pendingCount} patient{pendingCount > 1 ? 's' : ''} with pending check-in briefs
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Patient list */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm font-medium text-gray-700 mb-4">
              Patients <span className="text-gray-400 font-normal">({patients.length})</span>
            </p>
            {patients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No patients registered yet</p>
            ) : (
              <div className="space-y-2">
                {patients.map(p => (
                  <div key={p._id}
                    onClick={() => selectPatient(p)}
                    className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                      selectedPatient?._id === p._id
                        ? 'bg-blue-50 border-blue-200'
                        : 'border-transparent hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      </div>
                      {p.pendingBriefs > 0 && (
                        <span className="w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                          {p.pendingBriefs}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pl-9">
                      {p.riskScore !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${riskBadge(p.riskScore)}`}>
                          Risk {p.riskScore}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{p.reportCount} report{p.reportCount !== 1 ? 's' : ''}</span>
                    </div>
                    {p.conditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pl-9">
                        {p.conditions.slice(0, 2).map((c, i) => (
                          <span key={i} className="text-xs text-gray-500">{c}{i < Math.min(p.conditions.length, 2) - 1 ? ',' : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2">
            {!selectedPatient ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center h-full flex items-center justify-center">
                <div>
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                      <circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium text-sm">Select a patient</p>
                  <p className="text-gray-400 text-xs mt-1">View their check-in briefs and health data</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Patient header */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600">
                        {selectedPatient.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedPatient.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {selectedPatient.riskScore !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${riskBadge(selectedPatient.riskScore)}`}>
                              Risk score {selectedPatient.riskScore}/100
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{selectedPatient.reportCount} reports</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedPatient.conditions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
                      {selectedPatient.conditions.map((c, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pre-consult briefs */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-sm font-medium text-gray-700 mb-4">
                    Pre-consultation briefs <span className="text-gray-400 font-normal">({briefs.length})</span>
                  </p>
                  {briefs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No check-ins submitted yet</p>
                  ) : (
                    <div className="space-y-3">
                      {briefs.map(b => {
                        const urg = urgencyConfig[b.doctorBrief?.urgencyLevel] || { style: 'bg-gray-50 text-gray-500', label: 'Unknown' };
                        const isOpen = activeBrief?._id === b._id;
                        return (
                          <div key={b._id} className="border border-gray-100 rounded-xl overflow-hidden">
                            <div
                              onClick={() => setActiveBrief(isOpen ? null : b)}
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {b.doctorBrief?.chiefComplaint || 'Check-in brief'}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urg.style}`}>{urg.label}</span>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9CA3AF" strokeWidth="1.5"
                                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                                  <path d="M3 5l4 4 4-4"/>
                                </svg>
                              </div>
                            </div>

                            {isOpen && b.doctorBrief && (
                              <div className="px-4 pb-4 border-t border-gray-50 pt-4 space-y-3">
                                {b.doctorBrief.keySymptoms?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Key symptoms</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {b.doctorBrief.keySymptoms.map((s, i) => (
                                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {b.doctorBrief.redFlags?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-red-400 uppercase tracking-wide mb-2">Red flags</p>
                                    <div className="space-y-1">
                                      {b.doctorBrief.redFlags.map((f, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                                          <p className="text-sm text-red-600">{f}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {b.doctorBrief.currentMedications?.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Medications</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {b.doctorBrief.currentMedications.map((m, i) => (
                                        <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{m}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="bg-gray-50 rounded-xl p-3.5">
                                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">AI summary</p>
                                  <p className="text-sm text-gray-700 leading-relaxed">{b.doctorBrief.aiSummary}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}