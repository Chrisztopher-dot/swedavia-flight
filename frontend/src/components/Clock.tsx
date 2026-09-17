import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export const LiveClock: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format in Europe/Stockholm timezone
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const parts = timeFormatter.formatToParts(time);
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  const second = parts.find((p) => p.type === 'second')?.value || '00';
  const formattedDate = dateFormatter.format(time);

  return (
    <div className="flex items-center gap-3 bg-fids-surface/80 border border-fids-border/80 px-3.5 py-2 rounded-lg backdrop-blur-md shadow-inner">
      <ClockIcon className="w-4 h-4 text-cyan-400 shrink-0" />
      <div className="flex flex-col text-right">
        <div className="font-mono text-base font-bold text-white tracking-wider flex items-center gap-0.5">
          <span>{hour}</span>
          <span className="text-cyan-400 animate-pulse">:</span>
          <span>{minute}</span>
          <span className="text-cyan-400 animate-pulse">:</span>
          <span className="text-cyan-400/90 text-sm">{second}</span>
          <span className="text-[10px] text-slate-400 font-sans ml-1 uppercase">CEST</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">{formattedDate}</span>
      </div>
    </div>
  );
};

