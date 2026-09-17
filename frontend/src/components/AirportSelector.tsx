import React from 'react';
import { AirportOption } from '../types';
import { Plane, ChevronDown } from 'lucide-react';

interface AirportSelectorProps {
  airports: AirportOption[];
  selectedAirport: string;
  onSelectAirport: (iata: string) => void;
}

export const AirportSelector: React.FC<AirportSelectorProps> = ({
  airports,
  selectedAirport,
  onSelectAirport,
}) => {
  const hubs = airports.filter((a) => a.isHub);
  const others = airports.filter((a) => !a.isHub);
  const currentAirport = airports.find((a) => a.iata === selectedAirport);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 mr-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
        <Plane className="w-3.5 h-3.5 text-amber-400" />
        <span>Airport:</span>
      </div>

      {/* Quick Hub Tabs */}
      <div className="flex flex-wrap items-center p-1 bg-fids-surface/90 border border-fids-border rounded-xl backdrop-blur-md shadow-sm">
        {hubs.map((hub) => {
          const isSelected = hub.iata === selectedAirport;
          return (
            <button
              key={hub.iata}
              onClick={() => onSelectAirport(hub.iata)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className="font-mono tracking-wide">{hub.iata}</span>
              <span className="hidden sm:inline text-[11px] font-medium opacity-80">
                {hub.city}
              </span>
            </button>
          );
        })}

        {/* Dropdown for other airports */}
        {others.length > 0 && (
          <div className="relative group">
            <select
              value={others.some((o) => o.iata === selectedAirport) ? selectedAirport : ''}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectAirport(e.target.value);
                }
              }}
              className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer bg-transparent focus:outline-none ${
                others.some((o) => o.iata === selectedAirport)
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                {others.some((o) => o.iata === selectedAirport) ? currentAirport?.iata : 'More...'}
              </option>
              {others.map((a) => (
                <option key={a.iata} value={a.iata} className="bg-slate-900 text-white">
                  {a.iata} - {a.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

