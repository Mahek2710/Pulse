import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

import api from '../services/api';
import useAuthStore from '../store/authStore';
import { getChartColors } from '../utils/chartTheme';

import { SkeletonMetrics, SkeletonCard } from '../components/SkeletonLoader';
import PageWrapper from '../components/PageWrapper';

const riskColor = (score) => {
  if (score === null || score === undefined)
    return { text: 'p-muted-text', bg: 'p-card2', label: 'Not computed' };

  if (score <= 35)
    return { text: 'p-good-text', bg: 'p-badge-good', label: 'Low risk' };

  if (score <= 60)
    return { text: 'p-warn-text', bg: 'p-badge-warn', label: 'Moderate risk' };

  if (score <= 79)
    return { text: 'p-warn-text', bg: 'p-badge-bad', label: 'High risk' };

  return { text: 'p-danger-text', bg: 'p-badge-bad', label: 'Critical risk' };
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const C = getChartColors();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const { data } = await api.get('/patient/dashboard');
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <PageWrapper>
      <div className="flex flex-col gap-5 animate-in">
        <SkeletonMetrics count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} showAvatar={false} />
          </div>
          <SkeletonCard lines={6} />
        </div>
      </div>
    </PageWrapper>
  );

  const rc = riskColor(data?.riskScore);

  const riskHistory = data?.riskHistory?.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    }),
    score: h.score
  })) || [];

  return (
    <div className="p-page transition-colors">

      <div className="p-page-inner animate-in">

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="p-title">
              Good{" "}
              {new Date().getHours() < 12
                ? "morning"
                : new Date().getHours() < 17
                ? "afternoon"
                : "evening"}
              , {user?.name?.split(' ')[0]}
            </h1>

            <p className="p-subtitle">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">

          <div className="p-card">
            <p className="p-muted">Risk score</p>

            {data?.riskScore != null ? (
              <>
                <p className={`text-3xl font-bold ${rc.text}`}>
                  {data.riskScore}
                </p>
                <p className={`text-sm ${rc.text}`}>
                  {rc.label}
                </p>
              </>
            ) : (
              <p className="p-muted">Not computed yet</p>
            )}
          </div>

          <div className="p-card">
            <p className="p-muted">Reports</p>
            <p className="text-3xl font-bold">{data?.reportCount || 0}</p>
          </div>

          <div className="p-card">
            <p className="p-muted">Glucose</p>
            <p className="text-3xl font-bold">{data?.vitals?.glucose || '--'}</p>
          </div>

          <div className="p-card">
            <p className="p-muted">Scenarios</p>
            <p className="text-3xl font-bold">{data?.scenarioCount || 0}</p>
          </div>

        </div>

        {/* Chart */}
        {riskHistory.length > 1 && (
          <div className="p-card">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={riskHistory}>

                <CartesianGrid stroke={C.grid} />

                <XAxis
                  dataKey="date"
                  tick={{ fill: C.text, fontSize: 11 }}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: C.text, fontSize: 11 }}
                />

                <Tooltip />

                <ReferenceLine y={70} stroke={C.danger} />

                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={C.accent}
                  strokeWidth={2}
                />

              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}