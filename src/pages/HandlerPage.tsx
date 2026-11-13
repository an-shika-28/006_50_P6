import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert, UserCheck } from 'lucide-react';
import { useAuth } from '../components/AppShell';
import { CategoryBadge, CorridorBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { ReportTimeline } from '../components/ReportTimeline';
import { api } from '../services/api';
import type { HandlerAvailability, HandlerRecord, ReportRecord } from '../types/metropulse';
import { formatTimestamp } from '../utils/validation';

export function HandlerPage() {
  const { user, loading: authLoading, openLoginModal, loginWithCredentials } = useAuth();
  const [handlers, setHandlers] = useState<HandlerRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [zoneFilter, setZoneFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.getHandlers(zoneFilter),
      api.getStaffReports({ zone: zoneFilter, status: statusFilter, sort_by: sortBy }),
    ])
      .then(([hRes, rRes]) => {
        setHandlers(hRes.handlers);
        setReports(rRes.reports);
        if (selectedReport) {
          const updated = rRes.reports.find((r) => r.id === selectedReport.id);
          if (updated) setSelectedReport(updated);
        }
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : 'Failed to load operations data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [user, zoneFilter, statusFilter, sortBy]);

  if (authLoading) {
    return (
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-12 space-y-4">
        <div className="h-10 w-72 bg-[#EFE8DA] animate-pulse rounded-sm" />
        <div className="h-64 bg-[#EFE8DA] animate-pulse rounded-sm" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-[#D9CDBB] rounded-sm p-8 space-y-5 text-center">
          <div className="w-12 h-12 mx-auto bg-[#3D2E20] text-[#F4D9A0] flex items-center justify-center rounded-sm">
            <UserCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D261F]">
            Handler Operations Console
          </h1>
          <p className="text-sm text-[#6E6255]">
            Staff authorization is required to view private reporter details, update incident lifecycle statuses, or modify handler availability and capacity limits.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loginWithCredentials('handler@metropulse.edu', 'metro-ops-2026')}
              className="px-5 py-2.5 bg-[#C8792C] hover:bg-[#B26821] text-white text-xs font-bold uppercase tracking-wider rounded-sm"
            >
              Quick Demo Handler Sign-In
            </button>
            <button
              type="button"
              onClick={() => openLoginModal('handler')}
              className="px-5 py-2.5 bg-[#EFE8DA] hover:bg-[#D9CDBB] text-[#2D261F] text-xs font-bold uppercase tracking-wider rounded-sm"
            >
              Open Login Modal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAvailabilityChange = async (h: HandlerRecord, availability: HandlerAvailability) => {
    setActionError('');
    setActionMsg('');
    try {
      const res = await api.updateHandlerAvailability(h.id, availability);
      setActionMsg(res.message);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update availability');
    }
  };

  const handleCapacityChange = async (h: HandlerRecord, delta: number) => {
    const nextCap = Math.max(0, Math.min(25, h.capacity_limit + delta));
    setActionError('');
    setActionMsg('');
    try {
      const res = await api.updateHandlerCapacity(h.id, nextCap);
      setActionMsg(res.message);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update capacity');
    }
  };

  const handleStatusTransition = async (report: ReportRecord, nextStatus: 'In Progress' | 'Resolved') => {
    setActionError('');
    setActionMsg('');
    try {
      const res = await api.updateReportStatus(
        report.id,
        nextStatus,
        `Updated by ${user.display_name} via Handler Console.`
      );
      setActionMsg(res.message);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D9CDBB] pb-6">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1">
            Signed In: {user.display_name} ({user.role})
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2D261F]">
            Handler Operations Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by corridor zone"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold text-[#2D261F]"
          >
            <option value="All">All Corridors</option>
            <option value="East">East Corridor</option>
            <option value="West">West Corridor</option>
            <option value="Central">Central Corridor</option>
          </select>

          <select
            aria-label="Filter by report status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold text-[#2D261F]"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            aria-label="Sort reports"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white border border-[#D9CDBB] rounded-sm text-xs font-semibold text-[#2D261F]"
          >
            <option value="created_at">Sort: Newest First</option>
            <option value="priority">Sort: Highest Priority</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#5B4632] text-[#F4D9A0] text-xs font-semibold rounded-sm hover:bg-[#3D2E20]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 bg-[#2E8057]/12 border border-[#2E8057] text-xs font-medium text-[#1F5E3F] rounded-sm">
          {actionMsg}
        </div>
      )}
      {actionError && (
        <div role="alert" className="p-3.5 bg-[#C83D3D]/10 border border-[#C83D3D] text-xs font-medium text-[#9F2929] rounded-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Handler Capacity & Availability Operations Table */}
      <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB] flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-[#2D261F]">
            Corridor Handler Capacity &amp; Availability Controls
          </h2>
          <span className="text-xs text-[#6E6255]">
            Handlers cannot be auto-assigned beyond Capacity Limit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Handler</th>
                <th className="py-3 px-4">Zone &amp; Specialization</th>
                <th className="py-3 px-4">Active Load / Capacity</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-right">Adjust Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DA]">
              {handlers.map((h) => {
                const loadPct = h.capacity_limit > 0 ? Math.min(100, Math.round((h.active_load / h.capacity_limit) * 100)) : 100;
                return (
                  <tr key={h.id} className="hover:bg-[#F8F4EC]/70">
                    <td className="py-3 px-4 font-mono font-bold text-[#2D261F] whitespace-nowrap">
                      {h.handler_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2D261F]">{h.name}</div>
                      <div className="text-[#6E6255]">{h.team}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CorridorBadge zone={h.zone} />
                        <span className="font-medium text-[#2D261F]">{h.specialization}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 min-w-[180px]">
                      <div className="flex items-center justify-between font-mono tabular-nums mb-1">
                        <span className={h.active_load >= h.capacity_limit ? 'text-[#C83D3D] font-bold' : 'text-[#2D261F]'}>
                          {h.active_load} / {h.capacity_limit}
                        </span>
                        <span className="text-[#6E6255]">{loadPct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#EFE8DA] overflow-hidden rounded-sm">
                        <div
                          className={`h-full ${
                            h.active_load >= h.capacity_limit ? 'bg-[#C83D3D]' : 'bg-[#2E8057]'
                          }`}
                          style={{ width: `${loadPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex border border-[#D9CDBB] rounded-sm overflow-hidden">
                        {(['Available', 'Busy', 'Offline'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAvailabilityChange(h, st)}
                            className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              h.availability === st
                                ? st === 'Available'
                                  ? 'bg-[#2E8057] text-white'
                                  : st === 'Busy'
                                  ? 'bg-[#C8792C] text-white'
                                  : 'bg-[#5B4632] text-[#F4D9A0]'
                                : 'bg-white text-[#6E6255] hover:bg-[#F8F4EC]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 font-mono">
                        <button
                          type="button"
                          onClick={() => handleCapacityChange(h, -1)}
                          aria-label={`Decrease capacity for ${h.name}`}
                          className="w-7 h-7 bg-[#EFE8DA] hover:bg-[#D9CDBB] text-[#2D261F] font-bold rounded-sm"
                        >
                          -
                        </button>
                        <span className="w-6 text-center tabular-nums font-bold">{h.capacity_limit}</span>
                        <button
                          type="button"
                          onClick={() => handleCapacityChange(h, 1)}
                          aria-label={`Increase capacity for ${h.name}`}
                          className="w-7 h-7 bg-[#EFE8DA] hover:bg-[#D9CDBB] text-[#2D261F] font-bold rounded-sm"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Assigned Reports Operations Table + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${selectedReport ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white border border-[#D9CDBB] rounded-sm overflow-hidden`}>
          <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB] flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#2D261F]">
              Operational Incident Queue ({reports.length})
            </h2>
            {loading && <span className="text-xs text-[#6E6255]">Syncing...</span>}
          </div>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6E6255]">
              No reports match the current filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                    <th className="py-3 px-4">Report</th>
                    <th className="py-3 px-4">Zone / Category</th>
                    <th className="py-3 px-4">Priority / Status</th>
                    <th className="py-3 px-4">Assigned Handler</th>
                    <th className="py-3 px-4 text-right">Lifecycle Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DA]">
                  {reports.map((rep) => (
                    <tr
                      key={rep.id}
                      className={`hover:bg-[#F8F4EC] ${
                        selectedReport?.id === rep.id ? 'bg-[#F4D9A0]/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="font-mono font-bold text-[#2D261F] hover:text-[#C8792C] underline-offset-2 hover:underline text-left"
                        >
                          {rep.report_code}
                        </button>
                        <div className="font-mono text-[11px] text-[#6E6255]">
                          {rep.station_code} · {formatTimestamp(rep.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-semibold text-[#2D261F]">{rep.zone}</div>
                          <CategoryBadge category={rep.category} />
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <PriorityBadge priority={rep.priority} />
                          <div>
                            <StatusBadge status={rep.status} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="truncate font-medium text-[#2D261F]">
                          {rep.assignment?.target_label || rep.queue_item?.queue_type || 'Pending'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {rep.status === 'Assigned' && (
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(rep, 'In Progress')}
                              className="px-2.5 py-1.5 bg-[#C8792C] hover:bg-[#B26821] text-white font-semibold rounded-sm"
                            >
                              Start Work
                            </button>
                          )}
                          {rep.status === 'In Progress' && (
                            <button
                              type="button"
                              onClick={() => handleStatusTransition(rep, 'Resolved')}
                              className="px-2.5 py-1.5 bg-[#2E8057] hover:bg-[#236645] text-white font-semibold rounded-sm"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedReport(rep)}
                            className="px-2.5 py-1.5 border border-[#D9CDBB] hover:bg-[#EFE8DA] text-[#2D261F] font-semibold rounded-sm"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedReport && (
          <div className="lg:col-span-5 bg-white border border-[#5B4632] rounded-sm p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#EFE8DA] pb-3">
              <div>
                <div className="text-xs font-mono text-[#6E6255]">SELECTED INCIDENT</div>
                <h3 className="font-mono font-bold text-xl text-[#2D261F]">
                  {selectedReport.report_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-xs font-semibold text-[#6E6255] hover:text-[#2D261F]"
              >
                Close
              </button>
            </div>

            <div className="text-xs space-y-1.5 bg-[#F8F4EC] border border-[#D9CDBB] p-3.5 rounded-sm">
              <div>
                <strong>Reporter (Staff View):</strong> {selectedReport.reporter_name} ({selectedReport.reporter_contact})
              </div>
              <div>
                <strong>Station / Location:</strong> {selectedReport.station_code}{' '}
                {selectedReport.location_detail ? `· ${selectedReport.location_detail}` : ''}
              </div>
              <div>
                <strong>Description:</strong> {selectedReport.description}
              </div>
            </div>

            <ReportTimeline
              currentStatus={selectedReport.status}
              history={selectedReport.status_history}
            />
          </div>
        )}
      </div>
    </div>
  );
}
