import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  MapPin,
  ShieldAlert,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import type { CorridorZone, PriorityTier, ReportCategory, ReportStatus } from '../types/metropulse';

export function StatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, { cls: string; icon: React.ReactNode }> = {
    Pending: {
      cls: 'bg-[#EFE8DA] text-[#3D2E20] border-[#B8A88E]',
      icon: <Clock className="w-3.5 h-3.5 shrink-0 text-[#5B4632]" aria-hidden="true" />,
    },
    Assigned: {
      cls: 'bg-[#FFF3DA] text-[#3D2E20] border-[#C8792C]',
      icon: <MapPin className="w-3.5 h-3.5 shrink-0 text-[#C8792C]" aria-hidden="true" />,
    },
    'In Progress': {
      cls: 'bg-[#FCE8D2] text-[#7A3F0B] border-[#C8792C]',
      icon: <Wrench className="w-3.5 h-3.5 shrink-0 text-[#C8792C]" aria-hidden="true" />,
    },
    Resolved: {
      cls: 'bg-[#E2F3EA] text-[#1A5236] border-[#2E8057]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#2E8057]" aria-hidden="true" />,
    },
  };

  const cfg = styles[status] || styles.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold border rounded-sm whitespace-nowrap shrink-0 ${cfg.cls}`}
    >
      {cfg.icon}
      <span>{status}</span>
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: PriorityTier | string }) {
  const map: Record<string, { label: string; cls: string }> = {
    P0: { label: 'P0 · Emergency', cls: 'bg-[#C83D3D] text-white border-[#9F2929]' },
    P1: { label: 'P1 · Critical', cls: 'bg-[#C8792C] text-white border-[#A45F1C]' },
    P2: { label: 'P2 · High', cls: 'bg-[#F4D9A0] text-[#2D261F] border-[#C8792C]' },
    P3: { label: 'P3 · Normal', cls: 'bg-[#EFE8DA] text-[#3D2E20] border-[#C9B99F]' },
    P4: { label: 'P4 · Low', cls: 'bg-[#F8F4EC] text-[#5B4632] border-[#D9CDBB]' },
  };
  const cfg = map[priority] || map.P3;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold border rounded-sm whitespace-nowrap shrink-0 ${cfg.cls}`}
    >
      {priority === 'P0' && <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{cfg.label}</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: ReportCategory | null | string }) {
  if (!category) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border border-[#C83D3D] bg-[#FDECEC] text-[#8E2020] rounded-sm whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Unmapped</span>
      </span>
    );
  }

  const map: Record<string, { icon: React.ReactNode; cls: string }> = {
    Safety: {
      icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-[#C8792C]" aria-hidden="true" />,
      cls: 'bg-[#F8F4EC] text-[#2D261F] border-[#C8792C]',
    },
    Technical: {
      icon: <Wrench className="w-3.5 h-3.5 shrink-0 text-[#5B4632]" aria-hidden="true" />,
      cls: 'bg-[#F8F4EC] text-[#2D261F] border-[#C9B99F]',
    },
    Crowd: {
      icon: <Users className="w-3.5 h-3.5 shrink-0 text-[#8A4E14]" aria-hidden="true" />,
      cls: 'bg-[#F8F4EC] text-[#2D261F] border-[#C9B99F]',
    },
    Cleanliness: {
      icon: <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#6E6255]" aria-hidden="true" />,
      cls: 'bg-[#F8F4EC] text-[#2D261F] border-[#C9B99F]',
    },
    Medical: {
      icon: <HeartPulse className="w-3.5 h-3.5 shrink-0 text-[#C83D3D]" aria-hidden="true" />,
      cls: 'bg-[#FDECEC] text-[#8E2020] border-[#C83D3D]',
    },
  };

  const cfg = map[category] || map.Technical;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold border rounded-sm whitespace-nowrap shrink-0 ${cfg.cls}`}
    >
      {cfg.icon}
      <span>{category}</span>
    </span>
  );
}

export function CorridorBadge({ zone }: { zone: CorridorZone | string }) {
  const styles: Record<string, string> = {
    East: 'border-[#C8792C] bg-[#C8792C]/10 text-[#7A4411]',
    West: 'border-[#5B4632] bg-[#5B4632]/10 text-[#3D2E20]',
    Central: 'border-[#B88B38] bg-[#F4D9A0]/45 text-[#3D2E20]',
    Unknown: 'border-[#C83D3D] bg-[#C83D3D]/10 text-[#9F2929]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold border rounded-sm whitespace-nowrap shrink-0 ${
        styles[zone] || styles.Unknown
      }`}
    >
      <span className="w-1.5 h-1.5 bg-current shrink-0" aria-hidden="true" />
      <span>{zone === 'Unknown' ? 'Unknown Zone' : `${zone} Corridor`}</span>
    </span>
  );
}
