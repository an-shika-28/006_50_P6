import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Copy, Search, ShieldCheck } from 'lucide-react';
import type { ReportRecord } from '../types/metropulse';
import { formatTimestamp } from '../utils/validation';
import { CategoryBadge, CorridorBadge, PriorityBadge, StatusBadge } from './Badges';

interface SubmissionReceiptProps {
  report: ReportRecord;
  dispatchSummary: {
    routing_key: string;
    zone: string;
    routed_zone: string;
    medical_override: boolean;
    decision: string;
    target: string;
    is_backup: boolean;
    handler_code: string | null;
    reason: string;
  };
  onReset: () => void;
}

export function SubmissionReceipt({ report, dispatchSummary, onReset }: SubmissionReceiptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.report_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors in restricted environments
    }
  };

  return (
    <div
      data-testid="submission-receipt"
      className="bg-white border border-[#5B4632] rounded-sm overflow-hidden"
    >
      {/* Emergency Override Strip or Success Strip */}
      <div
        className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b ${
          dispatchSummary.medical_override
            ? 'bg-[#C83D3D] text-white border-[#9F2929]'
            : 'bg-[#3D2E20] text-[#F4D9A0] border-[#5B4632]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {dispatchSummary.medical_override ? (
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
          )}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider opacity-90">
              {dispatchSummary.medical_override
                ? 'Medical Emergency Override Executed'
                : 'Report Validated, Classified & Dispatched'}
            </div>
            <h2 className="font-display text-lg font-bold">
              Incident Receipt · {report.report_code}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-sm transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied ID' : 'Copy Report ID'}</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
            <div className="text-xs text-[#6E6255]">Unique Report ID</div>
            <div className="font-mono font-bold text-base text-[#2D261F] mt-1">{report.report_code}</div>
          </div>
          <div className="p-3.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
            <div className="text-xs text-[#6E6255]">Normalized Station</div>
            <div className="font-mono font-bold text-base text-[#2D261F] mt-1">{report.station_code}</div>
          </div>
          <div className="p-3.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
            <div className="text-xs text-[#6E6255]">Category &amp; Rule</div>
            <div className="mt-1 flex items-center gap-2">
              <CategoryBadge category={report.category} />
              <span className="text-[11px] font-mono text-[#6E6255]">{report.matched_rule_id}</span>
            </div>
          </div>
          <div className="p-3.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
            <div className="text-xs text-[#6E6255]">Priority &amp; Status</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={report.priority} />
              <StatusBadge status={report.status} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5B4632]">
              Routing &amp; Dispatch Decision
            </span>
            <div className="flex items-center gap-2">
              <CorridorBadge zone={dispatchSummary.routed_zone} />
              <span className="text-xs font-mono text-[#6E6255]">
                Key: {dispatchSummary.routing_key} · {dispatchSummary.decision}
              </span>
            </div>
          </div>
          <div className="text-sm font-semibold text-[#2D261F]">
            Assigned / Escalation Target: {dispatchSummary.target}
          </div>
          <p className="text-xs text-[#6E6255] leading-relaxed">{dispatchSummary.reason}</p>
          <div className="text-[11px] font-mono text-[#6E6255] pt-1">
            Submitted: {formatTimestamp(report.created_at)}
          </div>
        </div>

        {dispatchSummary.medical_override && (
          <div className="p-3.5 bg-[#C83D3D]/10 border border-[#C83D3D] rounded-sm text-xs text-[#9F2929]">
            <strong>Academic Prototype Notice:</strong> Medical override routed this report to the simulated Central Emergency Line inside MetroPulse. This prototype does not contact real emergency services.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EFE8DA]">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold text-[#5B4632] border border-[#D9CDBB] hover:bg-[#EFE8DA] rounded-sm"
          >
            Submit Another Incident
          </button>
          <Link
            to={`/track?code=${encodeURIComponent(report.report_code)}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8792C] text-white text-xs font-semibold hover:bg-[#B26821] rounded-sm"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Track Report Timeline</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
