'use client';

import { useActionState } from 'react';
import { changeSystemPassword } from '@/app/actions/system';
import { IconLoader, IconCheckCircle, IconXCircle, IconLock } from '@/app/components/icons';

export default function ChangePasswordForm() {
  const [state, action, isPending] = useActionState(changeSystemPassword, null);

  return (
    <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 shadow-inner max-w-lg">
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Previous Password</label>
          <input
            type="password"
            name="oldPassword"
            className="w-full rounded-lg border border-[#1e233d] bg-[#0a0c14] px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">New Password</label>
          <input
            type="password"
            name="newPassword"
            className="w-full rounded-lg border border-[#1e233d] bg-[#0a0c14] px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
            minLength={6}
            required
          />
        </div>
        <button type="submit" disabled={isPending} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e233d] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2a304e] disabled:opacity-50 mt-2">
          {isPending ? <IconLoader className="h-5 w-5 animate-spin" /> : <IconLock className="h-5 w-5" />}
          Change Password
        </button>
      </form>
      
      {state?.error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-950/40 border border-red-700/40 text-red-300 text-sm flex items-center gap-2">
          <IconXCircle className="w-4 h-4" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-sm flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4" /> {state.message}
        </div>
      )}
    </div>
  );
}
