import React from 'react';
import { TimeFrame, FlightMode } from '../types';
import { History, CalendarDays } from 'lucide-react';

interface TimelineSelectorProps {
  timeframe: TimeFrame;
  onSelectTimeframe: (tf: TimeFrame) => void;
  mode: FlightMode;
  upcomingCount: number;
  pastCount: number;
  allCount: number;
}

export const TimelineSelector: React.FC<TimelineSelectorProps> = ({
  timeframe,
  onSelectTimeframe,
  mode,
  upcomingCount,
  pastCount,
  allCount,
}) => {
  const isDepartures = mode === 'departures';

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-fids-surface/90 border border-fids-border rounded-xl backdrop-blur-md shadow-sm">
      {/* Active & Upcoming Tab */}
      <button
        onClick={() => onSelectTimeframe('upcoming')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          timeframe === 'upcoming'
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
        }`}
      >
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          <span className="absolute w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>
        <span className="tracking-wide">
          {isDepartures ? 'Now & Upcoming' : 'Now & Inbound'}
        </span>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
            timeframe === 'upcoming'
              ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800/60'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {upcomingCount}
        </span>
      </button>

      {/* Earlier Today / Past Movements Tab */}
      <button
        onClick={() => onSelectTimeframe('past')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          timeframe === 'past'
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
        }`}
      >
        <History className="w-3.5 h-3.5 text-purple-400" />
        <span className="tracking-wide">
          {isDepartures ? 'Earlier Departures' : 'Earlier Landed & Baggage'}
        </span>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
            timeframe === 'past'
              ? 'bg-purple-950/80 text-purple-200 border border-purple-800/60'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {pastCount}
        </span>
      </button>

      {/* Full 24h Schedule Tab */}
      <button
        onClick={() => onSelectTimeframe('all')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
          timeframe === 'all'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
        <span className="tracking-wide">All Day (24h)</span>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
            timeframe === 'all'
              ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-800/60'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {allCount}
        </span>
      </button>
    </div>
  );
};
