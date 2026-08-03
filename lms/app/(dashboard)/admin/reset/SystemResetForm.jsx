'use client';

import { useActionState } from 'react';
import { resetSchoolData } from '@/app/actions/admin';
import { IconLoader, IconTrash, IconXCircle, IconCheckCircle } from '@/app/components/icons';

export default function SystemResetForm() {
  const [state, action, isPending] = useActionState(resetSchoolData, null);

  return (
    <div className="bg-[#0d0f1a] border border-red-500/30 rounded-xl p-6 shadow-inner max-w-lg">
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">System Password to confirm</label>
          <input
            type="password"
            name="systemPassword"
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#1e233d] bg-[#0a0c14] px-4 py-3 text-base font-mono text-white placeholder-zinc-700 focus:border-red-500 focus:outline-none transition-colors"
            required
          />
        </div>
        <p className="text-xs text-zinc-500 mb-2">
          This completely wipes the academic roster and its linked records. It does not remove the admin account or system settings.
        </p>
        <button type="submit" disabled={isPending} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-50">
          {isPending ? <IconLoader className="h-5 w-5 animate-spin" /> : <IconTrash className="h-5 w-5" />} 
          {isPending ? 'Resetting System...' : 'Permanently Reset Roster'}
        </button>
      </form>
      
      {state?.error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-950/40 border border-red-700/40 text-red-300 text-sm flex items-center gap-2">
          <IconXCircle className="w-4 h-4 flex-shrink-0" /> {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-sm flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" /> System has been completely reset.
        </div>
      )}
    </div>
  );
}
