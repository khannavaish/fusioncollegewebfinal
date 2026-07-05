'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction } from '@/app/actions/passwordReset';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await requestPasswordResetAction(email.trim().toLowerCase());

    if (result.error) {
      setError(result.error);
    } else {
      setMessage(result.message);
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#16192b]/80 border border-[#2b3052] rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="Fusion College Logo"
            className="w-16 h-16 rounded-full mb-3 shadow-lg border border-[#2b3052] object-contain bg-white"
          />
          <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password?</h2>
          <p className="text-zinc-400 text-sm mt-1 text-center">
            Enter your Fusion College email and we&apos;ll notify the Admin to reset it.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success state */}
        {submitted && message ? (
          <div className="space-y-6">
            <div className="p-5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-lg mt-0.5">✅</span>
                <div>
                  <p className="font-semibold mb-1">Request Submitted!</p>
                  <p className="text-emerald-300/80">{message}</p>
                </div>
              </div>
            </div>

            {/* How it works card */}
            <div className="bg-[#1e233d]/60 border border-[#2b3052] rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">What happens next?</p>
              <div className="space-y-2.5">
                {[
                  { icon: '🔔', text: 'The Admin receives your reset request in the portal.' },
                  { icon: '🔑', text: 'Admin generates a new temporary password for you.' },
                  { icon: '📲', text: 'The new password is sent directly to your registered WhatsApp number.' },
                  { icon: '🔐', text: 'Log in with the temporary password and update it in your profile.' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base">{step.icon}</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/login"
              className="block w-full text-center bg-[#3D4193] hover:bg-[#4d52bc] text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          /* Request form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Fusion College Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@fusion.edu.pk"
                required
                className="w-full bg-[#0d0f1a] border border-[#2b3052] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
              />
              <p className="mt-2 text-xs text-zinc-600">
                This must be the email registered in our system. Personal Gmail/Yahoo addresses won&apos;t work.
              </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5">
              <span className="text-amber-400 text-base mt-0.5">ℹ️</span>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Unlike standard email resets, your new password will be sent to your <strong className="text-amber-300">registered WhatsApp</strong> by the Admin for security.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3D4193] hover:bg-[#4d52bc] active:bg-[#34377b] text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notify Admin
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
