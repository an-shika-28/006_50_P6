import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, MapPin, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import type { StationMapNode } from '../types/metropulse';
import { CategoryBadge, CorridorBadge, PriorityBadge, StatusBadge } from './Badges';

interface CorridorMapProps {
  selectedCorridor: 'East' | 'West' | 'Central';
  onSelectCorridor: (zone: 'East' | 'West' | 'Central') => void;
}

const NODE_COORDS: Record<string, { x: number; y: number }> = {
  STAWC: { x: 110, y: 120 },
  STAWX: { x: 250, y: 120 },
  STACC: { x: 400, y: 120 },
  STACM: { x: 400, y: 205 },
  STAEC: { x: 550, y: 120 },
  STAED: { x: 690, y: 120 },
};

export function CorridorMap({ selectedCorridor, onSelectCorridor }: CorridorMapProps) {
  const [stations, setStations] = useState<StationMapNode[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState<string>('STAEC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getStationMap()
      .then((res) => {
        const list = Array.isArray(res?.stations) ? res.stations : [];
        setStations(list);
        if (list.length > 0 && !list.find((s) => s.station_prefix === selectedPrefix)) {
          setSelectedPrefix(list[0].station_prefix);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load corridor map'))
      .finally(() => setLoading(false));
  }, []);

  const safeStations = Array.isArray(stations) ? stations : [];

  useEffect(() => {
    const match = safeStations.find((s) => s.zone === selectedCorridor);
    if (match) setSelectedPrefix(match.station_prefix);
  }, [selectedCorridor, safeStations]);

  const activeStation = safeStations.find((s) => s.station_prefix === selectedPrefix) || safeStations[0] || null;

  return (
    <section id="corridors" className="max-w-[1380px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#C8792C] mb-1.5">
            Schematic Corridor Network · Illustrative Demo Prefixes
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2D261F]">
            Interactive Metro Corridor Map
          </h2>
        </div>

        <div className="flex items-center gap-1.5 bg-[#EFE8DA] p-1 border border-[#D9CDBB] rounded-sm self-start">
          {(['West', 'Central', 'East'] as const).map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => onSelectCorridor(zone)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors ${
                selectedCorridor === zone
                  ? 'bg-[#5B4632] text-[#F4D9A0]'
                  : 'text-[#5B4632] hover:bg-[#F8F4EC]'
              }`}
            >
              {zone} Corridor
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#C83D3D]/10 border border-[#C83D3D] text-sm text-[#9F2929] rounded-sm mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Schematic SVG Map */}
        <div className="lg:col-span-7 bg-[#231A12] border border-[#5B4632] rounded-sm p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs text-[#F4D9A0]/80">
            <span className="font-mono">SCHEMATIC ROUTE TOPOLOGY (NOT GEOGRAPHIC)</span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#F4D9A0] inline-block" aria-hidden="true" /> West
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#E5C27A] inline-block" aria-hidden="true" /> Central
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-1 bg-[#C8792C] inline-block" aria-hidden="true" /> East
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg viewBox="0 0 800 320" className="w-full min-w-[540px] h-auto" role="img" aria-label="MetroPulse East, West, and Central schematic corridor diagram">
              {/* Architectural Grid */}
              <defs>
                <pattern id="metroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#5B4632" strokeWidth="0.5" strokeOpacity="0.35" />
                </pattern>
              </defs>
              <rect width="800" height="320" fill="url(#metroGrid)" />

              {/* Corridor Lines */}
              {/* West Corridor */}
              <line x1="80" y1="120" x2="400" y2="120" stroke="#F4D9A0" strokeWidth="6" strokeLinecap="round" />
              {/* Central Spine */}
              <line x1="400" y1="65" x2="400" y2="230" stroke="#E5C27A" strokeWidth="6" strokeDasharray="0" strokeLinecap="round" />
              {/* East Corridor */}
              <line x1="400" y1="120" x2="720" y2="120" stroke="#C8792C" strokeWidth="6" strokeLinecap="round" />

              {/* Corridor Zone Labels */}
              <text x="110" y="55" fill="#F4D9A0" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                WEST CORRIDOR
              </text>
              <text x="345" y="45" fill="#E5C27A" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                CENTRAL HUB
              </text>
              <text x="560" y="55" fill="#C8792C" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                EAST CORRIDOR
              </text>

              {/* Emergency Override Bypass Line Indicator */}
              <path
                d="M 110 150 Q 400 305 690 150"
                fill="none"
                stroke="#C83D3D"
                strokeWidth="1.75"
                strokeDasharray="6 5"
                strokeOpacity="0.75"
              />
              <text x="400" y="298" textAnchor="middle" fill="#F4D9A0" fontSize="11" fontFamily="JetBrains Mono, monospace" opacity="0.85">
                Medical Override Route → Central Emergency Line
              </text>

              {/* Clickable Station Nodes */}
              {safeStations.map((st, idx) => {
                const pos = NODE_COORDS[st.station_prefix] || { x: 140 + idx * 110, y: 190 };
                const isSelected = activeStation?.station_prefix === st.station_prefix;
                const hasActive = st.active_incidents > 0;
                return (
                  <g
                    key={st.station_prefix}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedPrefix(st.station_prefix);
                      onSelectCorridor(st.zone);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select station ${st.sample_station_code} in ${st.zone} Corridor`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPrefix(st.station_prefix);
                        onSelectCorridor(st.zone);
                      }
                    }}
                  >
                    {isSelected && (
                      <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="#F4D9A0" strokeWidth="2" />
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="14"
                      fill={isSelected ? '#C8792C' : '#2D2217'}
                      stroke={hasActive ? '#F4D9A0' : '#8A7863'}
                      strokeWidth="3.5"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      fill="#F4D9A0"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {st.active_incidents}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + 34}
                      textAnchor="middle"
                      fill="#F4D9A0"
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {st.station_prefix}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 pt-3 border-t border-[#5B4632] flex flex-wrap items-center justify-between gap-2 text-xs text-[#F4D9A0]/70">
            <span>Select any station node to inspect active incidents and handler routing.</span>
            <span>Node values = Active incidents</span>
          </div>
        </div>

        {/* Selected Station Detail Panel */}
        <div className="lg:col-span-5 bg-white border border-[#D9CDBB] rounded-sm p-6 flex flex-col justify-between">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-[#EFE8DA]" />
              <div className="h-8 w-64 bg-[#EFE8DA]" />
              <div className="h-24 w-full bg-[#EFE8DA]" />
            </div>
          ) : activeStation ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-[#EFE8DA] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#6E6255] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#C8792C]" aria-hidden="true" />
                    <span>PREFIX {activeStation.station_prefix}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeStation.is_demo_config ? 'Demo Station Config' : 'Configured Station'}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#2D261F]">
                    {activeStation.station_label}
                  </h3>
                </div>
                <CorridorBadge zone={activeStation.zone} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
                  <div className="text-xs text-[#6E6255]">Sample Code</div>
                  <div className="font-mono font-bold text-sm text-[#2D261F] mt-0.5">
                    {activeStation.sample_station_code}
                  </div>
                </div>
                <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
                  <div className="text-xs text-[#6E6255]">Active</div>
                  <div className="font-mono font-bold text-lg text-[#C8792C] tabular-nums mt-0.5">
                    {activeStation.active_incidents}
                  </div>
                </div>
                <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm">
                  <div className="text-xs text-[#6E6255]">Total Logged</div>
                  <div className="font-mono font-bold text-lg text-[#2D261F] tabular-nums mt-0.5">
                    {activeStation.total_incidents}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#5B4632] mb-2">
                  Category Breakdown
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {Object.entries(activeStation.category_breakdown).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm"
                    >
                      <span className="text-[#2D261F] font-medium">{cat}</span>
                      <span className="font-mono font-bold tabular-nums text-[#5B4632]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#5B4632]">Recent Station Incidents</div>
                {activeStation.recent_reports.length === 0 ? (
                  <div className="p-3 bg-[#F8F4EC] border border-[#D9CDBB] rounded-sm text-xs text-[#6E6255] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2E8057]" aria-hidden="true" />
                    <span>No incidents logged for prefix {activeStation.station_prefix}.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeStation.recent_reports.map((rep) => (
                      <Link
                        key={rep.report_code}
                        to={`/track?code=${encodeURIComponent(rep.report_code)}`}
                        className="flex items-center justify-between gap-2 p-2.5 bg-[#F8F4EC] hover:bg-[#EFE8DA] border border-[#D9CDBB] rounded-sm transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#2D261F]">
                              {rep.report_code}
                            </span>
                            <span className="text-xs font-mono text-[#6E6255]">{rep.station_code}</span>
                            {rep.is_demo && (
                              <span className="text-[11px] text-[#6E6255]">· Demo</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <CategoryBadge category={rep.category} />
                            <PriorityBadge priority={rep.priority} />
                          </div>
                        </div>
                        <StatusBadge status={rep.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#EFE8DA] flex items-center justify-between gap-3 text-xs">
                <span className="text-[#6E6255] truncate">
                  Control Room: <strong className="text-[#2D261F]">{activeStation.control_room}</strong>
                </span>
                <Link
                  to={`/report?station=${encodeURIComponent(activeStation.sample_station_code)}`}
                  className="inline-flex items-center gap-1 font-semibold text-[#C8792C] hover:text-[#9F5917] whitespace-nowrap shrink-0"
                >
                  <span>Report at {activeStation.station_prefix}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#6E6255]">
              <AlertCircle className="w-4 h-4" />
              <span>No station route data available.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
