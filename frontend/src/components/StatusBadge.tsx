import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = status.toLowerCase();

  let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  let dotStyle = 'bg-slate-400';

  if (s.includes('boarding') || s.includes('gate open') || s.includes('go to gate')) {
    badgeStyle = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]';
    dotStyle = 'bg-emerald-400 animate-pulse';
  } else if (s.includes('cancel') || s.includes('inställd')) {
    badgeStyle = 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]';
    dotStyle = 'bg-rose-400';
  } else if (s.includes('delay') || s.includes('estimated') || s.includes('försenad') || s.includes('förväntas')) {
    badgeStyle = 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]';
    dotStyle = 'bg-amber-400 animate-pulse';
  } else if (s.includes('landed') || s.includes('departed') || s.includes('startat') || s.includes('landat')) {
    badgeStyle = 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]';
    dotStyle = 'bg-cyan-400';
  } else if (s.includes('on time') || s.includes('scheduled') || s.includes('planerad')) {
    badgeStyle = 'bg-blue-950/40 text-blue-200 border-blue-600/40';
    dotStyle = 'bg-blue-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border backdrop-blur-sm ${badgeStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`}></span>
      <span className="font-mono tracking-normal">{status}</span>
    </span>
  );
};

