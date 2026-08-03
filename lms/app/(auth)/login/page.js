'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'inactive') {
        setError('Your account has been deactivated. Please contact administration.');
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setAuthSuccess(true);
    // Force a hard navigation so the session cookies are fully respected by the server
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#05050f] flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-violet-700/12 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[35%] h-[35%] bg-indigo-600/8 rounded-full blur-[120px]" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Floating animated lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px w-full"
            style={{ top: `${20 + i * 22}%`, background: `linear-gradient(to right, transparent, rgba(6,182,212,${0.08 + i * 0.03}), transparent)` }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 12 + i * 4, repeat: Infinity, ease: 'linear', delay: i * 2 }}
          />
        ))}
      </div>

      {mounted && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Outer glow ring */}
          <div className="absolute -inset-[1px] rounded-[2rem] bg-gradient-to-br from-cyan-500/30 via-violet-500/20 to-transparent blur-sm pointer-events-none" />

          {/* Card */}
          <div className="relative rounded-[2rem] bg-[#0b051a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden">

            {/* Top neon bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />

            {/* Inner ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />

            <div className="p-8 relative z-10">

              {/* Logo + Title */}
              <div className="flex flex-col items-center mb-10">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                  className="relative mb-5"
                >
                  {/* Glow behind logo */}
                  <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-xl scale-150" />
                  <div className="relative w-20 h-20 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center overflow-hidden shadow-xl">
                    <img src="/logo.png" alt="Fusion College Logo" className="w-14 h-14 object-contain" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <h1 className="text-2xl font-black tracking-widest text-white uppercase">Fusion College</h1>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-400/80 mt-1">Learning Management System</p>
                </motion.div>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2.5"
                  >
                    <span className="text-red-400 shrink-0 mt-0.5">⚠</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 focus:bg-white/[0.06] transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 focus:bg-white/[0.06] transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                  <a href="/reset-password" className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors font-medium">
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  id="login-submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="relative w-full overflow-hidden rounded-xl py-3.5 font-black uppercase tracking-widest text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {/* Gradient fill */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-cyan-500 to-violet-600" />
                  {/* Shine sweep */}
                  {!loading && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Sign In to Portal</>
                    )}
                  </span>
                </motion.button>
              </form>

              {/* Footer */}
              <p className="text-center text-[10px] text-zinc-600 font-medium mt-8 uppercase tracking-widest">
                Fusion College Narowal • Secure Portal
              </p>

            </div>

            {/* Bottom neon bar */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          </div>
        </motion.div>
      )}

      {/* Full-screen loading overlay on successful auth */}
      <AnimatePresence>
        {authSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] bg-[#080a14] flex flex-col items-center justify-center"
          >
            <div className="absolute inset-0 bg-grid-glow pointer-events-none opacity-50" />
            <div className="relative flex flex-col items-center z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-32 h-32 flex items-center justify-center mb-6"
              >
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <img src="/logo.png" alt="Fusion College Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse" />
              </motion.div>
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-shimmer text-sm font-bold uppercase tracking-[0.3em]"
              >
                Loading Portal...
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
