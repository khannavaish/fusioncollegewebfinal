'use client';

import { useActionState, useEffect, useState } from 'react';
import { createGeneralCharge, deleteGeneralCharge, toggleGeneralCharge } from '@/app/actions/generalCharges';
import { IconCheckCircle, IconXCircle, IconTrash, IconPlus, IconChevronRight } from '@/app/components/icons';
import AnimatedSection from '@/app/components/AnimatedSection';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function GeneralChargesClient({ initialCharges }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createGeneralCharge, null);
  const [msg, setMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (state?.success) {
      setMsg('✅ Charge created successfully!');
      setTimeout(() => setMsg(''), 3000);
      document.getElementById('add-charge-form').reset();
    } else if (state?.error) {
      setMsg('❌ ' + state.error);
      setTimeout(() => setMsg(''), 3000);
    }
  }, [state]);

  async function handleToggle(id, currentStatus) {
    setIsUpdating(true);
    const res = await toggleGeneralCharge(id, !currentStatus);
    setIsUpdating(false);
    if (res?.error) {
      setMsg('❌ ' + res.error);
      setTimeout(() => setMsg(''), 3000);
    } else {
      router.refresh();
    }
  }

  async function handleDelete(e) {
    if (!confirm('Delete this general charge? It will not affect existing generated bills.')) {
      e.preventDefault();
    }
  }

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <Link href="/admin/fees" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold mb-2 transition-colors">
              <IconChevronRight className="w-4 h-4 rotate-180" /> Back to Fees
            </Link>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">General Charges</h1>
            <p className="text-zinc-400 text-sm mt-1">Manage charges (like Sports Fee, Exam Fee) that apply to all new monthly fee bills.</p>
          </div>
        </div>
      </AnimatedSection>

      {msg && (
        <AnimatedSection delay={0.2}>
          <div className={`px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
            {msg.startsWith('✅') ? <IconCheckCircle className="w-4 h-4" /> : <IconXCircle className="w-4 h-4" />}
            {msg.replace(/^[✅❌]\s*/, '')}
          </div>
        </AnimatedSection>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnimatedSection delay={0.3} className="lg:col-span-1">
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6">Create New Charge</h2>
            <form id="add-charge-form" action={formAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Charge Title</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Sports Fee"
                  required
                  className="w-full bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Amount (PKR)</label>
                <input
                  type="number"
                  name="amount"
                  placeholder="e.g. 500"
                  required
                  min="0"
                  step="0.01"
                  className="w-full bg-[#16192b] border border-[#1e233d] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 mt-2"
              >
                {isPending ? 'Saving...' : <><IconPlus className="w-5 h-5" /> Add Charge</>}
              </button>
            </form>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.4} className="lg:col-span-2">
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden shadow-2xl">
            {initialCharges.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-[#16192b] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#1e233d]">
                  <IconXCircle className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-bold text-white">No General Charges</h3>
                <p className="text-sm text-zinc-500 mt-2">Add a charge using the form to have it automatically applied to monthly bills.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#16192b]/50 border-b border-[#1e233d]">
                      <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-zinc-400">Title</th>
                      <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-zinc-400">Amount</th>
                      <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-zinc-400">Status</th>
                      <th className="py-4 px-6 text-xs font-black uppercase tracking-wider text-zinc-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e233d]">
                    {initialCharges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-[#16192b]/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white">{charge.title}</div>
                          <div className="text-xs text-zinc-500">Added {new Date(charge.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-emerald-400 font-bold">₨ {Number(charge.amount).toLocaleString()}</div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggle(charge.id, charge.isActive)}
                            disabled={isUpdating}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                              charge.isActive ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/50' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-zinc-800'
                            }`}
                          >
                            {charge.isActive ? 'Active (Applied)' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <form action={deleteGeneralCharge} onSubmit={handleDelete} className="inline">
                            <input type="hidden" name="id" value={charge.id} />
                            <button type="submit" className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-400/10 transition-colors" title="Delete Charge">
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
