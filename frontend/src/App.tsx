import { useState, useEffect, useMemo, useCallback } from 'react';
import { FlightItem, FlightMode, AirportOption } from './types';
import { LiveClock } from './components/Clock';
import { AirportSelector } from './components/AirportSelector';
import { ModeSelector } from './components/ModeSelector';
import { SearchBar } from './components/SearchBar';
import { AutoRefreshIndicator } from './components/AutoRefreshIndicator';
import { FidsTable } from './components/FidsTable';
import { Maximize2, Minimize2, AlertCircle, Plane } from 'lucide-react';

const DEFAULT_AIRPORTS: AirportOption[] = [
  { iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', isHub: true },
  { iata: 'GOT', name: 'Göteborg Landvetter', city: 'Göteborg', isHub: true },
  { iata: 'BMA', name: 'Stockholm Bromma', city: 'Stockholm', isHub: true },
  { iata: 'LLA', name: 'Luleå Airport', city: 'Luleå', isHub: true },
  { iata: 'MMX', name: 'Malmö Airport', city: 'Malmö', isHub: true },
  { iata: 'UME', name: 'Umeå Airport', city: 'Umeå', isHub: false },
  { iata: 'OSD', name: 'Åre Östersund', city: 'Östersund', isHub: false },
  { iata: 'VBY', name: 'Visby Airport', city: 'Visby', isHub: false },
  { iata: 'RNB', name: 'Ronneby Airport', city: 'Ronneby', isHub: false },
  { iata: 'KRN', name: 'Kiruna Airport', city: 'Kiruna', isHub: false },
];

const REFRESH_INTERVAL = 30;

export function App() {
  const [airports, setAirports] = useState<AirportOption[]>(DEFAULT_AIRPORTS);
  const [selectedAirport, setSelectedAirport] = useState<string>('ARN');
  const [mode, setMode] = useState<FlightMode>('departures');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Fetch airports on initial mount
  useEffect(() => {
    fetch('/api/airports')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch airports');
      })
      .then((data: AirportOption[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setAirports(data);
        }
      })
      .catch(() => {
        // Fallback to default airports
      });
  }, []);

  // Fetch flights callback
  const fetchFlights = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/flights?airport=${selectedAirport}&mode=${mode}`
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP Error ${response.status}`);
        }

        const data: FlightItem[] = await response.json();
        setFlights(data);
        setLastUpdated(new Date());
        setCountdown(REFRESH_INTERVAL);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedAirport, mode]
  );

  // Re-fetch when airport or mode changes
  useEffect(() => {
    fetchFlights(false);
  }, [fetchFlights]);

  // Polling countdown interval (30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchFlights(true);
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchFlights]);

  // Filtered flights based on live search
  const filteredFlights = useMemo(() => {
    if (!searchQuery.trim()) return flights;
    const q = searchQuery.toLowerCase().trim();
    return flights.filter(
      (f) =>
        f.flight.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.airline.toLowerCase().includes(q) ||
        f.resource.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q)
    );
  }, [flights, searchQuery]);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentAirportInfo = airports.find((a) => a.iata === selectedAirport);

  return (
    <div className="min-h-screen bg-fids-bg text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Ambience Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-32 bg-gradient-to-b from-cyan-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none"></div>

      {/* Main App Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6 relative z-10">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-fids-border/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] shrink-0">
              <Plane className="w-6 h-6 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>SWEDAVIA</span>
                  <span className="text-amber-400 font-mono font-normal">FIDS</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase">
                  Live Terminal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentAirportInfo?.name} ({currentAirportInfo?.iata}) • Scandinavian Airport Display
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <LiveClock />
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kiosk Fullscreen'}
              className="p-2.5 rounded-xl bg-fids-surface/90 border border-fids-border hover:border-slate-600 text-slate-400 hover:text-white transition-all backdrop-blur-md shadow-sm"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Controls Section: Airport Selector, Mode Switcher, Search, Auto-Refresh */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Airport Hubs */}
            <AirportSelector
              airports={airports}
              selectedAirport={selectedAirport}
              onSelectAirport={(code) => setSelectedAirport(code)}
            />

            {/* Auto Refresh Indicator */}
            <AutoRefreshIndicator
              countdown={countdown}
              totalInterval={REFRESH_INTERVAL}
              isRefreshing={isRefreshing}
              onRefresh={() => fetchFlights(true)}
              lastUpdated={lastUpdated}
            />
          </div>

          {/* Sub-bar: Mode Switcher + Live Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <ModeSelector
              mode={mode}
              onSelectMode={(m) => setMode(m)}
              departuresCount={mode === 'departures' ? flights.length : undefined}
              arrivalsCount={mode === 'arrivals' ? flights.length : undefined}
            />

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              resultCount={filteredFlights.length}
              totalCount={flights.length}
            />
          </div>
        </div>

        {/* Error Banner if any */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-200 text-sm shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <strong>Connection Error:</strong> {error}
            </div>
            <button
              onClick={() => fetchFlights(false)}
              className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        )}

        {/* FIDS Flight Board Table */}
        <main className="flex-1">
          <FidsTable
            flights={filteredFlights}
            mode={mode}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        </main>

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-fids-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Powered by Swedavia Airport & Flight Open API • Europe/Stockholm Time
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            FastAPI Backend + React Modern FIDS
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

