'use client';

import { useActionState } from 'react';
import { generateMonthlyBills } from '@/app/actions/fees';
import { IconBolt, IconCheckCircle, IconXCircle, IconLoader, IconAlertTriangle } from '@/app/components/icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BillingExecutionForm({ month, year }) {
  const [state, action, isPending] = useActionState(generateMonthlyBills, null);

  return (
    <>
      <form action={action} className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Billing Month</label>
          <select name="month" defaultValue={month}
            className="w-full sm:w-40 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all">
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Fiscal Year</label>
          <select name="year" defaultValue={year}
            className="w-full sm:w-32 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all">
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Due Date</label>
          <select name="dueDay" defaultValue={10}
            className="w-full sm:w-48 bg-[#060810] border border-[#1e233d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const suffix = [1, 21, 31].includes(d) ? 'st' : [2, 22].includes(d) ? 'nd' : [3, 23].includes(d) ? 'rd' : 'th';
              return (
                <option key={d} value={d}>{d}{suffix} of the month</option>
              );
            })}
          </select>
        </div>
        <button type="submit" disabled={isPending}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
          {isPending ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconBolt className="w-4 h-4" />}
          {isPending ? 'Executing...' : 'Execute Billing Cycle'}
        </button>
      </form>
      
      {state?.error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-950/40 border border-red-700/40 text-red-300 text-sm font-medium flex items-center gap-2">
          <IconXCircle className="w-4 h-4 text-red-400" />
          {state.error}
        </div>
      )}
      {state?.warning && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-amber-950/40 border border-amber-700/40 text-amber-300 text-sm font-medium flex items-center gap-2">
          <IconAlertTriangle className="w-4 h-4 text-amber-400" />
          {state.warning}
        </div>
      )}
      {state?.success && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-sm font-medium flex items-center gap-2">
          <IconCheckCircle className="w-4 h-4 text-emerald-400" />
          Billing executed successfully! Created {state.created} bills (Skipped {state.skipped}).
        </div>
      )}
    </>
  );
}
