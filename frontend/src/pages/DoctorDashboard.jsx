import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const riskMeta = (score) => {
  if (score === null || score === undefined) return { color: 'var(--text2)', bg: 'var(--bg-card2)', label: 'No score', badgeClass: 'p-badge-neutral' };
  if (score <= 30) return { color: 'var(--good)',   bg: 'var(--good-dim)',   label: 'Low',      badgeClass: 'p-badge-good' };
  if (score <= 55) return { color: 'var(--warn)',   bg: 'var(--warn-dim)',   label: 'Moderate', badgeClass: 'p-badge-warn' };
  if (score <= 75) return { color: 'var(--danger)', bg: 'var(--danger-dim)', label: 'High',     badgeClass: 'p-badge-bad'  };
  return               { color: 'var(--danger)', bg: 'var(--danger-dim)', label: 'Critical', badgeClass: 'p-badge-bad'  };
};

const urgencyMeta = {
  low:       { color: 'var(--good)',   bg: 'var(--good-dim)',   label: 'Low urgency'   },
  moderate:  { color: 'var(--warn)',   bg: 'var(--warn-dim)',   label: 'Moderate'      },
  high:      { color: 'var(--danger)', bg: 'var(--danger-dim)', label: 'High urgency'  },
  emergency: { color: 'var(--danger)', bg: 'var(--danger-dim)', label: '🚨 Emergency'  },
};

