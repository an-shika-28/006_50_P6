import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { ReportRecord } from '../types/metropulse';
import { formatTimestamp } from '../utils/validation';
import { CategoryBadge, PriorityBadge, StatusBadge } from './Badges';

export function IncidentBoard() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [zoneFilter, setZoneFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBoard = () => {
    setLoading(true);
    setError('');
    api
      .getPublicReports({ zone: zoneFilter === 'All' ? undefined : zoneFilter, limit: 12 })
      .then((res) => setReports(Array.isArray(res?.reports) ? res.reports : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to fetch incident board'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBoard();
  }, [zoneFilter]);

  return (
    <section className="max-w-[1380px] mx-auto px-4 sm:px-6 pb-16">
      <div className="bg-[#231A12] text-[#F4D9A0] border border-[#5B4632] rounded-sm overflow-hidden">
        {/* Departure Board Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#2D2217] border-b border-[#5B4632] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#C8792C]">
              Live Station Departure-Style Feed
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F4D9A0]">
              Live Incident Operations Board
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#231A12] border border-[#5B4632] p-1 rounded-sm">
              {['All', 'East', 'West', 'Central'].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoneFilter(z)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors ${
                    zoneFilter === z
                      ? 'bg-[#C8792C] text-white'
                      : 'text-[#F4D9A0]/75 hover:text-[#F4D9A0]'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadBoard}
              aria-label="Refresh live incident board"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#3D2E20] hover:bg-[#5B4632] text-[#F4D9A0] border border-[#5B4632] rounded-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Board Table */}
        {error ? (
          <div className="p-6 text-sm text-[#F4D9A0] bg-[#C83D3D]/20">{error}</div>
        ) : loading ? (
          <div className="p-6 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-[#2D2217] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[#F4D9A0]/80">
              No anomaly reports recorded for {zoneFilter === 'All' ? 'any corridor' : `${zoneFilter} Corridor`} yet.
            </p>
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C8792C] text-white text-xs font-semibold rounded-sm hover:bg-[#B26821]"
            >
              Submit First Incident Report
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#5B4632] bg-[#1C140E] text-[11px] font-mono uppercase tracking-wider text-[#F4D9A0]/70">
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">Station</th>
                  <th className="py-3 px-4">Corridor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5B4632]/60 text-sm">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#2D2217]/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#F4D9A0] whitespace-nowrap">
                      {rep.report_code}
                      {rep.is_demo && (
                        <span className="ml-2 text-[10px] font-normal text-[#F4D9A0]/60">DEMO</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#F4D9A0] whitespace-nowrap">
                      {rep.station_code}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#F4D9A0]/85 whitespace-nowrap">
                      {rep.zone}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <CategoryBadge category={rep.category} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={rep.priority} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#F4D9A0]/75 tabular-nums whitespace-nowrap">
                      {formatTimestamp(rep.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/track?code=${encodeURIComponent(rep.report_code)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#F4D9A0] hover:text-[#C8792C]"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
