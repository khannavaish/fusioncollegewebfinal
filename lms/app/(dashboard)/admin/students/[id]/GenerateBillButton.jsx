'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { generateIndividualBill } from '@/app/actions/fees';
import { IconDocumentText, IconLoader, IconCheckCircle, IconXCircle, IconAlertTriangle } from '@/app/components/icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function GenerateBillButton({ studentId }) {
  const [state, action, isPending] = useActionState(generateIndividualBill, null);
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (state?.success) {
      // Close modal on success after a short delay
      const timer = setTimeout(() => setIsOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-300 text-xs font-medium hover:bg-[#1e233d] hover:text-white transition-all shadow-sm group"
      >
        <IconDocumentText className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
        Generate Bill
      </button>

      <dialog 
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        className="bg-transparent m-auto backdrop:bg-black/70 backdrop:backdrop-blur-sm p-4 w-full max-w-sm max-h-[calc(100dvh-11rem)] md:max-h-[90vh] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e233d] bg-[#0d0f1a]">
            <div>
              <h2 className="text-sm font-bold text-white">Generate Monthly Bill</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Creates a regular fee bill for this student.</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1e233d] text-zinc-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-5">
            <form action={action} className="space-y-4">
              <input type="hidden" name="studentId" value={studentId} />
              
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Billing Month</label>
                <select name="month" defaultValue={currentMonth} required
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500">
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Fiscal Year</label>
                <select name="year" defaultValue={currentYear} required
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500">
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Due Date (Day)</label>
                <select name="dueDay" defaultValue={10} required
                  className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const suffix = [1, 21, 31].includes(d) ? 'st' : [2, 22].includes(d) ? 'nd' : [3, 23].includes(d) ? 'rd' : 'th';
                    return (
                      <option key={d} value={d}>{d}{suffix} of the month</option>
                    );
                  })}
                </select>
              </div>

              {state?.error && (
                <div className="px-3 py-2.5 rounded-lg bg-red-950/40 border border-red-700/40 text-red-300 text-[11px] font-medium flex items-center gap-2">
                  <IconXCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  {state.error}
                </div>
              )}
              {state?.warning && (
                <div className="px-3 py-2.5 rounded-lg bg-amber-950/40 border border-amber-700/40 text-amber-300 text-[11px] font-medium flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  {state.warning}
                </div>
              )}
              {state?.success && (
                <div className="px-3 py-2.5 rounded-lg bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-[11px] font-medium flex items-center gap-2">
                  <IconCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  Bill generated successfully!
                </div>
              )}

              <div className="pt-2">
                <button type="submit" disabled={isPending}
                  className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isPending ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconDocumentText className="w-4 h-4" />}
                  {isPending ? 'Generating...' : 'Generate Bill Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
