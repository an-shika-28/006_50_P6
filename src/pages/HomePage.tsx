import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  GitBranch,
  HeartPulse,
  Layers,
  Route,
  Search,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { LandingHero3D } from '../components/LandingHero3D';
import { CorridorMap } from '../components/CorridorMap';
import { IncidentBoard } from '../components/IncidentBoard';
import { api } from '../services/api';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'REPORT',
    detail: 'Passenger submits station, anomaly code, urgency, and incident details.',
    icon: ClipboardCheck,
  },
  {
    step: '02',
    title: 'VALIDATE',
    detail: 'Python DFA and full-match Regex verify exact identifier structure.',
    icon: Cpu,
  },
  {
    step: '03',
    title: 'CLASSIFY',
    detail: 'Deterministic rule table assigns one of five operational categories.',
    icon: Layers,
  },
  {
    step: '04',
    title: 'ROUTE',
    detail: 'Corridor table resolves East, West, Central, or Medical Emergency Line.',
    icon: Route,
  },
  {
    step: '05',
    title: 'ASSIGN',
    detail: 'Capacity-aware engine selects least-loaded handler, backup, or queue.',
    icon: UserCheck,
  },
  {
    step: '06',
    title: 'RESOLVE',
    detail: 'Validated lifecycle updates track progress through resolution and audit.',
    icon: CheckCircle2,
  },
];

const CAPABILITIES = [
  {
    code: 'SYS-01',
    title: 'Intelligent Report Validation',
    detail: 'Explicit Deterministic Finite Automaton (DFA) paired with Python full-match Regex catches incomplete, malformed, and out-of-position codes before dispatch.',
    icon: Cpu,
  },
  {
    code: 'SYS-02',
    title: 'Five-Category Classification',
    detail: 'Every mapped report resolves deterministically to Safety, Technical, Crowd, Cleanliness, or Medical with conflict priority auditing and explicit unmapped-code handling.',
    icon: Layers,
  },
  {
    code: 'SYS-03',
    title: 'Corridor-Based Routing',
    detail: 'Configurable station-prefix tables route anomalies cleanly across East, West, and Central corridor control rooms without hardcoded guesswork.',
    icon: GitBranch,
  },
  {
    code: 'SYS-04',
    title: 'Medical Emergency Escalation',
    detail: 'Medical anomalies automatically trigger P0 priority and override normal corridor rules to route directly to the Central Emergency Line.',
    icon: HeartPulse,
    emergency: true,
  },
  {
    code: 'SYS-05',
    title: 'Handler Capacity Management',
    detail: 'Transaction-safe dispatch checks availability and active load against capacity limits, invoking backup handlers or priority queues on overflow.',
    icon: ShieldAlert,
  },
  {
    code: 'SYS-06',
    title: 'Real-Time Status Tracking',
    detail: 'Strict lifecycle transitions (Pending → Assigned → In Progress → Resolved) persist timestamped audit trails without leaking private contact info.',
    icon: Search,
  },
  {
    code: 'SYS-07',
    title: 'Operations Analytics',
    detail: 'Database-backed Recharts analytics track corridor load, category distribution, status breakdown, and computed resolution duration.',
    icon: BarChart3,
  },
];

