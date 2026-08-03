'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Home, Users, BookOpen, Layers,
  ClipboardCheck, Bell, History, Settings,
  LogOut, PanelLeftClose, PanelLeftOpen,
  Phone, GraduationCap, Banknote, Calendar, BarChart3, Database,
  Download, AlertTriangle, UserCheck, HeartHandshake, Menu, X, CreditCard
} from "lucide-react";

const ICON_MAP = {
  Home: Home,
  Students: GraduationCap,
  Teachers: UserCheck,
  Parents: HeartHandshake,
  Classes: Layers,
  Subjects: BookOpen,
  Fees: Banknote,
  Payroll: CreditCard,
  Ledger: History,
  Reports: BarChart3,
  Timetable: Calendar,
  Exams: ClipboardCheck,
  WhatsApp: Phone,
  Announcements: Bell,
  Settings: Settings,
  Profile: Settings,
  Session: Database,
  Export: Download,
  Reset: AlertTriangle
};

const RAIL_W = 68;
const FULL_W = 256;

export default function Sidebar({ role, name, handleSignOutAction }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-pinned");
    if (saved === "true") {
      setPinned(true);
      setExpanded(true);
    }
  }, []);

  const isOpen = pinned || hovered;

  useEffect(() => {
    const width = isOpen ? `${FULL_W}px` : `${RAIL_W}px`;
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [isOpen]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    setExpanded(next);
    localStorage.setItem("sidebar-pinned", String(next));
    if (!next) {
      setHovered(false); // Force close instantly when unpinning
    }
  };

  const isActive = (href) => {
    if (href === '/admin' || href === '/student' || href === '/teacher' || href === '/parent') {
      return pathname === href;
    }
    return pathname === href || (href.length > 1 && pathname?.startsWith(href + "/"));
  };

  // Simplified Nav for LMS mapping
  const navItems = role === 'ADMIN' ? [
    { href: "/admin", label: "Home" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/teachers", label: "Teachers" },
    { href: "/admin/parents", label: "Parents" },
    { href: "/admin/classes", label: "Classes" },
    { href: "/admin/subjects", label: "Subjects" },
    { href: "/admin/fees", label: "Fees" },
    { href: "/admin/fees/payroll", label: "Payroll" },
    { href: "/admin/ledger", label: "Ledger" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/timetable", label: "Timetable" },
    { href: "/admin/exams", label: "Exams" },
    { href: "/admin/whatsapp", label: "WhatsApp" },
    { href: "/admin/announcements", label: "Announcements" },
    { href: "/admin/session", label: "Session" },
    { href: "/admin/export", label: "Export" },
    { href: "/admin/reset", label: "Reset" },
    { href: "/admin/profile", label: "Profile" }
  ] : [
    { href: `/${role.toLowerCase()}`, label: "Home" }
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-6 right-6 z-[60] w-14 h-14 bg-cyan-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform hover:scale-105 active:scale-95 print:hidden"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm print:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isOpen || mobileOpen ? FULL_W : RAIL_W }}
        transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className={`flex flex-col fixed left-4 top-4 bottom-4 z-50 overflow-hidden
                   rounded-[2rem] border border-white/10
                   bg-[#0b051a]/95 backdrop-blur-3xl
                   shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]
                   justify-between py-4 print:hidden isolate
                   transition-transform duration-300 md:translate-x-0
                   ${mobileOpen ? 'translate-x-0' : '-translate-x-[150%]'}`}
        style={{ minWidth: RAIL_W }}
      >
      {/* Dynamic Flowing Neon Water Background - Clean & Aesthetic */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.15] mix-blend-screen [mask-image:linear-gradient(to_bottom,white_0%,transparent_60%)]"
      >
        <svg className="w-full h-full" viewBox="0 0 100 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sidebarWater" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </linearGradient>
            <filter id="sidebarGlowFilter">
              <feGaussianBlur stdDeviation="12" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            fill="url(#sidebarWater)"
            filter="url(#sidebarGlowFilter)"
            initial={{ d: "M 0,0 L 30,0 C 40,250 10,500 30,750 C 40,900 20,1000 30,1000 L 0,1000 Z" }}
            animate={{ d: [
              "M 0,0 L 30,0 C 40,250 10,500 30,750 C 40,900 20,1000 30,1000 L 0,1000 Z",
              "M 0,0 L 20,0 C 10,250 40,500 20,750 C 10,900 40,1000 20,1000 L 0,1000 Z",
              "M 0,0 L 30,0 C 40,250 10,500 30,750 C 40,900 20,1000 30,1000 L 0,1000 Z"
            ]}}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            fill="url(#sidebarWater)"
            opacity="0.6"
            initial={{ d: "M 0,0 L 40,0 C 60,200 20,400 40,600 C 60,800 30,1000 40,1000 L 0,1000 Z" }}
            animate={{ d: [
              "M 0,0 L 40,0 C 60,200 20,400 40,600 C 60,800 30,1000 40,1000 L 0,1000 Z",
              "M 0,0 L 30,0 C 20,200 60,400 30,600 C 20,800 50,1000 30,1000 L 0,1000 Z",
              "M 0,0 L 40,0 C 60,200 20,400 40,600 C 60,800 30,1000 40,1000 L 0,1000 Z"
            ]}}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden hover:overflow-y-auto overflow-x-hidden relative z-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/50 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:#06b6d4_transparent]">
        {/* Top: logo + pin toggle */}
        <div className="flex items-center px-3 mb-6 gap-2 min-h-[52px]">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 border border-white/10 overflow-hidden">
              <Image
                src="/logo.png"
                alt="Fusion College Logo"
                width={32}
                height={32}
                className="object-contain transition-transform duration-300 group-hover:scale-110"
                priority
              />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <div className="text-[13px] font-black tracking-widest text-white uppercase leading-none">
                    FUSION
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest capitalize leading-none mt-0.5">
                    {role} Portal
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Pin toggle */}
          <AnimatePresence>
            {isOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                onClick={togglePin}
                title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                className="ml-auto shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all cursor-pointer"
              >
                {pinned ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <div className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = ICON_MAP[item.label] || BookOpen;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isOpen ? item.label : undefined}
                className={`relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group min-h-[44px] overflow-hidden ${
                  active ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill-desktop"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/12 to-purple-500/12 rounded-xl border border-cyan-500/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative flex shrink-0 items-center justify-center w-6 h-6">
                  <Icon className={`w-4 h-4 transition-transform duration-300 ${active ? "text-cyan-400" : "text-slate-500 group-hover:scale-110 group-hover:text-cyan-400"}`} />
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom User Area */}
      <div className="px-3 pt-3 mt-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3 h-[44px]">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="text-xs font-bold text-white leading-tight">{name}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{role}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <form action={handleSignOutAction}>
          <SignOutButton isOpen={isOpen} />
        </form>
      </div>
    </motion.aside>
    </>
  );
}

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

function SignOutButton({ isOpen }) {
  const { pending } = useFormStatus();
  return (
    <button
      title={!isOpen ? "Sign Out" : undefined}
      type="submit"
      disabled={pending}
      className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors h-[44px] font-bold cursor-pointer disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4 shrink-0" />
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs uppercase tracking-wider whitespace-nowrap"
          >
            {pending ? "Signing Out..." : "Sign Out"}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
