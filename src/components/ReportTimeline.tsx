import React from 'react';
import { CheckCircle2, CircleDot } from 'lucide-react';
import type { ReportStatus, StatusHistoryItem } from '../types/metropulse';
import { formatTimestamp } from '../utils/validation';

const STAGES: ReportStatus[] = ['Pending', 'Assigned', 'In Progress', 'Resolved'];

export function ReportTimeline({
  currentStatus,
  history,
}: {
  currentStatus: ReportStatus;
  history: StatusHistoryItem[];
}) {
  const currentIdx = STAGES.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* 4-Stage Transit Progress Rail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Report lifecycle stages">
        {STAGES.map((stage, idx) => {
          const reached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={stage}
              className={`p-3 border rounded-sm ${
                stage === 'Resolved' && reached
                  ? 'bg-[#2E8057]/10 border-[#2E8057]'
                  : isCurrent
                  ? 'bg-[#F4D9A0]/35 border-[#C8792C]'
                  : reached
                  ? 'bg-[#F8F4EC] border-[#5B4632]/40'
                  : 'bg-white border-[#D9CDBB] opacity-65'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-mono text-[#6E6255]">0{idx + 1}</span>
                {reached ? (
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      stage === 'Resolved' ? 'text-[#2E8057]' : 'text-[#C8792C]'
                    }`}
                    aria-hidden="true"
                  />
                ) : (
                  <CircleDot className="w-4 h-4 text-[#D9CDBB]" aria-hidden="true" />
                )}
              </div>
              <div className="text-xs font-bold text-[#2D261F]">{stage}</div>
            </div>
          );
        })}
      </div>

      {/* Audit History Log */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B4632]">
          Status Audit Trail
        </h4>
        <ol className="space-y-2">
          {history.map((item) => (
            <li
              key={item.id}
              className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm text-xs space-y-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#2D261F]">
                  {item.old_status ? `${item.old_status} → ${item.new_status}` : `Initialized → ${item.new_status}`}
                </span>
                <span className="font-mono text-[#6E6255] tabular-nums">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
              <p className="text-[#6E6255]">{item.note}</p>
              <div className="text-[11px] font-mono text-[#6E6255]">Actor: {item.actor_id}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
