'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          // User is logged in, redirect to dashboard
          router.push('/');
        } else {
          // Check if this is a password reset flow
          const hash = window.location.hash;
          if (hash.includes('type=recovery')) {
            // Password reset flow - redirect to update password page
            router.push('/update-password');
          } else {
            // No session and not password reset, redirect to login
            router.push('/login');
          }
        }
      } catch (err) {
        setError('An error occurred during authentication');
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center font-sans">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#16192b]/80 border border-[#2b3052] rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-[#3D4193] hover:bg-[#4d52bc] text-white font-semibold py-3 rounded-lg cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
