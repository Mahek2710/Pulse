import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const { data } = await api.get('/reports');
      setReports(data);
    } catch { setError('Could not load reports'); }
  }

  async function handleUpload(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file'); return;
    }
    setUploading(true); setError('');
    const form = new FormData();
    form.append('report', file);
    try {
      const { data } = await api.post('/reports/upload', form);
      navigate(`/reports/${data.reportId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  }

  const statusColor = (count) => count === 0
    ? 'bg-green-50 text-green-700 border-green-100'
    : count <= 2 ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-red-50 text-red-700 border-red-100';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reports</h1>
        <p className="text-gray-400 text-sm mb-6">Upload a lab report PDF and Pulse will explain it in plain English</p>

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center mb-6 transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
          onClick={() => document.getElementById('fileInput').click()}
        >
          {uploading ? (
            <div>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-blue-600 font-medium text-sm">Analyzing your report with AI...</p>
              <p className="text-gray-400 text-xs mt-1">This takes about 5–10 seconds</p>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#3B82F6" strokeWidth="1.5">
                  <path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1"/>
                </svg>
              </div>
              <p className="text-gray-700 font-medium text-sm">Drop your PDF here or click to browse</p>
              <p className="text-gray-400 text-xs mt-1">Lab reports, blood work, discharge summaries</p>
            </div>
          )}
          <input id="fileInput" type="file" accept=".pdf" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Reports list */}
        {reports.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No reports yet — upload your first one above</div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r._id} onClick={() => navigate(`/reports/${r._id}`)}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center text-xs font-semibold text-red-400">PDF</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.reportType || r.fileName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(r.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColor(r.abnormalCount)}`}>
                  {r.abnormalCount === 0 ? 'All normal' : `${r.abnormalCount} abnormal`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}