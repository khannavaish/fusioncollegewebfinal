'use client';

import { motion } from 'framer-motion';
import { Card } from '@/app/components/Brand';

export default function ProfileStats() {
  return (
    <div className="space-y-6 lg:sticky lg:top-24">
      {/* Neon Wave Card */}
      <Card className="relative overflow-hidden border border-white/5 bg-white/3 min-h-[450px] p-6 flex flex-col shadow-2xl">
        {/* Animated Waves */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
          <svg className="w-full h-full" viewBox="0 0 200 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="adminNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
              <filter id="adminGlowFilter">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              fill="url(#adminNeonGlow)"
              filter="url(#adminGlowFilter)"
              initial={{ d: "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z" }}
              animate={{ d: [
                "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z",
                "M 0,240 C 50,255 75,225 125,235 C 165,245 185,225 200,240 L 200,400 L 0,400 Z",
                "M 0,240 C 40,230 80,250 120,240 C 160,230 180,245 200,240 L 200,400 L 0,400 Z",
              ]}}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              fill="url(#adminNeonGlow)"
              opacity="0.6"
              initial={{ d: "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z" }}
              animate={{ d: [
                "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z",
                "M 0,270 C 45,280 65,255 115,265 C 155,275 180,260 200,270 L 200,400 L 0,400 Z",
                "M 0,270 C 30,260 70,280 110,270 C 150,260 170,275 200,270 L 200,400 L 0,400 Z",
              ]}}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Header */}
        <div className="relative z-10 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Live Analytics</span>
          </div>
          <h3 className="text-lg font-black text-white leading-tight">Admin Health</h3>
          <p className="text-xs text-slate-400 mt-1">Real-time administrator system statistics.</p>
        </div>

        {/* Widgets */}
        <div className="relative z-10 flex-1 flex flex-col gap-5">
          {/* Activity Trend Bar Chart */}
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">System Uptime</span>
              <span className="text-xs font-black text-emerald-400">99.9%</span>
            </div>
            <div className="flex items-end gap-1 h-12">
              {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-sm h-full flex flex-col justify-end overflow-hidden">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.2 + (i * 0.1), duration: 0.8, type: 'spring' }}
                    className="w-full bg-cyan-500 opacity-80"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400">Security Score</span>
              <span className="text-xs font-black text-violet-400">98/100</span>
            </div>
            <div className="flex items-end gap-1 h-12">
              {[80, 85, 82, 90, 88, 95, 98].map((h, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-sm h-full flex flex-col justify-end overflow-hidden">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.4 + (i * 0.1), duration: 0.8, type: 'spring' }}
                    className="w-full bg-violet-500 opacity-80"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