export function HomePage() {
  const [selectedCorridor, setSelectedCorridor] = useState<'East' | 'West' | 'Central'>('Central');
  const [summary, setSummary] = useState<{
    total_reports: number;
    pending_reports: number;
    assigned_reports: number;
    in_progress_reports: number;
    resolved_reports: number;
    medical_reports: number;
  } | null>(null);

  useEffect(() => {
    api.getSummary().then(setSummary).catch(() => {});
  }, []);

  return (
    <div>
      {/* Section 2: Interactive 3D Metro Train Hero */}
      <LandingHero3D
        selectedCorridor={selectedCorridor}
        onSelectCorridor={setSelectedCorridor}
      />

      {/* Section 3: Interactive Metro Corridor Map */}
      <CorridorMap
        selectedCorridor={selectedCorridor}
        onSelectCorridor={setSelectedCorridor}
      />

      {/* Section 4: Live Incident Operations Board */}
      <IncidentBoard />

      {/* Section 5: How MetroPulse Works (Horizontal Transit Process) */}
      <section className="bg-[#EFE8DA] border-y border-[#D9CDBB] py-14 sm:py-16">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1.5">
              End-to-End Operations Pipeline
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2D261F]">
              How MetroPulse Works
            </h2>
          </div>

          <div className="relative">
            {/* Horizontal connecting transit rail on desktop */}
            <div
              className="hidden lg:block absolute top-7 left-6 right-6 h-1 bg-[#5B4632]/25"
              aria-hidden="true"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 relative">
              {WORKFLOW_STEPS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-[#5B4632] text-[#F4D9A0] rounded-sm">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="font-mono text-xs font-bold text-[#C8792C]">
                          {item.step}
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-extrabold tracking-wider text-[#2D261F] mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#6E6255] leading-relaxed">{item.detail}</p>
                    </div>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div className="mt-3 pt-2 border-t border-[#EFE8DA] flex items-center justify-end text-[11px] font-mono text-[#6E6255] lg:hidden">
                        <span>Next Stage</span>
                        <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Feature Showcase (Metro Signage Layout) */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1.5">
              System Capabilities
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2D261F]">
              Built for Transit Authority Precision
            </h2>
          </div>
          <Link
            to="/validation"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5B4632] hover:text-[#C8792C] whitespace-nowrap"
          >
            <span>Explore Automata &amp; Test Evidence</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAPABILITIES.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.code}
                className={`p-6 border rounded-sm flex flex-col justify-between ${
                  idx === 0 ? 'lg:col-span-2 bg-[#231A12] text-[#F4D9A0] border-[#5B4632]' : 'bg-white text-[#2D261F] border-[#D9CDBB]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        cap.emergency
                          ? 'text-[#C83D3D]'
                          : idx === 0
                          ? 'text-[#C8792C]'
                          : 'text-[#6E6255]'
                      }`}
                    >
                      {cap.code}
                    </span>
                    <Icon
                      className={`w-5 h-5 ${
                        cap.emergency
                          ? 'text-[#C83D3D]'
                          : idx === 0
                          ? 'text-[#F4D9A0]'
                          : 'text-[#5B4632]'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">{cap.title}</h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      idx === 0 ? 'text-[#F4D9A0]/80 max-w-xl' : 'text-[#6E6255]'
                    }`}
                  >
                    {cap.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 7: Connected Dashboards Preview */}
      <section className="bg-[#3D2E20] text-[#F4D9A0] border-t border-[#5B4632] py-14 sm:py-16">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-[#C8792C] mb-1.5">
                Unified Operations Suite
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F4D9A0]">
                Four Specialized Control Interfaces
              </h2>
            </div>
            {summary && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#F4D9A0]/85 tabular-nums">
                <span>Total Logged: <strong className="text-white">{summary.total_reports}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Active: <strong className="text-[#F4D9A0]">{summary.pending_reports + summary.assigned_reports + summary.in_progress_reports}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Resolved: <strong className="text-[#8CE0B0]">{summary.resolved_reports}</strong></span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: 'User Tracking Dashboard',
                role: 'Passengers & Reporters',
                desc: 'Search any unique Report ID, verify category and corridor assignment, and monitor the 4-stage resolution timeline.',
                to: '/track',
                cta: 'Open User Dashboard',
                icon: Search,
              },
              {
                title: 'Handler Console',
                role: 'Corridor Operations Teams',
                desc: 'Manage active assigned incidents, transition statuses through In Progress and Resolved, and toggle availability or capacity.',
                to: '/handler',
                cta: 'Open Handler Console',
                icon: UserCheck,
              },
              {
                title: 'Routing Management',
                role: 'Control Room Admins',
                desc: 'Inspect station-prefix routing tables, handler load balance, priority queues, fallback items, and dispatch audit logs.',
                to: '/routing',
                cta: 'Open Routing Console',
                icon: Route,
              },
              {
                title: 'Operations Analytics',
                role: 'Transit Administrators',
                desc: 'Examine Recharts visualizations across East, West, and Central corridors, anomaly categories, and resolution duration.',
                to: '/analytics',
                cta: 'Open Analytics',
                icon: Activity,
              },
            ].map((dash) => {
              const Icon = dash.icon;
              return (
                <div
                  key={dash.title}
                  className="bg-[#231A12] border border-[#5B4632] rounded-sm p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono text-[#C8792C] uppercase tracking-wider">
                        {dash.role}
                      </span>
                      <Icon className="w-4 h-4 text-[#F4D9A0]" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-base font-bold text-[#F4D9A0] mb-2">
                      {dash.title}
                    </h3>
                    <p className="text-xs text-[#F4D9A0]/75 leading-relaxed mb-5">
                      {dash.desc}
                    </p>
                  </div>
                  <Link
                    to={dash.to}
                    className="inline-flex items-center justify-between px-3.5 py-2 bg-[#3D2E20] hover:bg-[#C8792C] text-[#F4D9A0] hover:text-white border border-[#5B4632] rounded-sm text-xs font-semibold transition-colors"
                  >
                    <span>{dash.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
