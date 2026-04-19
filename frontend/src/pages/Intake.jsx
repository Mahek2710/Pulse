import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Intake() {
  const [stage, setStage] = useState('start');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState('');

  const [inputType, setInputType] = useState('text');
  const [options, setOptions] = useState([]);

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function detectInputType(question) {
    const q = question.toLowerCase();

    if (q.includes('gender')) {
      return { type: 'options', options: ['Male', 'Female', 'Other'] };
    }

    if (q.includes('blood')) {
      return {
        type: 'options',
        options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "I don't know"]
      };
    }

    if (q.includes('age')) return { type: 'number' };

    return { type: 'text' };
  }

  async function startSession() {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/intake/start');

      setSessionId(data.sessionId);
      setMessages([{ role: 'ai', content: data.question }]);

      const config = detectInputType(data.question);
      setInputType(config.type);
      setOptions(config.options || []);

      setStage('chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start session');
    } finally { setLoading(false); }
  }

  async function sendMessage(customValue = null) {
    const valueToSend = customValue || input;
    if (!valueToSend.trim() || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'patient', content: valueToSend }]);
    setLoading(true);

    try {
      const { data } = await api.post('/intake/respond', {
        sessionId,
        message: valueToSend
      });

      if (data.complete) {
        setBrief(data.brief);
        setStage('complete');
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: data.question }]);

        const config = detectInputType(data.question);
        setInputType(config.type);
        setOptions(config.options || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: 'Something went wrong. Please try again.' }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // ───────── START SCREEN ─────────
  if (stage === 'start') return (
    <div className="p-page">
      <div className="p-page-inner animate-in flex items-center justify-center">

        <div className="p-card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <h1 className="p-title" style={{ marginBottom: 10 }}>
            Pre-consultation check-in
          </h1>

          {error && (
            <p className="p-danger-text" style={{ fontSize: 13, marginBottom: 12 }}>
              {error}
            </p>
          )}

          <button
            onClick={startSession}
            disabled={loading}
            className="p-btn-primary"
            style={{ width: '100%', padding: '12px 0' }}
          >
            {loading ? 'Starting...' : 'Start check-in'}
          </button>
        </div>

      </div>
    </div>
  );

  // ───────── CHAT ─────────
  if (stage === 'chat') return (
    <div className="p-page">
      <div className="p-page-inner animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
          <p className="p-muted">
            {messages.filter(m => m.role === 'patient').length} responses so far
          </p>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px',
          maxWidth: 700,
          margin: '0 auto',
          width: '100%'
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'patient' ? 'flex-end' : 'flex-start',
              marginBottom: 10
            }}>
              <div style={{
                maxWidth: 320,
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: 13,
                background: msg.role === 'patient' ? 'var(--accent)' : 'var(--bg-card)',
                color: msg.role === 'patient' ? '#fff' : 'var(--text)',
                border: msg.role === 'patient' ? 'none' : '1px solid var(--border)'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className="p-card" style={{ width: 120 }}>
                <div style={{ height: 6, background: 'var(--border)', marginBottom: 6, borderRadius: 4 }} />
                <div style={{ height: 6, background: 'var(--border)', width: '70%', borderRadius: 4 }} />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 10 }}>

            {inputType === 'options' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => sendMessage(opt)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card2)',
                      color: 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type={inputType === 'number' ? 'number' : 'text'}
                  className="p-input"
                  style={{ flex: 1 }}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />

                <button
                  onClick={() => sendMessage()}
                  className="p-btn-primary"
                  style={{ padding: '10px 18px' }}
                >
                  Send
                </button>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );

  // ───────── COMPLETE ─────────
  if (stage === 'complete' && brief) {
    const patientAnswers = messages.filter(m => m.role === 'patient').map(m => m.content);
    const [name, age, gender, blood] = patientAnswers;

    return (
      <div className="p-page">
        <div className="p-page-inner animate-in">
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="p-card" style={{ textAlign: 'center' }}>
              Check-in complete
            </div>

            <div className="p-card">
              <h2 className="p-section">Patient Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>Name<br />{name}</div>
                <div>Age<br />{age}</div>
                <div>Gender<br />{gender}</div>
                <div>Blood Group<br />{blood}</div>
              </div>
            </div>

            <div className="p-card">
              <h2 className="p-section">Doctor Brief</h2>
              <p><strong>Chief:</strong> {brief.chiefComplaint}</p>
              <p><strong>HPI:</strong> {brief.hpi}</p>
              <p><strong>Associated:</strong> {brief.associatedFactors}</p>
              <p><strong>Past:</strong> {brief.pastHistory}</p>
              <p><strong>Impression:</strong> {brief.clinicalImpression}</p>
            </div>

            <div style={{
              padding: 12,
              borderRadius: 12,
              background: 'var(--danger-dim)',
              color: 'var(--danger)',
              border: '1px solid var(--border)'
            }}>
              {brief.urgencyLevel}
            </div>

          </div>
        </div>
      </div>
    );
  }
}