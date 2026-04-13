import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const statusStyles = {
  normal:   { bg: 'bg-green-50',  text: 'text-green-700',  badge: 'Normal' },
  low:      { bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'Low' },
  high:     { bg: 'bg-red-50',    text: 'text-red-700',    badge: 'High' },
  critical: { bg: 'bg-red-100',   text: 'text-red-800',    badge: 'Critical' }
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
    } catch { setError('Could not load report'); }
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
    } finally { setAsking(false); }
  }

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!report) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const abnormal = report.extractedValues?.filter(v => v.status !== 'normal') || [];
  const normal = report.extractedValues?.filter(v => v.status === 'normal') || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/reports')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-xl font-semibold text-gray-900">{report.reportType}</h1>
          <span className="text-xs text-gray-400">{new Date(report.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left: Values */}
          <div className="space-y-4">

            {/* Summary */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">AI Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed">{report.overallSummary}</p>
            </div>

            {/* Abnormal values */}
            {abnormal.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-3">Needs attention — {abnormal.length} value{abnormal.length > 1 ? 's' : ''}</p>
                <div className="space-y-3">
                  {abnormal.map((v, i) => {
                    const s = statusStyles[v.status] || statusStyles.normal;
                    return (
                      <div key={i} className={`${s.bg} rounded-xl p-3.5`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${s.text}`}>{v.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${s.text}`}>{v.value} {v.unit}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.text} bg-white bg-opacity-60`}>{s.badge}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Normal: {v.normalRange}</p>
                        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{v.aiExplanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Normal values */}
            {normal.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs font-medium text-green-500 uppercase tracking-wide mb-3">Normal — {normal.length} value{normal.length > 1 ? 's' : ''}</p>
                <div className="space-y-2">
                  {normal.map((v, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{v.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{v.normalRange}</span>
                        <span className="text-sm font-medium text-gray-800">{v.value} {v.unit}</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Normal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Q&A chat */}
          <div className="bg-white border border-gray-100 rounded-2xl flex flex-col" style={{ height: '600px' }}>
            <div className="p-4 border-b border-gray-50">
              <p className="text-sm font-medium text-gray-800">Ask about this report</p>
              <p className="text-xs text-gray-400 mt-0.5">Powered by AI — ask anything in plain English</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {report.qaThread.length === 0 && (
                <div className="space-y-2 pt-4">
                  <p className="text-xs text-gray-400 text-center mb-4">Try asking:</p>
                  {['What does my glucose level mean?', 'Should I be worried about anything?', 'What lifestyle changes could help?'].map(q => (
                    <button key={q} onClick={() => setQuestion(q)}
                      className="w-full text-left text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2.5 rounded-xl transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {report.qaThread.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-50 text-gray-700 rounded-tl-sm border border-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-50 flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-400"
                placeholder="Ask a question..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                disabled={asking}
              />
              <button onClick={handleAsk} disabled={asking || !question.trim()}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}