import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, Route as RouteIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../components/AppShell';
import { CategoryBadge, CorridorBadge, PriorityBadge } from '../components/Badges';
import { api } from '../services/api';
import type {
  DispatchLogItem,
  HandlerRecord,
  QueueRecord,
  RoutingTableData,
} from '../types/metropulse';
import { formatTimestamp } from '../utils/validation';

export function RoutingPage() {
  const { user, loading: authLoading, openLoginModal, loginWithCredentials } = useAuth();
  const [routingTable, setRoutingTable] = useState<RoutingTableData | null>(null);
  const [handlers, setHandlers] = useState<HandlerRecord[]>([]);
  const [queues, setQueues] = useState<QueueRecord[]>([]);
  const [logs, setLogs] = useState<DispatchLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'queues' | 'logs'>('table');
  const [newPrefix, setNewPrefix] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newZone, setNewZone] = useState<'East' | 'West' | 'Central'>('East');
  const [assignHandlerMap, setAssignHandlerMap] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadAll = () => {
    if (!user) return;
    setErr('');
    Promise.all([
      api.getRoutingTable(),
      api.getHandlers(),
      api.getQueues(),
      api.getDispatchLogs(100),
    ])
      .then(([rt, hRes, qRes, lRes]) => {
        setRoutingTable(rt);
        setHandlers(hRes.handlers);
        setQueues(qRes.queues);
        setLogs(lRes.logs);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Unable to fetch routing console data.'));
  };

  useEffect(() => {
    loadAll();
  }, [user]);

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
            <RouteIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D261F]">
            Routing Management Dashboard
          </h1>
          <p className="text-sm text-[#6E6255]">
            Sign in with staff or Routing Admin credentials to inspect explicit station-prefix routing tables, handler loads, fallback queues, and dispatch audit logs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loginWithCredentials('admin@metropulse.edu', 'metro-admin-2026')}
              className="px-5 py-2.5 bg-[#C8792C] hover:bg-[#B26821] text-white text-xs font-bold uppercase tracking-wider rounded-sm"
            >
              Quick Demo Routing Admin Sign-In
            </button>
            <button
              type="button"
              onClick={() => openLoginModal('admin')}
              className="px-5 py-2.5 bg-[#EFE8DA] hover:bg-[#D9CDBB] text-[#2D261F] text-xs font-bold uppercase tracking-wider rounded-sm"
            >
              Open Login Modal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  const handleAddPrefix = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await api.addStationRoute({
        station_prefix: newPrefix,
        station_label: newLabel,
        zone: newZone,
      });
      setMsg(`Added station prefix ${newPrefix.toUpperCase()} -> ${newZone} Corridor.`);
      setNewPrefix('');
      setNewLabel('');
      loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to add station prefix');
    }
  };

  const handleToggleStation = async (id: number, enabled: boolean) => {
    setMsg('');
    setErr('');
    try {
      const res = await api.toggleStationRoute(id, !enabled);
      setMsg(res.message);
      loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handlePriorityChange = async (ruleId: number, priority: string) => {
    setMsg('');
    setErr('');
    try {
      const res = await api.updateRoutingRule(ruleId, { priority });
      setMsg(res.message);
      loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update rule priority');
    }
  };

  const handleManualAssign = async (reportId: number) => {
    const handlerId = assignHandlerMap[reportId] || handlers[0]?.id;
    if (!handlerId) return;
    setMsg('');
    setErr('');
    try {
      const res = await api.manualAssignQueued(reportId, handlerId, true);
      setMsg(res.message);
      loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Manual dispatch failed');
    }
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D9CDBB] pb-6">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1">
            Control Room · {isAdmin ? 'Admin Configuration Enabled' : 'Read-Only Staff View'}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2D261F]">
            Routing &amp; Dispatch Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-[#EFE8DA] border border-[#D9CDBB] p-1 rounded-sm">
            {[
              { id: 'table', label: 'Routing Tables' },
              { id: 'queues', label: `Queues (${queues.filter((q) => q.state === 'Queued').length})` },
              { id: 'logs', label: `Dispatch Logs (${logs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'table' | 'queues' | 'logs')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'bg-[#5B4632] text-[#F4D9A0]' : 'text-[#5B4632] hover:bg-[#F8F4EC]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#5B4632] text-[#F4D9A0] text-xs font-semibold rounded-sm hover:bg-[#3D2E20]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-[#F4D9A0]/35 border border-[#C8792C]/60 rounded-sm text-xs flex flex-wrap items-center justify-between gap-3">
          <span>
            Signed in as <strong>Handler</strong>. Sign in as <strong>Routing Admin</strong> to edit station prefixes, routing rules, or override queued reports.
          </span>
          <button
            type="button"
            onClick={() => loginWithCredentials('admin@metropulse.edu', 'metro-admin-2026')}
            className="px-3 py-1.5 bg-[#5B4632] text-[#F4D9A0] font-semibold rounded-sm"
          >
            Switch to Demo Admin
          </button>
        </div>
      )}

      {msg && (
        <div className="p-3.5 bg-[#2E8057]/12 border border-[#2E8057] text-xs font-medium text-[#1F5E3F] rounded-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {err && (
        <div role="alert" className="p-3.5 bg-[#C83D3D]/10 border border-[#C83D3D] text-xs font-medium text-[#9F2929] rounded-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Handler Load Overview Panel */}
      <section className="bg-white border border-[#D9CDBB] rounded-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-[#2D261F]">
            Live Handler Load &amp; Eligibility Panel
          </h2>
          <span className="text-xs font-mono text-[#6E6255]">
            Eligible = Enabled ∧ Available ∧ Active Load &lt; Capacity
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {handlers.map((h) => (
            <div key={h.id} className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#2D261F]">{h.handler_code}</span>
                <span
                  className={`font-semibold ${
                    h.eligible ? 'text-[#2E8057]' : 'text-[#C83D3D]'
                  }`}
                >
                  {h.eligible ? 'Eligible' : h.availability !== 'Available' ? h.availability : 'At Capacity'}
                </span>
              </div>
              <div className="font-semibold text-[#2D261F] truncate">{h.name}</div>
              <div className="text-[#6E6255] truncate">
                {h.zone} · {h.specialization}
              </div>
              <div className="font-mono tabular-nums text-[#5B4632] pt-1">
                Load: <strong>{h.active_load} / {h.capacity_limit}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeTab === 'table' && routingTable && (
        <div className="space-y-8">
          {/* Station Prefix -> Zone Table */}
          <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-bold text-[#2D261F]">
                  Station Prefix to Corridor Zone Table
                </h2>
                <p className="text-xs text-[#6E6255]">
                  Illustrative demo prefixes marked explicitly. Unknown prefixes route to Central Fallback / Correction Queue.
                </p>
              </div>
            </div>

            {isAdmin && (
              <form onSubmit={handleAddPrefix} className="p-4 bg-[#F8F4EC] border-b border-[#D9CDBB] flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="new-prefix" className="block text-[11px] font-bold uppercase text-[#5B4632] mb-1">
                    Station Prefix (STA + 2 letters)
                  </label>
                  <input
                    id="new-prefix"
                    type="text"
                    maxLength={5}
                    required
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value)}
                    placeholder="STANE"
                    className="px-3 py-1.5 bg-white border border-[#D9CDBB] rounded-sm font-mono text-xs uppercase w-36"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label htmlFor="new-label" className="block text-[11px] font-bold uppercase text-[#5B4632] mb-1">
                    Station Label
                  </label>
                  <input
                    id="new-label"
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="North East Concourse"
                    className="w-full px-3 py-1.5 bg-white border border-[#D9CDBB] rounded-sm text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="new-zone" className="block text-[11px] font-bold uppercase text-[#5B4632] mb-1">
                    Corridor Zone
                  </label>
                  <select
                    id="new-zone"
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value as 'East' | 'West' | 'Central')}
                    className="px-3 py-1.5 bg-white border border-[#D9CDBB] rounded-sm text-xs"
                  >
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="Central">Central</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#C8792C] text-white text-xs font-semibold rounded-sm hover:bg-[#B26821]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Prefix</span>
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                    <th className="py-3 px-4">Prefix</th>
                    <th className="py-3 px-4">Station Label</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Control Room</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DA]">
                  {routingTable.stations.map((st) => (
                    <tr key={st.id} className="hover:bg-[#F8F4EC]">
                      <td className="py-3 px-4 font-mono font-bold text-[#2D261F]">{st.station_prefix}</td>
                      <td className="py-3 px-4 text-[#2D261F]">{st.station_label}</td>
                      <td className="py-3 px-4"><CorridorBadge zone={st.zone} /></td>
                      <td className="py-3 px-4 text-[#6E6255]">{st.control_room}</td>
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStation(st.id, st.enabled)}
                            className={`px-2.5 py-1 text-[11px] font-semibold border rounded-sm ${
                              st.enabled
                                ? 'bg-[#2E8057]/12 text-[#1F5E3F] border-[#2E8057]'
                                : 'bg-[#EFE8DA] text-[#6E6255] border-[#D9CDBB]'
                            }`}
                          >
                            {st.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        ) : (
                          <span className={st.enabled ? 'text-[#2E8057] font-semibold' : 'text-[#6E6255]'}>
                            {st.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Corridor x Category Routing Rules */}
          <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB]">
              <h2 className="font-display text-sm font-bold text-[#2D261F]">
                Corridor &amp; Category Dispatch Rules (Medical Override Enforced)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Primary Target</th>
                    <th className="py-3 px-4">Backup Target</th>
                    <th className="py-3 px-4">Escalation Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DA]">
                  {routingTable.rules.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8F4EC]">
                      <td className="py-2.5 px-4"><CorridorBadge zone={r.zone} /></td>
                      <td className="py-2.5 px-4"><CategoryBadge category={r.category} /></td>
                      <td className="py-2.5 px-4">
                        {isAdmin && r.category !== 'Medical' ? (
                          <select
                            aria-label={`Priority for ${r.zone} ${r.category}`}
                            value={r.priority}
                            onChange={(e) => handlePriorityChange(r.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-[#D9CDBB] rounded-sm font-mono text-xs"
                          >
                            {['P1', 'P2', 'P3', 'P4'].map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <PriorityBadge priority={r.priority} />
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#2D261F]">{r.target_team}</td>
                      <td className="py-2.5 px-4 text-[#6E6255]">{r.backup_target}</td>
                      <td className="py-2.5 px-4 text-[#6E6255]">{r.escalation_target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Demo Anomaly Mapping Table */}
          <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB]">
              <h2 className="font-display text-sm font-bold text-[#2D261F]">
                Anomaly Code to Category Mapping Table (Illustrative Demo Configuration)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                    <th className="py-3 px-4">Anomaly Code</th>
                    <th className="py-3 px-4">Regex Pattern</th>
                    <th className="py-3 px-4">Rule ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Default Priority</th>
                    <th className="py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DA]">
                  {routingTable.anomaly_mappings.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-4 font-mono font-bold">{m.anomaly_code}</td>
                      <td className="py-2.5 px-4 font-mono text-[#6E6255]">{m.pattern_regex}</td>
                      <td className="py-2.5 px-4 font-mono text-[#6E6255]">{m.rule_id}</td>
                      <td className="py-2.5 px-4"><CategoryBadge category={m.category} /></td>
                      <td className="py-2.5 px-4"><PriorityBadge priority={m.default_priority} /></td>
                      <td className="py-2.5 px-4 text-[#6E6255]">{m.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'queues' && (
        <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB] flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-[#2D261F]">
              Waiting, Backup, Escalated &amp; Fallback Correction Queues
            </h2>
            <span className="text-xs font-mono text-[#6E6255]">
              Ordered deterministically: Priority ASC → Timestamp ASC → Report ID ASC
            </span>
          </div>

          {queues.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6E6255]">
              No items currently queued or escalated.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                    <th className="py-3 px-4">Report</th>
                    <th className="py-3 px-4">Queue Type</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Reason</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Admin Override Dispatch</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DA]">
                  {queues.map((q) => (
                    <tr key={q.id} className="hover:bg-[#F8F4EC]">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#2D261F]">{q.report_code}</div>
                        <div className="font-mono text-[11px] text-[#6E6255]">
                          {q.station_code} · {q.zone}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#5B4632] whitespace-nowrap">
                        {q.queue_type}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityBadge priority={q.priority} />
                      </td>
                      <td className="py-3 px-4 font-mono text-[#2D261F] whitespace-nowrap">
                        {q.state}
                      </td>
                      <td className="py-3 px-4 text-[#6E6255] max-w-md">{q.reason}</td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {q.state === 'Queued' ? (
                            <div className="inline-flex items-center gap-2">
                              <select
                                aria-label={`Select handler for ${q.report_code}`}
                                value={assignHandlerMap[q.report_id] || handlers[0]?.id || ''}
                                onChange={(e) =>
                                  setAssignHandlerMap((prev) => ({
                                    ...prev,
                                    [q.report_id]: Number(e.target.value),
                                  }))
                                }
                                className="px-2 py-1 bg-white border border-[#D9CDBB] rounded-sm text-xs"
                              >
                                {handlers.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.handler_code} ({h.active_load}/{h.capacity_limit})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleManualAssign(q.report_id)}
                                className="px-2.5 py-1 bg-[#C8792C] text-white font-semibold rounded-sm hover:bg-[#B26821]"
                              >
                                Assign
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#6E6255]">Handled</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'logs' && (
        <section className="bg-white border border-[#D9CDBB] rounded-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#EFE8DA] border-b border-[#D9CDBB]">
            <h2 className="font-display text-sm font-bold text-[#2D261F]">
              Dispatch Decision Audit Log ({logs.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F4EC] border-b border-[#D9CDBB] font-mono uppercase text-[11px] text-[#6E6255]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">Key / Zone</th>
                  <th className="py-3 px-4">Category / Priority</th>
                  <th className="py-3 px-4">Decision &amp; Target</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DA]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#F8F4EC]">
                    <td className="py-3 px-4 font-mono text-[#6E6255] tabular-nums whitespace-nowrap">
                      {formatTimestamp(l.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#2D261F] whitespace-nowrap">
                      {l.report_code}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-[#2D261F]">{l.routing_key}</span>
                      <div className="text-[#6E6255]">{l.zone}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap space-y-1">
                      <CategoryBadge category={l.category} />
                      <div><PriorityBadge priority={l.priority} /></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2D261F]">{l.decision}</div>
                      <div className="text-[#6E6255]">{l.target}</div>
                    </td>
                    <td className="py-3 px-4 text-[#6E6255] max-w-sm">{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
