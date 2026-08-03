'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateStudentFee } from '@/app/actions/admin';
import { IconEdit } from '@/app/components/icons';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 pb-28 px-4 md:pt-0 md:pb-0 md:items-center md:p-6 bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative w-full max-w-lg flex flex-col bg-[#0c0e1a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 rounded-t-3xl">
          <h2 className="text-base font-black text-white tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto max-h-full md:max-h-[90vh] md:max-h-[75vh] scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function EditFeeButton({ student, feePackages }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [admissionPct, setAdmissionPct] = useState(student.admissionPercentage?.toString() || '');
  const [suggestedPkg, setSuggestedPkg] = useState(null);
  const [manualPkgId, setManualPkgId] = useState(student.feePackageId || (student.feeMonthlyOverride ? 'CUSTOM' : ''));

  // Auto-suggest fee package based on admission percentage
  useEffect(() => {
    if (!admissionPct || feePackages.length === 0) {
      setSuggestedPkg(null);
      return;
    }
    const pct = parseFloat(admissionPct);
    if (isNaN(pct)) return;
    const match = feePackages.find(p => pct >= p.minPercentage && pct <= p.maxPercentage);
    setSuggestedPkg(match || null);
  }, [admissionPct, feePackages]);

  async function handleAction(formData) {
    startTransition(async () => {
      const result = await updateStudentFee(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-6 h-6 flex items-center justify-center rounded bg-[#1e233d] hover:bg-cyan-900/50 text-zinc-400 hover:text-cyan-400 transition-colors"
        title="Edit Fee Assignment"
      >
        <IconEdit className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <Modal title="Edit Fee Assignment" onClose={() => setIsOpen(false)}>
          <form action={handleAction} className="space-y-4">
            <input type="hidden" name="id" value={student.id} />
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Admission Percentage</label>
              <input
                name="admissionPercentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={admissionPct}
                onChange={(e) => setAdmissionPct(e.target.value)}
                placeholder="e.g. 87.50"
                className={inputCls}
              />
              {suggestedPkg && (
                <p className="text-[10px] text-cyan-400 mt-1.5 flex items-center gap-1">
                  ✅ Matches: <span className="font-bold">{suggestedPkg.name}</span> - ₨{Number(suggestedPkg.monthlyFee).toLocaleString()}/month
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Fee Package</label>
              <select
                name="feePackageId"
                value={manualPkgId}
                onChange={(e) => setManualPkgId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select Package</option>
                {feePackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₨{Number(p.monthlyFee).toLocaleString()}/mo ({p.minPercentage}–{p.maxPercentage}%)
                  </option>
                ))}
                <option value="CUSTOM">⚙️ Custom (Override)</option>
              </select>
            </div>

            {manualPkgId === 'CUSTOM' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Custom Monthly Fee (₨)</label>
                <input
                  name="feeMonthlyOverride"
                  type="number"
                  defaultValue={student.feeMonthlyOverride || ''}
                  placeholder="Amount"
                  className={inputCls}
                  required
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button type="button" onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-white hover:bg-[#1e233d] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
