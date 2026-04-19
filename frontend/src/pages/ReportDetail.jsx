import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const statusMeta = (status) => {
  const s = (status || '').toLowerCase();

  if (s === 'low')
    return { bg: 'var(--warn-dim)', color: 'var(--warn)', label: 'Low' };

  if (s === 'high')
    return { bg: 'var(--danger-dim)', color: 'var(--danger)', label: 'High' };

  if (s === 'critical')
    return { bg: 'var(--danger-dim)', color: 'var(--danger)', label: 'Critical' };

  return { bg: 'var(--good-dim)', color: 'var(--good)', label: 'Normal' };
};

export default function ReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => { fetchReport(); }, [reportId]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [report?.qaThread]);

  async function fetchReport() {
    try {
      const { data } = await api.get(`/reports/${reportId}`);
      setReport(data);
    } catch {
      setError('Could not load report');
    }
  }

  async function handleAsk() {
    if (!question.trim()) return;

    setAsking(true);
    const q = question;
    setQuestion('');

    try {
      const { data } = await api.post(`/reports/${reportId}/ask`, { question: q });
      setReport(prev => ({ ...prev, qaThread: data.qaThread }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not get answer');
    } finally {
      setAsking(false);
    }
  }

  if (error) return (
    <div style={{ padding: 20 }}>
      <span className="p-danger-text">{error}</span>
    </div>
  );

  if (!report) return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '3px solid var(--accent)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
    </div>
  );

  const abnormal = (report.extractedValues || []).filter(
    v => ['high', 'low', 'critical'].includes((v?.status || '').toLowerCase())
  );

  const normal = (report.extractedValues || []).filter(
    v => (v?.status || '').toLowerCase() === 'normal'
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '32px 24px'
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20
        }}>
          <button
            onClick={() => navigate('/reports')}
            className="p-btn"
          >
            ← Back
          </button>

          <h1 className="p-title">{report.reportType}</h1>

          <span className="p-muted">
            {new Date(report.uploadedAt).toLocaleDateString('en-IN')}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20
        }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary */}
            <div className="p-card">
              <p className="p-section">AI Summary</p>
              <p className="p-body">{report.overallSummary}</p>
            </div>

            {/* Abnormal */}
            {abnormal.length > 0 && (
              <div className="p-card">
                <p className="p-danger-text" style={{ marginBottom: 10 }}>
                  Needs attention — {abnormal.length}
                </p>

                {abnormal.map((v, i) => {
                  const meta = statusMeta(v.status);

                  return (
                    <div key={i} style={{
                      background: meta.bg,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ color: meta.color, fontWeight: 600 }}>
                          {v.name}
                        </span>

                        <span style={{ color: meta.color }}>
                          {v.value} {v.unit}
                        </span>
                      </div>

                      <p className="p-muted" style={{ fontSize: 12 }}>
                        Normal: {v.normalRange}
                      </p>

                      <p style={{ fontSize: 12, marginTop: 4 }}>
                        {v.aiExplanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Normal */}
            {normal.length > 0 && (
              <div className="p-card">
                <p className="p-good-text" style={{ marginBottom: 10 }}>
                  Normal — {normal.length}
                </p>

                {normal.map((v, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0'
                  }}>
                    <span className="p-muted">{v.name}</span>
                    <span>{v.value} {v.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT CHAT */}
          <div className="p-card" style={{
            display: 'flex',
            flexDirection: 'column',
            height: 500
          }}>
            <p className="p-section" style={{ marginBottom: 10 }}>
              Ask about this report
            </p>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: 10
            }}>
              {report.qaThread.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 8
                }}>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background:
                      msg.role === 'user'
                        ? 'var(--accent)'
                        : 'var(--bg-card2)',
                    color:
                      msg.role === 'user'
                        ? '#fff'
                        : 'var(--text)'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="p-input"
                style={{ flex: 1 }}
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />

              <button
                onClick={handleAsk}
                className="p-btn-primary"
              >
                Send
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}