import React from 'react';
import { FlightItem, FlightMode, TimeFrame } from '../types';
import { StatusBadge } from './StatusBadge';
import { Plane, Luggage, MapPin, Building2, AlertCircle, History, Clock } from 'lucide-react';

interface FidsTableProps {
  flights: FlightItem[];
  mode: FlightMode;
  timeframe: TimeFrame;
  isLoading: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  onSwitchTimeframe?: (tf: TimeFrame) => void;
}

export const FidsTable: React.FC<FidsTableProps> = ({
  flights,
  mode,
  timeframe,
  isLoading,
  searchQuery,
  onClearSearch,
  onSwitchTimeframe,
}) => {
  const isDepartures = mode === 'departures';

  if (isLoading && flights.length === 0) {
    return (
      <div className="w-full bg-fids-surface/90 border border-fids-border rounded-2xl p-8 backdrop-blur-md shadow-2xl">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-slate-800/80 rounded-xl"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-900/60 rounded-xl border border-slate-800/40"></div>
          ))}
        </div>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="w-full bg-fids-surface/90 border border-fids-border rounded-2xl p-12 text-center backdrop-blur-md shadow-2xl">
        <div className="inline-flex p-4 rounded-full bg-slate-800/80 border border-slate-700/60 mb-4 text-slate-400">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No Flights in this View</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          {searchQuery
            ? `No flights matching "${searchQuery}" in ${timeframe} schedule.`
            : timeframe === 'upcoming'
            ? `No further upcoming ${mode} scheduled for today.`
            : timeframe === 'past'
            ? `No earlier ${mode} recorded for today yet.`
            : `No ${mode} currently scheduled for today at this airport.`}
        </p>
        <div className="flex items-center justify-center gap-3">
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-lg"
            >
              Clear Search Filter
            </button>
          )}
          {timeframe !== 'all' && onSwitchTimeframe && (
            <button
              onClick={() => onSwitchTimeframe('all')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
            >
              View Full 24h Schedule
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-fids-surface/90 border border-fids-border rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Informational Sub-header Banner */}
      <div className="px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-fids-border/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {timeframe === 'upcoming' ? (
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Live Airport Timetable • Synchronized with Stockholm local time
            </span>
          </div>
        ) : timeframe === 'past' ? (
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Earlier Movements Archive • Completed flights & baggage today
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-cyan-300 font-semibold">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Full 24-Hour Schedule Overview (Past & Upcoming)
            </span>
          </div>
        )}

        <div className="text-slate-400 font-mono text-[11px]">
          {flights.length} {flights.length === 1 ? 'flight' : 'flights'} listed
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-fids-border bg-slate-950/60 text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              <th className="py-3.5 px-4 sm:px-6 w-24">
                <span className="text-amber-400">TIME</span>
              </th>
              <th className="py-3.5 px-4 w-32">
                <span className="text-yellow-300">FLIGHT</span>
              </th>
              <th className="py-3.5 px-4">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {isDepartures ? 'DESTINATION' : 'ORIGIN'}
                </span>
              </th>
              <th className="py-3.5 px-4 hidden md:table-cell">
                <span className="text-slate-300">AIRLINE</span>
              </th>
              <th className="py-3.5 px-4 text-center w-24 hidden sm:table-cell">
                <span className="text-slate-300 flex items-center justify-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  TERM
                </span>
              </th>
              <th className="py-3.5 px-4 text-center w-36">
                <span className="text-cyan-300 flex items-center justify-center gap-1.5">
                  {isDepartures ? (
                    <>
                      <Plane className="w-3.5 h-3.5 text-emerald-400" />
                      GATE
                    </>
                  ) : (
                    <>
                      <Luggage className="w-3.5 h-3.5 text-amber-400" />
                      BAGGAGE BELT
                    </>
                  )}
                </span>
              </th>
              <th className="py-3.5 px-4 sm:px-6 text-right w-48">
                <span className="text-slate-300">STATUS</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {flights.map((item, idx) => {
              const isEven = idx % 2 === 0;
              const isPastItem = item.is_past;

              return (
                <tr
                  key={`${item.flight}-${item.time}-${idx}`}
                  className={`group transition-colors duration-150 ${
                    isPastItem && timeframe === 'all'
                      ? 'opacity-60 bg-slate-950/40 hover:opacity-100'
                      : isEven
                      ? 'bg-slate-900/30'
                      : 'bg-slate-950/20'
                  } hover:bg-slate-800/50`}
                >
                  {/* Scheduled Time */}
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-base font-bold text-amber-400 whitespace-nowrap fids-glow-amber">
                    <div className="flex items-center gap-1.5">
                      <span>{item.time}</span>
                      {isPastItem && timeframe === 'all' && (
                        <span className="text-[9px] font-sans uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                          Past
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Flight Number */}
                  <td className="py-3.5 px-4 font-mono font-extrabold text-sm sm:text-base text-yellow-200 tracking-wider whitespace-nowrap">
                    <span className="group-hover:text-yellow-300 transition-colors">
                      {item.flight}
                    </span>
                  </td>

                  {/* Destination / Origin City */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm sm:text-base tracking-wide flex items-center gap-2">
                      <span>{item.city}</span>
                    </div>
                    {/* Airline shown on mobile under city */}
                    <div className="md:hidden text-xs text-slate-400 font-normal mt-0.5 truncate max-w-[200px]">
                      {item.airline}
                    </div>
                  </td>

                  {/* Airline */}
                  <td className="py-3.5 px-4 hidden md:table-cell text-slate-300 text-xs sm:text-sm font-medium">
                    <span className="truncate max-w-[220px] block" title={item.airline}>
                      {item.airline}
                    </span>
                  </td>

                  {/* Terminal */}
                  <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                    {item.terminal && item.terminal !== '-' ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                        {item.terminal}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">-</span>
                    )}
                  </td>

                  {/* Gate or Baggage Belt */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {isDepartures ? (
                      // Gate
                      item.resource && item.resource !== 'Gate TBD' && item.resource !== '-' ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md font-mono text-xs sm:text-sm font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                          {item.resource}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-500 italic">
                          Gate TBD
                        </span>
                      )
                    ) : (
                      // Baggage Belt
                      item.resource && item.resource !== 'Awaiting Belt' && item.resource !== '-' ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md font-mono text-xs sm:text-sm font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                          {item.resource}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-500 italic">
                          Awaiting Belt
                        </span>
                      )
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Stats */}
      <div className="border-t border-fids-border bg-slate-950/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-white font-mono">{flights.length}</strong> {timeframe}{' '}
            {isDepartures ? 'departures' : 'arrivals'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Active / Boarding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Estimated / Delayed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Cancelled
          </span>
        </div>
      </div>
    </div>
  );
};
