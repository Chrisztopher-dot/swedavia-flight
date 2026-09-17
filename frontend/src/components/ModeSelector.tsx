import React from 'react';
import { FlightMode } from '../types';
import { PlaneTakeoff, PlaneLanding } from 'lucide-react';

interface ModeSelectorProps {
  mode: FlightMode;
  onSelectMode: (mode: FlightMode) => void;
  departuresCount?: number;
  arrivalsCount?: number;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onSelectMode,
  departuresCount,
  arrivalsCount,
}) => {
  return (
    <div className="inline-flex p-1 bg-fids-surface/90 border border-fids-border rounded-xl backdrop-blur-md shadow-sm">
      <button
        onClick={() => onSelectMode('departures')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
          mode === 'departures'
            ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <PlaneTakeoff className="w-4 h-4" />
        <span>Departures</span>
        {departuresCount !== undefined && (
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full ${
              mode === 'departures'
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {departuresCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectMode('arrivals')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
          mode === 'arrivals'
            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
        }`}
      >
        <PlaneLanding className="w-4 h-4" />
        <span>Arrivals & Baggage</span>
        {arrivalsCount !== undefined && (
          <span
            className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full ${
              mode === 'arrivals'
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {arrivalsCount}
          </span>
        )}
      </button>
    </div>
  );
};