function Badge({ children, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color, background: bg, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// BRIEF CARD (expandable)
// ─────────────────────────────────────────────
function BriefCard({ brief, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const b = brief.doctorBrief;

  if (!b) return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 12 }}>
      <p className="p-muted" style={{ fontSize: 12 }}>Brief not generated for this session</p>
      <p className="p-hint" style={{ fontSize: 11, marginTop: 3 }}>{new Date(brief.createdAt).toLocaleString('en-IN')}</p>
    </div>
  );

  const urg = urgencyMeta[b.urgencyLevel] || urgencyMeta.low;

  return (
    <div style={{
      border: `1px solid ${open ? urg.color + '44' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color .2s',
      background: 'var(--bg-card)',
      boxShadow: 'var(--shadow)',
    }}>
      {/* header row — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.2px', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.chiefComplaint || 'Check-in brief'}
          </p>
          <p className="p-hint" style={{ fontSize: 11 }}>
            {new Date(brief.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
          <Badge color={urg.color} bg={urg.bg}>{urg.label}</Badge>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text2)" strokeWidth="1.5"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s', flexShrink: 0 }}>
            <path d="M3 5l4 4 4-4"/>
          </svg>
        </div>
      </div>

      {/* expanded content */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* AI summary */}
          {b.aiSummary && (
            <div style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${urg.color}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>AI summary for doctor</p>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{b.aiSummary}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* key symptoms */}
            {b.keySymptoms?.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Key symptoms</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {b.keySymptoms.map((s, i) => (
                    <span key={i} className="p-badge-neutral">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* medications */}
            {b.currentMedications?.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Reported medications</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {b.currentMedications.map((m, i) => (
                    <span key={i} className="p-badge-accent">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* red flags */}
          {b.redFlags?.length > 0 && (
            <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Red flags</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {b.redFlags.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--danger)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// PATIENT ROW in list
// ─────────────────────────────────────────────
function PatientRow({ patient, selected, onClick }) {
  const rm = riskMeta(patient.riskScore);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
        background: selected ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${selected ? 'var(--accent)' : 'transparent'}`,
        transition: 'all .15s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-card2)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: selected ? 'var(--accent)' : 'var(--bg-card2)',
            border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800,
            color: selected ? 'var(--bg)' : 'var(--text2)',
          }}>
            {patient.name?.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--accent)' : 'var(--text)', letterSpacing: '-0.2px' }}>
            {patient.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {patient.pendingBriefs > 0 && (
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--bg)' }}>
              {patient.pendingBriefs}
            </div>
          )}
          {patient.riskScore !== null && (
            <span style={{ fontSize: 11, fontWeight: 800, color: rm.color }}>{patient.riskScore}</span>
          )}
        </div>
      </div>

      <div style={{ paddingLeft: 38, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {patient.riskScore !== null && (
          <Badge color={rm.color} bg={rm.bg}>{rm.label} risk</Badge>
        )}
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>{patient.reportCount} report{patient.reportCount !== 1 ? 's' : ''}</span>
        {patient.lastUrgency && (
          <Badge color={urgencyMeta[patient.lastUrgency]?.color} bg={urgencyMeta[patient.lastUrgency]?.bg}>
            Last: {patient.lastUrgency}
          </Badge>
        )}
      </div>

      {patient.lastComplaint && (
        <p style={{ fontSize: 11, color: 'var(--text2)', paddingLeft: 38, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {patient.lastComplaint}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function DoctorDashboard() {
  const [patients,         setPatients]         = useState([]);
  const [isUnassigned,     setIsUnassigned]     = useState(false);
  const [selectedPatient,  setSelectedPatient]  = useState(null);
  const [patientDetail,    setPatientDetail]    = useState(null); // { briefs, healthState }
  const [loadingPatients,  setLoadingPatients]  = useState(true);
  const [loadingDetail,    setLoadingDetail]    = useState(false);
  const [search,           setSearch]           = useState('');
  const { user } = useAuthStore();

  useEffect(() => { fetchPatients(); }, []);

  async function fetchPatients() {
    try {
      const { data } = await api.get('/doctor/patients');
      setPatients(data.patients || []);
      setIsUnassigned(data.isUnassigned);
    } catch (err) { console.error(err); }
    finally { setLoadingPatients(false); }
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setPatientDetail(null);
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/doctor/patient/${patient._id}/briefs`);
      setPatientDetail(data);
    } catch { setPatientDetail({ briefs: [], healthState: null }); }
    finally { setLoadingDetail(false); }
  }

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingTotal = patients.reduce((acc, p) => acc + (p.pendingBriefs || 0), 0);
  const rm = riskMeta(selectedPatient?.riskScore);

  return (
    <div className="p-page">
      <div className="p-page-inner animate-in">

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="p-title">Doctor dashboard</h1>
            <p className="p-subtitle">Welcome back, Dr. {user?.name?.split(' ').slice(-1)[0]}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {pendingTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--warn-dim)', border: '1px solid var(--warn)', borderRadius: 10, padding: '7px 14px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warn)', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
                  {pendingTotal} pending check-in brief{pendingTotal > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* dev warning */}
        {isUnassigned && patients.length > 0 && (
          <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>ℹ️</span>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>
              Showing all patients — no patients are assigned to you yet. In production, patients would be assigned to specific doctors.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

          {/* patient list */}
          <div className="p-card" style={{ position: 'sticky', top: 70 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p className="p-section" style={{ marginBottom: 0 }}>
                Patients ({patients.length})
              </p>
            </div>

            <input className="p-input" style={{ marginBottom: 10, fontSize: 12 }}
              placeholder="Search patients..." value={search}
              onChange={e => setSearch(e.target.value)} />

            {loadingPatients ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />)}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p className="p-hint">{search ? 'No patients match' : 'No patients yet'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredPatients.map(p => (
                  <PatientRow
                    key={p._id}
                    patient={p}
                    selected={selectedPatient?._id === p._id}
                    onClick={() => selectPatient(p)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* right panel */}
          {!selectedPatient ? (
            <div className="p-card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{ width: 48, height: 48, background: 'var(--bg-card2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                👤
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Select a patient</p>
              <p className="p-hint">Click a patient on the left to view their check-in briefs and health data</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* patient header card */}
              <div className="p-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: 'var(--accent)'
                    }}>
                      {selectedPatient.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                        {selectedPatient.name}
                      </p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {selectedPatient.riskScore !== null && (
                          <Badge color={rm.color} bg={rm.bg}>Risk {selectedPatient.riskScore}/100 — {rm.label}</Badge>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {selectedPatient.reportCount} report{selectedPatient.reportCount !== 1 ? 's' : ''}
                        </span>
                        {selectedPatient.lastCheckIn && (
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                            Last check-in: {new Date(selectedPatient.lastCheckIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* conditions + meds */}
                {(patientDetail?.healthState?.conditions?.length > 0 || patientDetail?.healthState?.medications?.length > 0) && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {patientDetail.healthState.conditions?.map((c, i) => (
                      <span key={i} className="p-badge-accent">{c}</span>
                    ))}
                    {patientDetail.healthState.medications?.map((m, i) => (
                      <span key={i} className="p-badge-neutral">{m.name}</span>
                    ))}
                  </div>
                )}

                {/* vitals strip */}
                {patientDetail?.healthState?.vitals && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Glucose', value: patientDetail.healthState.vitals.glucose, unit: 'mg/dL', danger: v => v > 100 },
                      { label: 'HbA1c',   value: patientDetail.healthState.vitals.hba1c,   unit: '%',     danger: v => v > 5.7  },
                      { label: 'BP',      value: patientDetail.healthState.vitals.bloodPressureSystolic
                                            ? `${patientDetail.healthState.vitals.bloodPressureSystolic}/${patientDetail.healthState.vitals.bloodPressureDiastolic}`
                                            : null, unit: 'mmHg', danger: v => false },
                    ].filter(v => v.value).map(v => (
                      <div key={v.label}>
                        <p style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>{v.label}</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: v.danger(v.value) ? 'var(--danger)' : 'var(--text)', letterSpacing: '-0.5px' }}>
                          {v.value} <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400 }}>{v.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* check-in briefs */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p className="p-section" style={{ marginBottom: 0 }}>
                    Check-in briefs ({patientDetail?.briefs?.length || 0})
                  </p>
                  {selectedPatient.pendingBriefs > 0 && (
                    <Badge color="var(--warn)" bg="var(--warn-dim)">
                      {selectedPatient.pendingBriefs} unreviewed
                    </Badge>
                  )}
                </div>

                {loadingDetail ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 58, borderRadius: 12 }} />)}
                  </div>
                ) : patientDetail?.briefs?.length === 0 ? (
                  <div className="p-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <p className="p-muted">No check-ins submitted yet</p>
                    <p className="p-hint" style={{ marginTop: 4 }}>This patient hasn't completed a pre-consultation check-in</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {patientDetail?.briefs?.map((b, i) => (
                      <BriefCard key={b._id} brief={b} defaultOpen={i === 0} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}