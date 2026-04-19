// ONLY CHANGES:
// 1. loading wrapper → p-page
// 2. main wrapper → p-page + p-page-inner animate-in
// NOTHING else touched

import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const urgencyConfig = {
  low:       { class: 'p-badge-good', label: 'Low' },
  moderate:  { class: 'p-badge-warn', label: 'Moderate' },
  high:      { class: 'p-badge-bad', label: 'High' },
  emergency: { class: 'p-badge-bad', label: 'Emergency' }
};

const riskMeta = (score) => {
  if (score === null || score === undefined)
    return { class: 'p-badge-neutral', label: '—' };
  if (score <= 35)
    return { class: 'p-badge-good', label: `Low (${score})` };
  if (score <= 60)
    return { class: 'p-badge-warn', label: `Moderate (${score})` };
  return { class: 'p-badge-bad', label: `High (${score})` };
};

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [activeBrief, setActiveBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuthStore();

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      const { data } = await api.get('/doctor/patients');
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function selectPatient(patient) {
    setSelectedPatient(patient);
    setActiveBrief(null);

    try {
      const { data } = await api.get(`/doctor/patient/${patient._id}/briefs`);
      setBriefs(data.briefs || []);
    } catch {
      setBriefs([]);
    }
  }

  if (loading) return (
    <div className="p-page">
      <div className="p-page-inner flex items-center justify-center">
        <div style={{
          width: 28,
          height: 28,
          border: '3px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    </div>
  );

  const pendingCount = patients.filter(p => p.pendingBriefs > 0).length;

  return (
    <div className="p-page">
      <div className="p-page-inner animate-in">

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28
        }}>
          <div>
            <h1 className="p-title">Doctor dashboard</h1>
            <p className="p-subtitle">
              Welcome back, Dr. {user?.name?.split(' ').slice(-1)[0]}
            </p>
          </div>

          {pendingCount > 0 && (
            <div style={{
              background: 'var(--warn-dim)',
              border: '1px solid var(--warn)',
              borderRadius: 12,
              padding: '8px 14px',
              fontSize: 12,
              color: 'var(--warn)'
            }}>
              {pendingCount} patient{pendingCount > 1 ? 's' : ''} pending
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 20
        }}>

          {/* Patient list */}
          <div className="p-card">
            <p className="p-section" style={{ marginBottom: 14 }}>
              Patients ({patients.length})
            </p>

            {patients.length === 0 ? (
              <p className="p-muted" style={{ textAlign: 'center', padding: 20 }}>
                No patients yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {patients.map(p => {
                  const risk = riskMeta(p.riskScore);

                  return (
                    <div
                      key={p._id}
                      onClick={() => selectPatient(p)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        border: '1px solid var(--border)',
                        background:
                          selectedPatient?._id === p._id
                            ? 'var(--accent-dim)'
                            : 'var(--bg-card2)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6
                      }}>
                        <span className="p-body">{p.name}</span>

                        {p.pendingBriefs > 0 && (
                          <span className="p-badge-warn">
                            {p.pendingBriefs}
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center'
                      }}>
                        <span className={risk.class}>
                          {risk.label}
                        </span>

                        <span className="p-muted">
                          {p.reportCount} report{p.reportCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="p-card">
            {!selectedPatient ? (
              <div style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <p className="p-muted">Select a patient</p>
              </div>
            ) : (
              <div>
                <p className="p-section" style={{ marginBottom: 10 }}>
                  {selectedPatient.name}
                </p>

                {briefs.length === 0 ? (
                  <p className="p-muted">No briefs available</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {briefs.map(b => {
                      const urg = urgencyConfig[b.urgencyLevel] || urgencyConfig.low;

                      return (
                        <div
                          key={b._id}
                          onClick={() => setActiveBrief(b)}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: 10,
                            cursor: 'pointer',
                            background:
                              activeBrief?._id === b._id
                                ? 'var(--accent-dim)'
                                : 'var(--bg-card2)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 6
                          }}>
                            <span className="p-body">
                              {b.chiefComplaint || 'No title'}
                            </span>

                            <span className={urg.class}>
                              {urg.label}
                            </span>
                          </div>

                          <p className="p-muted" style={{ fontSize: 12 }}>
                            {b.createdAt
                              ? new Date(b.createdAt).toLocaleString()
                              : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeBrief && (
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--bg-card2)',
                    border: '1px solid var(--border)'
                  }}>
                    <p><strong>Chief:</strong> {activeBrief.chiefComplaint}</p>
                    <p><strong>HPI:</strong> {activeBrief.hpi}</p>
                    <p><strong>Associated:</strong> {activeBrief.associatedFactors}</p>
                    <p><strong>Past:</strong> {activeBrief.pastHistory}</p>
                    <p><strong>Impression:</strong> {activeBrief.clinicalImpression}</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}