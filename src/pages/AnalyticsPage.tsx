import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import type { AnalyticsData } from '../types/metropulse';

const CATEGORY_COLORS: Record<string, string> = {
  Safety: '#C8792C',
  Technical: '#5B4632',
  Crowd: '#D4A857',
  Cleanliness: '#8C7A68',
  Medical: '#C83D3D',
};

const STATUS_COLORS: Record<string, string> = {
  Pending: '#8C7A68',
  Assigned: '#D4A857',
  'In Progress': '#C8792C',
  Resolved: '#2E8057',
};

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [zone, setZone] = useState('All');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [days, setDays] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getAnalytics({ zone, category, status, days })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load analytics'))
      .finally(() => setLoading(false));
  }, [zone, category, status, days]);

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#D9CDBB] pb-6">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1">
            Database-Backed Operational Telemetry
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2D261F]">
            Operations Analytics Dashboard
          </h1>
        </div>

        {/* Multi-Dimensional Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by date range"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold"
          >
            <option value="all">All Time</option>
            <option value="1">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
          </select>

          <select
            aria-label="Filter by corridor zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold"
          >
            <option value="All">All Corridors</option>
            <option value="East">East Corridor</option>
            <option value="West">West Corridor</option>
            <option value="Central">Central Corridor</option>
          </select>

          <select
            aria-label="Filter by anomaly category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold"
          >
            <option value="All">All Categories</option>
            <option value="Safety">Safety</option>
            <option value="Technical">Technical</option>
            <option value="Crowd">Crowd</option>
            <option value="Cleanliness">Cleanliness</option>
            <option value="Medical">Medical</option>
          </select>

          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-[#C83D3D]/10 border border-[#C83D3D] text-sm text-[#9F2929] rounded-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-[#EFE8DA] animate-pulse rounded-sm" />
          <div className="h-72 bg-[#EFE8DA] animate-pulse rounded-sm" />
        </div>
      ) : data && data.total_matching === 0 ? (
        <div className="bg-white border border-[#D9CDBB] rounded-sm p-12 text-center space-y-2">
          <h2 className="font-display text-lg font-bold text-[#2D261F]">
            No Reports Match Selected Filters
          </h2>
          <p className="text-xs text-[#6E6255]">
            Analytics derive strictly from persisted SQLite records. Adjust filters or submit new anomaly reports to visualize metrics.
          </p>
        </div>
      ) : (
        data && (
          <>
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
                <div className="text-xs text-[#6E6255]">Matching Reports</div>
                <div className="font-mono text-2xl font-bold text-[#2D261F] tabular-nums mt-1">
                  {data.total_matching}
                </div>
              </div>
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
                <div className="text-xs text-[#6E6255]">Resolved</div>
                <div className="font-mono text-2xl font-bold text-[#2E8057] tabular-nums mt-1">
                  {data.resolved_count}
                </div>
              </div>
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
                <div className="text-xs text-[#6E6255]">Unresolved Active</div>
                <div className="font-mono text-2xl font-bold text-[#C8792C] tabular-nums mt-1">
                  {data.unresolved_count}
                </div>
              </div>
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
                <div className="text-xs text-[#6E6255]">Avg Resolution Duration</div>
                <div className="font-mono text-2xl font-bold text-[#5B4632] tabular-nums mt-1">
                  {data.avg_resolution_minutes !== null ? `${data.avg_resolution_minutes} min` : '—'}
                </div>
              </div>
            </div>

            {/* Recharts Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Zone-Wise Distribution */}
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-5">
                <h2 className="font-display text-sm font-bold text-[#2D261F] mb-1">
                  Corridor-Wise Report Distribution
                </h2>
                <p className="text-xs text-[#6E6255] mb-4">East vs West vs Central volume</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.by_zone} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DA" />
                      <XAxis dataKey="zone" tick={{ fill: '#2D261F', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#6E6255', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Reports" fill="#5B4632" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category-Wise Donut Chart */}
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-5">
                <h2 className="font-display text-sm font-bold text-[#2D261F] mb-1">
                  Category-Wise Breakdown
                </h2>
                <p className="text-xs text-[#6E6255] mb-4">
                  Five deterministic anomaly categories (Medical highlighted in Red)
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.by_category.filter((c) => c.count > 0)}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {data.by_category
                          .filter((c) => c.count > 0)
                          .map((entry) => (
                            <Cell
                              key={entry.category}
                              fill={CATEGORY_COLORS[entry.category] || '#5B4632'}
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown Chart */}
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-5">
                <h2 className="font-display text-sm font-bold text-[#2D261F] mb-1">
                  Lifecycle Status Distribution
                </h2>
                <p className="text-xs text-[#6E6255] mb-4">
                  Pending, Assigned, In Progress, and Resolved
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.by_status} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DA" />
                      <XAxis dataKey="status" tick={{ fill: '#2D261F', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#6E6255', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Reports" radius={[2, 2, 0, 0]}>
                        {data.by_status.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#5B4632'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Handler Load vs Capacity */}
              <div className="bg-white border border-[#D9CDBB] rounded-sm p-5">
                <h2 className="font-display text-sm font-bold text-[#2D261F] mb-1">
                  Handler Active Load vs Capacity Limit
                </h2>
                <p className="text-xs text-[#6E6255] mb-4">Real-time SQLite handler utilization</p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.handler_utilization} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DA" />
                      <XAxis dataKey="handler_code" tick={{ fill: '#2D261F', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#6E6255', fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="active_load" name="Active Load" fill="#C8792C" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="capacity_limit" name="Capacity Limit" fill="#D9CDBB" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
