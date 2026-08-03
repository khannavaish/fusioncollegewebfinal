'use client';

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users, BookOpen, Layers, GraduationCap, BarChart3, Settings, ShieldCheck,
  TrendingUp, Database, ChevronRight, Banknote
} from "lucide-react";
import { Card, StatPill } from "@/app/components/Brand";
import Link from "next/link";
import WebsiteSettingsCard from "@/app/components/WebsiteSettingsCard";

const navItems = [
  { label: "Students", icon: GraduationCap, route: "/admin/students", color: "from-cyan-500 to-violet-600", glow: "rgba(6,182,212,0.3)", textColor: "text-cyan-300" },
  { label: "Teachers", icon: Users, route: "/admin/teachers", color: "from-amber-500 to-orange-600", glow: "rgba(245,158,11,0.3)", textColor: "text-amber-300" },
  { label: "Classes", icon: Layers, route: "/admin/classes", color: "from-violet-500 to-purple-600", glow: "rgba(124,58,237,0.3)", textColor: "text-violet-300" },
  { label: "Subjects", icon: BookOpen, route: "/admin/subjects", color: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.3)", textColor: "text-emerald-300" },
  { label: "Fees", icon: Banknote, route: "/admin/fees", color: "from-rose-500 to-pink-600", glow: "rgba(244,63,94,0.3)", textColor: "text-rose-300" },
  { label: "Settings", icon: Settings, route: "/admin/settings", color: "from-indigo-500 to-blue-600", glow: "rgba(99,102,241,0.3)", textColor: "text-indigo-300" }
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };

export default function AdminDashboardClient({ 
  adminName, stats, recentStudents, recentTeachers, enquiries 
}) {
  const router = useRouter();
  
  // Calculate some dummy health percentages for the visual UI to match MDCAT perfectly
  const platformHealth = Math.min(100, Math.round(((stats.studentCount + stats.teacherCount) / Math.max((stats.studentCount + stats.teacherCount + stats.parentCount), 1)) * 100)) || 0;
  const engagementRate = Math.min(100, Math.round((stats.classCount / Math.max(stats.subjectCount, 1)) * 100)) || 0;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* ── Left Column ── */}
      <div className="xl:col-span-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-slate-400">
            Welcome back, <span className="text-white font-bold">{adminName}</span>
          </p>
        </motion.div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Admin Controls</span>
          </h2>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  variants={itemVariants}
                  onClick={() => router.push(item.route)}
                  className="group relative rounded-2xl border border-white/5 bg-white/3 p-4 text-left hover:border-white/10 hover:bg-white/5 transition-all duration-300 cursor-pointer overflow-hidden"
                  style={{ boxShadow: `0 0 0px ${item.glow}` }}
                  whileHover={{ boxShadow: `0 0 18px ${item.glow}` }}
                >
                  <div className={`mb-3 w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-xs font-bold ${item.textColor}`}>{item.label}</span>
                  <ChevronRight className="absolute bottom-3.5 right-3.5 w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* Platform Stats Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
            <Database className="w-3.5 h-3.5 text-violet-400" />
            <span>Platform Overview</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Users", value: stats.studentCount + stats.teacherCount + stats.parentCount, color: "text-cyan-400", link: "/admin/users" },
              { label: "Students", value: stats.studentCount, color: "text-emerald-400", link: "/admin/students" },
              { label: "Teachers", value: stats.teacherCount, color: "text-violet-400", link: "/admin/teachers" },
              { label: "Parents", value: stats.parentCount, color: "text-amber-400", link: "/admin/parents" },
              { label: "Classes", value: stats.classCount, color: "text-rose-400", link: "/admin/classes" },
              { label: "Subjects", value: stats.subjectCount, color: "text-indigo-400", link: "/admin/subjects" },
              { label: "Enquiries", value: enquiries.length, color: "text-pink-400", link: "/admin/enquiries" },
            ].map((row) => (
              <Link href={row.link} key={row.label} className="rounded-2xl border border-white/5 bg-[#0c0e1a]/95 p-3 flex flex-col justify-between min-h-[72px] hover:border-white/10 hover:bg-white/5 hover:-translate-y-0.5 transition-all shadow-lg cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{row.label}</span>
                <span className={`text-base font-black mt-1 ${row.color}`}>{row.value ?? "0"}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Website Settings Integration */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <WebsiteSettingsCard />
        </motion.div>
        
        {/* Recent Data Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-[#0c0e1a]/95 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Recent Students</h2>
              <Link href="/admin/students" className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest hover:text-cyan-300">View All</Link>
            </div>
            <div className="space-y-3">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-bold text-white">{s.name}</div>
                    <div className="text-[10px] text-zinc-500">{s.class?.name || 'No class'}</div>
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{s.rollNumber}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#0c0e1a]/95 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Recent Teachers</h2>
              <Link href="/admin/teachers" className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest hover:text-cyan-300">View All</Link>
            </div>
            <div className="space-y-3">
              {recentTeachers.map((t) => (
                <div key={t.id} className="flex justify-between items-center pb-2 border-b border-white/5 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{t.user?.email}</div>
                  </div>
                  <div className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">Active</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Live Neon Stats ── */}
      <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
        
        {/* Card 1: Financial Health & Wave Graph */}
        <div className="relative rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-8 flex flex-col justify-between shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden group">
          {/* Dynamic Full-Bleed Neon Water Background */}
          <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.25] mix-blend-screen [mask-image:radial-gradient(ellipse_at_top_right,white_0%,transparent_100%)]">
            <svg className="w-full h-full scale-110" viewBox="0 0 400 400" preserveAspectRatio="none">
              <defs>
                <linearGradient id="platformHealthGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.2" />
                </linearGradient>
                <filter id="platformHealthBlur">
                  <feGaussianBlur stdDeviation="15" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <motion.path
                fill="url(#platformHealthGlow)"
                filter="url(#platformHealthBlur)"
                initial={{ d: "M 0,100 C 100,50 300,150 400,100 L 400,400 L 0,400 Z" }}
                animate={{ d: [
                  "M 0,100 C 100,50 300,150 400,100 L 400,400 L 0,400 Z",
                  "M 0,50 C 150,150 250,50 400,150 L 400,400 L 0,400 Z",
                  "M 0,100 C 100,50 300,150 400,100 L 400,400 L 0,400 Z",
                ]}}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.path
                fill="url(#platformHealthGlow)"
                opacity="0.5"
                initial={{ d: "M 0,200 C 150,150 250,250 400,150 L 400,400 L 0,400 Z" }}
                animate={{ d: [
                  "M 0,200 C 150,150 250,250 400,150 L 400,400 L 0,400 Z",
                  "M 0,150 C 100,250 300,150 400,250 L 400,400 L 0,400 Z",
                  "M 0,200 C 150,150 250,250 400,150 L 400,400 L 0,400 Z",
                ]}}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col h-full space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 drop-shadow-md">Live Analytics</span>
              </div>
              <h3 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">Platform Health</h3>
              <p className="text-xs text-white/50 mt-1.5 font-medium">Real-time platform-wide statistics across all users.</p>
            </div>

            {/* Main Stats Flow - Unboxed */}
            <div className="space-y-6 flex-1 mt-6">
              
              {/* Financial Stats */}
              <div className="space-y-3 pb-6 border-b border-white/5">
                <Link href="/admin/fees" className="flex justify-between items-end group cursor-pointer hover:scale-[1.01] transition-transform">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/40 group-hover:text-white/60 transition-colors">This Month Revenue</div>
                  <div className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] tracking-tighter group-hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all">₨ {stats.revenueThisMonth?.toLocaleString() || 0}</div>
                </Link>
                <Link href="/admin/fees" className="flex justify-between items-end group cursor-pointer hover:scale-[1.01] transition-transform">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Outstanding Fees</div>
                  <div className="text-sm font-black text-rose-400/80 drop-shadow-md group-hover:text-rose-400 transition-colors">₨ {stats.outstandingThisMonth?.toLocaleString() || 0}</div>
                </Link>
              </div>

              {/* Bottom Simple Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Link href="/admin/classes" className="group cursor-pointer hover:-translate-y-1 transition-transform flex flex-col">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/30 group-hover:text-cyan-400 transition-colors mb-1">Total Classes</div>
                  <div className="text-2xl font-black text-white drop-shadow-md group-hover:text-cyan-300 transition-colors">{stats.classCount}</div>
                </Link>
                <Link href="/admin/enquiries" className="group cursor-pointer hover:-translate-y-1 transition-transform flex flex-col">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/30 group-hover:text-cyan-400 transition-colors mb-1">Enquiries</div>
                  <div className="text-2xl font-black text-white drop-shadow-md group-hover:text-cyan-300 transition-colors">{enquiries?.length || 0}</div>
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Card 2: User Engagement Rings */}
        <div className="relative rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-8 flex flex-col justify-between shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 drop-shadow-md">User Engagement</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
                
                {/* Attendance Ring */}
                <Link href="/admin/attendance" className="flex flex-col gap-3 group cursor-pointer">
                  <div className="relative w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                    <div className="absolute inset-0 rounded-full border border-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:border-cyan-500/30 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all" />
                    <span className="text-sm font-black text-white drop-shadow-md group-hover:text-cyan-300 transition-colors">{stats.attendanceRate}%</span>
                    <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] group-hover:drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all" viewBox="0 0 36 36">
                      <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                      <motion.path 
                        className="text-cyan-400" 
                        strokeDasharray={`${stats.attendanceRate}, 100`} 
                        initial={{ strokeDasharray: `0, 100` }}
                        animate={{ strokeDasharray: `${stats.attendanceRate}, 100` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white uppercase tracking-wider drop-shadow-md group-hover:text-cyan-400 transition-colors">Attendance</div>
                    <div className="text-[9px] font-bold text-white/30 mt-0.5 uppercase">Today&apos;s Present</div>
                  </div>
                </Link>

                {/* Active Users Ring */}
                <Link href="/admin/students" className="flex flex-col gap-3 group cursor-pointer">
                  <div className="relative w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                    <div className="absolute inset-0 rounded-full border border-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)] group-hover:border-violet-500/30 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all" />
                    <span className="text-sm font-black text-white drop-shadow-md group-hover:text-violet-300 transition-colors">{stats.studentCount + stats.teacherCount}</span>
                    <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] group-hover:drop-shadow-[0_0_15px_rgba(139,92,246,0.8)] transition-all" viewBox="0 0 36 36">
                      <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                      <motion.path 
                        className="text-violet-400" 
                        strokeDasharray={`100, 100`} 
                        initial={{ strokeDasharray: `0, 100` }}
                        animate={{ strokeDasharray: `100, 100` }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-white uppercase tracking-wider drop-shadow-md group-hover:text-violet-400 transition-colors">Active Users</div>
                    <div className="text-[9px] font-bold text-white/30 mt-0.5 uppercase">Registered Total</div>
                  </div>
                </Link>
            </div>
          </div>
        </div>
      </div>
  );
}

// EOF
