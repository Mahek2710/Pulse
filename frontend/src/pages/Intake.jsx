import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const urgencyConfig = {
  low:       { color: 'bg-green-50 border-green-100 text-green-700',  dot: 'bg-green-500',  label: 'Low urgency' },
  moderate:  { color: 'bg-amber-50 border-amber-100 text-amber-700',  dot: 'bg-amber-500',  label: 'Moderate urgency' },
  high:      { color: 'bg-red-50 border-red-100 text-red-700',        dot: 'bg-red-500',    label: 'High urgency' },
  emergency: { color: 'bg-red-100 border-red-200 text-red-800',       dot: 'bg-red-600',    label: 'Emergency' }
};

export default function Intake() {
  const [stage, setStage] = useState('start');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState('');

  // ✅ NEW
  const [inputType, setInputType] = useState('text');
  const [options, setOptions] = useState([]);

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  // auto focus
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  // auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // detect input type
  function detectInputType(question) {
    const q = question.toLowerCase();

    if (q.includes('gender')) {
      return {
        type: 'options',
        options: ['Male', 'Female', 'Other']
      };
    }

    if (q.includes('blood')) {
      return {
        type: 'options',
        options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "I don't know"]
      };
    }

    if (q.includes('age')) {
      return { type: 'number' };
    }

    return { type: 'text' };
  }

  async function startSession() {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/intake/start');

      const firstQ = data.question;

      setSessionId(data.sessionId);
      setMessages([{ role: 'ai', content: firstQ }]);

      const config = detectInputType(firstQ);
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
        const nextQ = data.question;

        setMessages(prev => [...prev, { role: 'ai', content: nextQ }]);

        const config = detectInputType(nextQ);
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

  // START
  if (stage === 'start') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-2">Pre-consultation check-in</h1>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button onClick={startSession} disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl">
          {loading ? 'Starting...' : 'Start check-in'}
        </button>
      </div>
    </div>
  );

  // CHAT
  if (stage === 'chat') return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-white border-b px-6 py-4">
        <p className="text-sm">
          {messages.filter(m => m.role === 'patient').length} responses so far
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm ${
              msg.role === 'patient'
                ? 'bg-blue-600 text-white'
                : 'bg-white border'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">

          {inputType === 'options' ? (
            <div className="flex flex-wrap gap-2">
              {options.map(opt => (
                <button
                  key={opt}
                  onClick={() => sendMessage(opt)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm"
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
                className="flex-1 border rounded-xl px-4 py-3 text-sm"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button onClick={() => sendMessage()}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl">
                Send
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );

  // COMPLETE
  if (stage === 'complete' && brief) {
    const urg = urgencyConfig[brief.urgencyLevel] || urgencyConfig.low;

    const patientAnswers = messages
      .filter(m => m.role === 'patient')
      .map(m => m.content);

    const [name, age, gender, blood] = patientAnswers;

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="bg-green-50 border rounded-2xl p-4 text-center">
            Check-in complete
          </div>

          <div className="bg-white border rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Patient Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Name<br />{name}</div>
              <div>Age<br />{age}</div>
              <div>Gender<br />{gender}</div>
              <div>Blood Group<br />{blood}</div>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold">Doctor Brief</h2>
            <p><strong>Chief:</strong> {brief.chiefComplaint}</p>
            <p><strong>HPI:</strong> {brief.hpi}</p>
            <p><strong>Associated:</strong> {brief.associatedFactors}</p>
            <p><strong>Past:</strong> {brief.pastHistory}</p>
            <p><strong>Impression:</strong> {brief.clinicalImpression}</p>
          </div>

          <div className={`p-4 rounded-xl ${urg.color}`}>
            {urg.label}
          </div>

        </div>
      </div>
    );
  }
}