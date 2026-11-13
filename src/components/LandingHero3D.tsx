import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, DoorOpen, FilePlus2, Search } from 'lucide-react';
import { TrainScene } from './TrainScene';

interface LandingHero3DProps {
  selectedCorridor: 'East' | 'West' | 'Central';
  onSelectCorridor: (zone: 'East' | 'West' | 'Central') => void;
}

export function LandingHero3D({ selectedCorridor, onSelectCorridor }: LandingHero3DProps) {
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [trainSettled, setTrainSettled] = useState(false);

  const handleTrainSettled = () => {
    setTrainSettled(true);
    setDoorsOpen(true);
  };

  const handleToggleDoors = () => {
    setDoorsOpen((prev) => !prev);
  };

  return (
    <section
      className="relative w-full bg-[#231A12] text-[#F4D9A0] border-b border-[#5B4632] overflow-hidden"
      data-train-settled={trainSettled ? 'true' : 'false'}
      data-doors-open={doorsOpen ? 'true' : 'false'}
    >
      {/* 3D Canvas Container */}
      <div className="relative min-h-[580px] sm:h-[600px] lg:h-[650px] w-full flex flex-col">
        <div className="absolute inset-0">
          <TrainScene
            doorsOpen={doorsOpen}
            onToggleDoors={handleToggleDoors}
            onTrainSettled={handleTrainSettled}
            selectedCorridor={selectedCorridor}
            onSelectCorridor={onSelectCorridor}
          />
        </div>

        {/* Measured Contrast Scrim for Typography Legibility (no backdrop-blur over WebGL) */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#231A12]/90 via-[#231A12]/55 to-transparent"
          aria-hidden="true"
        />

        {/* Semantic DOM Hero Content Overlay */}
        <div className="pointer-events-none relative z-10 flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 flex flex-col justify-between gap-6 py-7 sm:py-10 lg:py-12">
          {/* Top Station Signage Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="pointer-events-auto inline-flex items-center gap-2.5 px-3 py-1.5 bg-[#2D2217]/95 border border-[#5B4632] rounded-sm text-xs font-mono tracking-wider text-[#F4D9A0]">
              <span>METROPULSE</span>
              <span aria-hidden="true" className="text-[#C8792C]">/</span>
              <span>STATION OPERATIONS</span>
            </div>

            {/* Interactive Corridor Signage Buttons */}
            <div
              className="pointer-events-auto flex items-center bg-[#2D2217]/95 border border-[#5B4632] rounded-sm p-1"
              role="group"
              aria-label="Corridor signage quick selector"
            >
              {(['East', 'West', 'Central'] as const).map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => {
                    onSelectCorridor(zone);
                    document.getElementById('corridors')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-sm whitespace-nowrap transition-colors ${
                    selectedCorridor === zone
                      ? 'bg-[#C8792C] text-white'
                      : 'text-[#F4D9A0]/80 hover:text-[#F4D9A0]'
                  }`}
                >
                  {zone} Corridor
                </button>
              ))}
            </div>
          </div>

          {/* Primary Headline + CTAs */}
          <div className="max-w-xl space-y-4 sm:space-y-5 my-auto">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-tight text-[#F4D9A0] text-balance">
              Every Incident.
              <br />
              Every Station.
              <br />
              <span className="text-white">Under Control.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#F4D9A0]/85 leading-relaxed max-w-md">
              Report, track, and resolve metro station anomalies through one connected operations system.
            </p>

            <div className="pointer-events-auto flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#C8792C] hover:bg-[#B26821] text-white text-xs sm:text-sm font-bold tracking-wide uppercase rounded-sm transition-colors whitespace-nowrap"
              >
                <FilePlus2 className="w-4 h-4" aria-hidden="true" />
                <span>Report an Incident</span>
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#2D2217]/95 hover:bg-[#3D2E20] text-[#F4D9A0] border border-[#F4D9A0]/45 text-xs sm:text-sm font-bold tracking-wide uppercase rounded-sm transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>Track Your Report</span>
              </Link>
            </div>
          </div>

          {/* Bottom Interactive Door Trigger & Action Panel */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <button
              type="button"
              onClick={handleToggleDoors}
              aria-expanded={doorsOpen}
              className="pointer-events-auto self-start inline-flex items-center gap-2 px-3.5 py-2 bg-[#2D2217]/95 hover:bg-[#3D2E20] border border-[#C8792C]/70 text-[#F4D9A0] text-xs font-semibold rounded-sm transition-colors"
            >
              <DoorOpen className="w-4 h-4 text-[#C8792C]" aria-hidden="true" />
              <span>{doorsOpen ? 'Close Train Doors' : 'Open Train Doors'}</span>
            </button>

            {doorsOpen && (
              <div
                data-testid="door-action-panel"
                className="pointer-events-auto bg-[#2D2217]/95 border border-[#C8792C] rounded-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="text-xs">
                  <div className="font-semibold text-[#F4D9A0]">Platform Boarding · Doors Open</div>
                  <div className="text-[#F4D9A0]/75">Ready for anomaly intake or live status lookup</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/report"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C8792C] text-white text-xs font-semibold rounded-sm hover:bg-[#B26821] whitespace-nowrap"
                  >
                    <span>Report Incident</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/track"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5B4632] text-[#F4D9A0] text-xs font-semibold rounded-sm hover:bg-[#6E563F] whitespace-nowrap"
                  >
                    <span>Track Report</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
