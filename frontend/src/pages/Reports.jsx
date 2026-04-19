import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

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

import { SkeletonMetrics, SkeletonCard } from '../components/SkeletonLoader';
import PageWrapper from '../components/PageWrapper';

const riskColor = (score) => {
  if (score === null || score === undefined)
    return {
      text: 'p-muted-text',
      bg: 'bg-[var(--bg-card)]',
      label: 'Not computed'
    };

  if (score <= 35)
    return {
      text: 'p-good-text',
      bg: 'bg-[var(--good-dim)]',
      label: 'Low risk'
    };

  if (score <= 60)
    return {
      text: 'p-warn-text',
      bg: 'bg-[var(--warn-dim)]',
      label: 'Moderate risk'
    };

  if (score <= 79)
    return {
      text: 'p-warn-text',
      bg: 'bg-[var(--warn-dim)]',
      label: 'High risk'
    };

  return {
    text: 'p-danger-text',
    bg: 'bg-[var(--danger-dim)]',
    label: 'Critical risk'
  };
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const { data } = await api.get('/patient/dashboard');
      setData(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col gap-5">
          <SkeletonMetrics count={4} />
          <SkeletonCard lines={5} />
        </div>
      </PageWrapper>
    );
  }

  const rc = riskColor(data?.riskScore);

  const riskHistory =
    data?.riskHistory?.map((h) => ({
      date: new Date(h.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      }),
      score: h.score
    })) || [];

  return (
    <div className="p-page">

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

        <div className={`${rc.bg} p-card`}>
          <p className="p-muted mb-1">Risk score</p>
          <p className={`text-3xl font-semibold ${rc.text}`}>
            {data?.riskScore ?? '--'}
          </p>
          <p className={`text-xs ${rc.text}`}>{rc.label}</p>
        </div>

        <div className="p-card">
          <p className="p-muted mb-1">Reports</p>
          <p className="text-3xl font-semibold p-num">
            {data?.reportCount || 0}
          </p>
        </div>

        <div className="p-card">
          <p className="p-muted mb-1">Glucose</p>
          <p className="text-3xl font-semibold p-num">
            {data?.vitals?.glucose || '--'}
          </p>
        </div>

        <div className="p-card">
          <p className="p-muted mb-1">Scenarios</p>
          <p className="text-3xl font-semibold p-num">
            {data?.scenarioCount || 0}
          </p>
        </div>

      </div>

      {/* Chart */}
      {riskHistory.length > 1 && (
        <div className="p-card">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={riskHistory}>

              <CartesianGrid stroke="var(--chart-grid)" />

              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--chart-text)', fontSize: 11 }}
              />

              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--chart-text)', fontSize: 11 }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  color: 'var(--text)'
                }}
              />

              <ReferenceLine y={70} stroke="var(--danger)" />

              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}