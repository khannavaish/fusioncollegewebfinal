'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export default function LiveClock() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    // Only set time after hydration to avoid mismatch
    setTime(new Date());
    
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    // Return a placeholder of the same size to prevent layout shift
    return <div className="h-[42px] w-[130px] rounded-full bg-white/5 animate-pulse" />;
  }

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-end justify-center h-full"
    >
      <div className="flex items-center gap-2 bg-[#0d0f1a]/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-lg">
        <Clock className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-black tracking-wider text-white">
          {formattedTime}
        </span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1 pr-3">
        {formattedDate}
      </span>
    </motion.div>
  );
}
