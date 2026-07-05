'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user has a valid recovery token in the URL
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      router.push('/login');
    }
  }, [router]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setMessage('Password updated successfully! Redirecting to login...');
    setLoading(false);

    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#16192b]/80 border border-[#2b3052] rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="Fusion College Logo"
            className="w-16 h-16 rounded-full mb-3 shadow-lg border border-[#2b3052] object-contain bg-white"
          />
          <h2 className="text-2xl font-bold text-white tracking-tight">Update Password</h2>
          <p className="text-zinc-400 text-sm mt-1">Enter your new password</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-[#0d0f1a] border border-[#2b3052] rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-[#0d0f1a] border border-[#2b3052] rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3D4193] hover:bg-[#4d52bc] active:bg-[#34377b] text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
