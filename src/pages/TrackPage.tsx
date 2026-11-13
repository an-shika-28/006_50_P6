import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Search } from 'lucide-react';
import { api } from '../services/api';
import type { ReportRecord } from '../types/metropulse';
import { formatTimestamp } from '../utils/validation';
import { CategoryBadge, CorridorBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { ReportTimeline } from '../components/ReportTimeline';

export function TrackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [query, setQuery] = useState(initialCode);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [recentReports, setRecentReports] = useState<ReportRecord[]>([]);
  const [summary, setSummary] = useState<{
    total_reports: number;
    pending_reports: number;
    assigned_reports: number;
    in_progress_reports: number;
    resolved_reports: number;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const loadOverview = () => {
    api.getSummary().then(setSummary).catch(() => {});
    api
      .getPublicReports({ limit: 15 })
      .then((res) => setRecentReports(Array.isArray(res?.reports) ? res.reports : []))
      .catch(() => {});
  };

  const fetchByCode = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setSearching(true);
    setSearchError('');
    try {
      const res = await api.trackReport(clean);
      setSelectedReport(res.report);
      setSearchParams({ code: clean });
    } catch (err) {
      setSelectedReport(null);
      setSearchError(err instanceof Error ? err.message : 'Report not found.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    loadOverview();
    if (initialCode) {
      fetchByCode(initialCode);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchByCode(query);
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header + Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#D9CDBB] pb-6">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1">
            Passenger &amp; Reporter Portal
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2D261F]">
            User Dashboard &amp; Report Tracking
          </h1>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex w-full lg:w-auto gap-2">
          <label htmlFor="report-id-search" className="sr-only">
            Search by Unique Report ID
          </label>
          <input
            id="report-id-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Report ID (e.g., MP-DEMO-1001)"
            className="w-full sm:w-80 px-3.5 py-2.5 bg-white border border-[#D9CDBB] rounded-sm font-mono text-sm uppercase text-[#2D261F] focus:border-[#C8792C]"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5B4632] hover:bg-[#3D2E20] disabled:opacity-50 text-[#F4D9A0] text-xs font-bold uppercase tracking-wider rounded-sm whitespace-nowrap"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>{searching ? 'Searching...' : 'Track'}</span>
          </button>
        </form>
      </div>

      {/* Database-Backed Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
            <div className="text-xs text-[#6E6255]">Total Reports</div>
            <div className="font-mono text-2xl font-bold text-[#2D261F] tabular-nums mt-1">
              {summary.total_reports}
            </div>
          </div>
          <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
            <div className="text-xs text-[#6E6255]">Pending / Queued</div>
            <div className="font-mono text-2xl font-bold text-[#5B4632] tabular-nums mt-1">
              {summary.pending_reports}
            </div>
          </div>
          <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
            <div className="text-xs text-[#6E6255]">Assigned &amp; In Progress</div>
            <div className="font-mono text-2xl font-bold text-[#C8792C] tabular-nums mt-1">
              {summary.assigned_reports + summary.in_progress_reports}
            </div>
          </div>
          <div className="bg-white border border-[#D9CDBB] rounded-sm p-4">
            <div className="text-xs text-[#6E6255]">Resolved Reports</div>
            <div className="font-mono text-2xl font-bold text-[#2E8057] tabular-nums mt-1">
              {summary.resolved_reports}
            </div>
          </div>
        </div>
      )}

      {searchError && (
        <div role="alert" className="p-4 bg-[#C83D3D]/10 border border-[#C83D3D] rounded-sm text-sm text-[#9F2929] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{searchError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Reports Table */}
        <div className="lg:col-span-5 bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB] flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#2D261F]">
              Recent Station Reports
            </h2>
            <Link to="/report" className="text-xs font-semibold text-[#C8792C] hover:underline">
              + New Report
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div className="p-6 text-xs text-[#6E6255]">No reports submitted yet.</div>
          ) : (
            <div className="divide-y divide-[#EFE8DA]">
              {recentReports.map((rep) => {
                const active = selectedReport?.report_code === rep.report_code;
                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => {
                      setQuery(rep.report_code);
                      fetchByCode(rep.report_code);
                    }}
                    className={`w-full text-left px-5 py-3.5 hover:bg-[#F8F4EC] transition-colors flex items-center justify-between gap-3 ${
                      active ? 'bg-[#F4D9A0]/25' : ''
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2D261F]">
                          {rep.report_code}
                        </span>
                        <span className="font-mono text-xs text-[#6E6255]">{rep.station_code}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CategoryBadge category={rep.category} />
                        <PriorityBadge priority={rep.priority} />
                      </div>
                    </div>
                    <StatusBadge status={rep.status} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Report Details + Timeline */}
        <div className="lg:col-span-7 bg-white border border-[#D9CDBB] rounded-sm p-6">
          {selectedReport ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFE8DA] pb-4">
                <div>
                  <div className="text-xs font-mono text-[#6E6255] mb-1">
                    {selectedReport.is_demo ? 'DEMO SEED RECORD · ' : ''}SUBMITTED {formatTimestamp(selectedReport.created_at)}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#2D261F] font-mono">
                    {selectedReport.report_code}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={selectedReport.priority} />
                  <StatusBadge status={selectedReport.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
                  <div className="text-[#6E6255]">Station &amp; Corridor</div>
                  <div className="font-mono font-bold text-sm text-[#2D261F] mt-1">
                    {selectedReport.station_code}
                  </div>
                  <div className="mt-1.5">
                    <CorridorBadge zone={selectedReport.zone} />
                  </div>
                </div>

                <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
                  <div className="text-[#6E6255]">Category &amp; Code</div>
                  <div className="mt-1.5">
                    <CategoryBadge category={selectedReport.category} />
                  </div>
                  <div className="font-mono text-[11px] text-[#6E6255] mt-1">
                    Anomaly {selectedReport.anomaly_code} · {selectedReport.matched_rule_id}
                  </div>
                </div>

                <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
                  <div className="text-[#6E6255]">Assigned Handler / Target</div>
                  <div className="font-semibold text-sm text-[#2D261F] mt-1">
                    {selectedReport.assignment?.target_label ||
                      (selectedReport.queue_item
                        ? `${selectedReport.queue_item.queue_type} Queue`
                        : 'Pending Assignment')}
                  </div>
                  <div className="text-[11px] text-[#6E6255] mt-1">
                    Urgency: {selectedReport.urgency}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B4632]">
                  Incident Details
                </h3>
                <p className="text-sm text-[#2D261F] leading-relaxed bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm p-4">
                  {selectedReport.description}
                </p>
                {selectedReport.location_detail && (
                  <p className="text-xs text-[#6E6255]">
                    Location detail: <strong className="text-[#2D261F]">{selectedReport.location_detail}</strong>
                  </p>
                )}
              </div>

              <ReportTimeline
                currentStatus={selectedReport.status}
                history={selectedReport.status_history}
              />
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <p className="font-display text-base font-bold text-[#2D261F]">
                Select a Report or Search by Unique Report ID
              </p>
              <p className="text-xs text-[#6E6255] max-w-md mx-auto">
                Click any report on the left or enter a Report ID above (for example, MP-DEMO-1001) to view full routing details and the status timeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
