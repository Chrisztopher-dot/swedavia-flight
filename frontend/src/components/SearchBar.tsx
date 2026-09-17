import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  resultCount: number;
  totalCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  resultCount,
  totalCount,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        onChange('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  return (
    <div className="relative flex items-center w-full max-w-md">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Search className="w-4 h-4 text-slate-400" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter by flight, city, or airline... (/)"
        className="w-full bg-fids-surface/90 border border-fids-border hover:border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl pl-10 pr-24 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 backdrop-blur-md shadow-inner"
      />

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {value ? (
          <>
            <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded">
              {resultCount} / {totalCount}
            </span>
            <button
              onClick={() => onChange('')}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              title="Clear filter (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-800/80 border border-slate-700/60 rounded">
            /
          </kbd>
        )}
      </div>
    </div>
  );
};

