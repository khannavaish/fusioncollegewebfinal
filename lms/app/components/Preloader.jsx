'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide preloader after a short delay to simulate initial app loading
    // In a real scenario, this could be tied to a router event or initial data fetch completion.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-[#080a14] flex flex-col items-center justify-center"
        >
          {/* Subtle grid background for the preloader itself */}
          <div className="absolute inset-0 bg-grid-glow pointer-events-none opacity-50" />
          
          <div className="relative flex flex-col items-center z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-32 h-32 flex items-center justify-center mb-6"
            >
              {/* Spinning rings around the logo */}
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              
              {/* The Logo */}
              <img src="/logo.png" alt="Fusion College Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse" />
            </motion.div>
            
            {/* Loading text with shimmer */}
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-shimmer text-sm font-bold uppercase tracking-[0.3em]"
            >
              Loading Fusion LMS
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
