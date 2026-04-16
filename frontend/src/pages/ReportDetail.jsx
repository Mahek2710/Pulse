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

  // ✅ FIXED FILTERING (SAFE)
  const abnormal = (report.extractedValues || []).filter(
    v => ['high', 'low', 'critical'].includes((v?.status || '').toLowerCase())
  );

  const normal = (report.extractedValues || []).filter(
    v => (v?.status || '').toLowerCase() === 'normal'
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/reports')} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-xl font-semibold text-gray-900">{report.reportType}</h1>
          <span className="text-xs text-gray-400">{new Date(report.uploadedAt).toLocaleDateString('en-IN')}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left */}
          <div className="space-y-4">

            {/* Summary */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2">AI Summary</p>
              <p className="text-sm text-gray-700">{report.overallSummary}</p>
            </div>

            {/* Abnormal */}
            {abnormal.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs font-medium text-red-400 mb-3">
                  Needs attention — {abnormal.length}
                </p>

                <div className="space-y-3">
                  {abnormal.map((v, i) => {
                    const s = statusStyles[v?.status] || statusStyles.normal;

                    return (
                      <div key={i} className={`${s.bg} rounded-xl p-3.5`}>
                        <div className="flex justify-between mb-1">
                          <span className={`text-sm font-medium ${s.text}`}>
                            {v?.name || 'Unknown Test'}
                          </span>

                          <div className="flex gap-2">
                            <span className={`text-sm font-semibold ${s.text}`}>
                              {v?.value ?? '-'} {v?.unit || ''}
                            </span>

                            <span className="text-xs px-2 py-0.5 rounded-full bg-white">
                              {s.badge}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500">
                          Normal: {v?.normalRange || '-'}
                        </p>

                        <p className="text-xs text-gray-600 mt-1">
                          {v?.aiExplanation || ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Normal */}
            {normal.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs font-medium text-green-500 mb-3">
                  Normal — {normal.length}
                </p>

                <div className="space-y-2">
                  {normal.map((v, i) => (
                    <div key={i} className="flex justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {v?.name || 'Unknown Test'}
                      </span>

                      <div className="flex gap-3">
                        <span className="text-xs text-gray-400">
                          {v?.normalRange || '-'}
                        </span>

                        <span className="text-sm font-medium">
                          {v?.value ?? '-'} {v?.unit || ''}
                        </span>

                        <span className="text-xs text-green-600 bg-green-50 px-2 rounded-full">
                          Normal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side unchanged */}
          <div className="bg-white border border-gray-100 rounded-2xl flex flex-col" style={{ height: '600px' }}>
            <div className="p-4 border-b">
              <p className="text-sm font-medium">Ask about this report</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {report.qaThread.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 flex gap-2">
              <input
                className="flex-1 border px-3 py-2 rounded-xl"
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
              <button onClick={handleAsk} className="bg-blue-600 text-white px-4 rounded-xl">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}