'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchGlobalUsers } from '@/app/actions/admin';
import { motion } from 'framer-motion';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, startTransition] = useTransition();
  const wrapperRef = useRef(null);
  const router = useRouter();

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        startTransition(async () => {
          const res = await searchGlobalUsers(query);
          if (res?.results) {
            setResults(res.results);
            setIsOpen(true);
          }
        });
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (link) => {
    setIsOpen(false);
    setQuery('');
    router.push(link);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative isolate rounded-full overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] group">
        
        {/* Dynamic Flowing Neon Water Background - Contained inside the search pill */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-75 mix-blend-screen transition-opacity duration-300 group-focus-within:opacity-100 overflow-hidden rounded-full">
          <svg className="w-full h-full scale-110" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="searchWater" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
              <filter id="searchGlowFilter">
                <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              fill="url(#searchWater)"
              filter="url(#searchGlowFilter)"
              initial={{ d: "M 0,0 L 0,30 C 250,40 500,10 750,30 C 900,40 1000,20 1000,30 L 1000,0 Z" }}
              animate={{ d: [
                "M 0,0 L 0,30 C 250,40 500,10 750,30 C 900,40 1000,20 1000,30 L 1000,0 Z",
                "M 0,0 L 0,20 C 250,10 500,40 750,20 C 900,10 1000,40 1000,20 L 1000,0 Z",
                "M 0,0 L 0,30 C 250,40 500,10 750,30 C 900,40 1000,20 1000,30 L 1000,0 Z"
              ]}}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              fill="url(#searchWater)"
              opacity="0.6"
              initial={{ d: "M 0,0 L 0,40 C 200,60 400,20 600,40 C 800,60 1000,30 1000,40 L 1000,0 Z" }}
              animate={{ d: [
                "M 0,0 L 0,40 C 200,60 400,20 600,40 C 800,60 1000,30 1000,40 L 1000,0 Z",
                "M 0,0 L 0,30 C 200,20 400,60 600,30 C 800,20 1000,50 1000,30 L 1000,0 Z",
                "M 0,0 L 0,40 C 200,60 400,20 600,40 C 800,60 1000,30 1000,40 L 1000,0 Z"
              ]}}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          className="w-full relative z-10 bg-[#0d0f1a]/60 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 text-base text-white placeholder-zinc-400 rounded-full pl-12 pr-10 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          placeholder="Search students, teachers, parents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <svg className="animate-spin w-5 h-5 text-cyan-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-[#0d0f1a] border border-[#1e233d] rounded-xl shadow-2xl overflow-hidden z-[9999]">
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((user, idx) => (
                <li key={`${user.type}-${user.id}-${idx}`}>
                  <button
                    onClick={() => handleSelect(user.link)}
                    className="w-full text-left px-4 py-3 hover:bg-[#16192b] border-b border-[#1e233d]/50 last:border-0 transition-colors flex flex-col gap-0.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        {user.name}
                        {user.type === 'STUDENT' && <span className="text-[9px] bg-cyan-950/50 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/30">STUDENT</span>}
                        {user.type === 'TEACHER' && <span className="text-[9px] bg-emerald-950/50 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/30">TEACHER</span>}
                        {user.type === 'PARENT' && <span className="text-[9px] bg-violet-950/50 text-violet-400 px-1.5 py-0.5 rounded border border-violet-800/30">PARENT</span>}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono font-semibold">{user.subtitle}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {user.details}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-zinc-500 text-center">
              No users found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
