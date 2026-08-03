'use client';

import Image from "next/image";
import { motion } from "framer-motion";
import GlobalSearch from "./GlobalSearch";
import LiveClock from "./LiveClock";

export function BrandHeader({
  title = "FUSION LMS",
  subtitle = "FUSION COLLEGE NAROWAL",
}) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Image
          src="/logo.png"
          alt="Fusion College Logo"
          width={42}
          height={42}
          className="rounded-full border border-[rgba(30,34,60,1)] bg-white object-contain shadow-md transition hover:rotate-12"
          priority
        />
      </motion.div>
      <div>
        <div className="text-sm font-black tracking-tight text-white">{title}</div>
        <div className="text-[10px] tracking-wider text-zinc-400 uppercase font-semibold">{subtitle}</div>
      </div>
    </div>
  );
}

export function TopBar() {
  return (
    <div className="sticky top-6 z-[100] w-full px-4 md:px-8 mb-8 print:hidden">
      {/* Floating Pill Container with isolation to fix WebKit SVG scrolling glitches */}
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 w-full relative rounded-3xl bg-[#0b051a]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] px-6 py-3 isolate">
        
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/5 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        
        {/* Dynamic Flowing Neon Water Background - Contained inside the pill */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none z-0 opacity-75 mix-blend-screen overflow-hidden">
          <svg className="w-full h-full scale-110" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="topbarWater" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
              <filter id="topbarGlowFilter">
                <feGaussianBlur stdDeviation="12" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              fill="url(#topbarWater)"
              filter="url(#topbarGlowFilter)"
              initial={{ d: "M 0,0 L 0,30 C 250,40 500,10 750,30 C 900,40 1000,20 1000,30 L 1000,0 Z" }}
              animate={{ d: [
                "M 0,0 L 0,30 C 250,40 500,10 750,30 C 900,40 1000,20 1000,30 L 1000,0 Z",
                "M 0,0 L 0,20 C 250,10 500,40 750,20 C 900,10 1000,40 1000,20 L 1000,0 Z",
                "M 0,0 L 0,30 C 250,40 500,10 750,30 C 900,40 1000,20 1000,30 L 1000,0 Z"
              ]}}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              fill="url(#topbarWater)"
              opacity="0.6"
              initial={{ d: "M 0,0 L 0,40 C 200,60 400,20 600,40 C 800,60 1000,30 1000,40 L 1000,0 Z" }}
              animate={{ d: [
                "M 0,0 L 0,40 C 200,60 400,20 600,40 C 800,60 1000,30 1000,40 L 1000,0 Z",
                "M 0,0 L 0,30 C 200,20 400,60 600,30 C 800,20 1000,50 1000,30 L 1000,0 Z",
                "M 0,0 L 0,40 C 200,60 400,20 600,40 C 800,60 1000,30 1000,40 L 1000,0 Z"
              ]}}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Brand Logo - Top Left */}
        <div className="flex-shrink-0 self-start md:self-auto w-full md:w-[250px] relative z-10">
          <BrandHeader />
        </div>
        
        {/* Global Search - Centered and Big */}
        <div className="flex-1 w-full max-w-3xl relative z-10">
          <GlobalSearch />
        </div>

        {/* Live Clock - Top Right */}
        <div className="hidden lg:flex w-[250px] flex-shrink-0 justify-end relative z-10">
          <LiveClock />
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, icon, rightContent }) {
  return (
    <div className="flex flex-col gap-6 mb-8 relative z-10 w-full">
      
      {/* Page Title with Glowing SVG Icon */}
      {title && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="w-12 h-12 rounded-xl bg-[#0d0f1a] border border-[#1e233d] flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-cyan-500/10" />
                <div className="text-cyan-400 relative z-10 [&>svg]:w-6 [&>svg]:h-6">
                  {icon}
                </div>
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-editorial text-white tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-zinc-400 text-sm mt-1">{description}</p>
              )}
            </div>
          </div>
          {rightContent && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>{rightContent}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PageShell({
  children,
  title,
  description,
  icon,
  rightContent
}) {
  return (
    <div className="relative w-full">
      {/* Background patterns are now in layout.js so we don't need them here */}
      <PageHeader title={title} description={description} icon={icon} rightContent={rightContent} />
      <main className="relative z-10 w-full">
        {children}
      </main>
    </div>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}) {
  return (
    <motion.div
      initial={{ rotateX: 10, y: 15, opacity: 0 }}
      animate={{ rotateX: 0, y: 0, opacity: 1 }}
      whileHover={onClick ? { y: -6, scale: 1.015, rotateX: -2, rotateY: 1.5 } : { y: -3, scale: 1.005, rotateX: -0.5 }}
      whileTap={onClick ? { scale: 0.985 } : {}}
      onClick={onClick}
      className={`relative overflow-hidden glass-panel rounded-3xl p-5 backdrop-blur-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Dynamic Flowing Neon Water Background */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-15 overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-full h-[60%]" viewBox="0 0 100 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cardNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <filter id="cardGlowFilter">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.path
            fill="url(#cardNeonGlow)"
            filter="url(#cardGlowFilter)"
            initial={{ d: "M 0,25 C 20,20 40,30 60,25 C 80,20 90,28 100,25 L 100,50 L 0,50 Z" }}
            animate={{
              d: [
                "M 0,25 C 20,20 40,30 60,25 C 80,20 90,28 100,25 L 100,50 L 0,50 Z",
                "M 0,25 C 25,30 38,18 63,23 C 83,28 92,20 100,25 L 100,50 L 0,50 Z",
                "M 0,25 C 20,20 40,30 60,25 C 80,20 90,28 100,25 L 100,50 L 0,50 Z"
              ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            fill="url(#cardNeonGlow)"
            opacity="0.6"
            initial={{ d: "M 0,32 C 20,28 45,35 65,30 C 80,25 90,32 100,30 L 100,50 L 0,50 Z" }}
            animate={{
              d: [
                "M 0,32 C 20,28 45,35 65,30 C 80,25 90,32 100,30 L 100,50 L 0,50 Z",
                "M 0,32 C 25,35 48,25 68,32 C 82,38 92,28 100,30 L 100,50 L 0,50 Z",
                "M 0,32 C 20,28 45,35 65,30 C 80,25 90,32 100,30 L 100,50 L 0,50 Z"
              ]
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}

export function StatPill({
  label,
  value,
}) {
  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl glossy-border bg-[rgba(10,11,16,0.5)] backdrop-blur-2xl px-5 py-4 relative overflow-hidden group hover:border-[rgba(255,255,255,0.15)] transition-colors"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#7c3aed]/10 to-[#06b6d4]/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 relative z-10 mb-2">
        {label}
      </div>
      <div className="text-2xl font-editorial text-shimmer relative z-10">
        {value}
      </div>
    </motion.div>
  );
}
