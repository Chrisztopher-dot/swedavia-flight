import React from 'react';
import { RefreshCw, Radio } from 'lucide-react';

interface AutoRefreshIndicatorProps {
  countdown: number;
  totalInterval?: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastUpdated: Date | null;
}

export const AutoRefreshIndicator: React.FC<AutoRefreshIndicatorProps> = ({
  countdown,
  totalInterval = 30,
  isRefreshing,
  onRefresh,
  lastUpdated,
}) => {
  const progressPercent = ((totalInterval - countdown) / totalInterval) * 100;

  const formattedLastUpdated = lastUpdated
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Stockholm',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastUpdated)
    : null;

  return (
    <div className="flex items-center gap-3 bg-fids-surface/90 border border-fids-border px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-sm">
      {/* Pulse / Radar Indicator */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center w-3 h-3">
          <span className="absolute w-full h-full rounded-full bg-cyan-400 opacity-75 radar-dot"></span>
          <span className="relative w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-cyan-400" />
            Live Feed
          </span>
          <span className="font-mono text-[11px] text-cyan-300 font-bold">
            {countdown}s
          </span>
        </div>
      </div>

      {/* Progress mini bar */}
      <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
        <div
          className="h-full bg-cyan-400 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Last updated badge if present */}
      {formattedLastUpdated && (
        <span className="hidden md:inline-block font-mono text-[10px] text-slate-500 pl-1">
          {formattedLastUpdated}
        </span>
      )}

      {/* Manual Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh data now"
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150 disabled:opacity-50"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 text-cyan-400 ${
            isRefreshing ? 'animate-spin text-cyan-300' : ''
          }`}
        />
      </button>
    </div>
  );
};

