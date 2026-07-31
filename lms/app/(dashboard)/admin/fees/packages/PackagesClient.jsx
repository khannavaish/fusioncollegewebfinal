'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { createFeePackage, updateFeePackage, deleteFeePackage } from '@/app/actions/fees';

import { IconPlus, IconChart, IconAlertTriangle, IconSave, IconTrash, IconXCircle, IconCheckCircle, IconEdit, IconLoader, IconSettings } from '@/app/components/icons';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function PackagesClient({ packages }) {
  const [editId, setEditId] = useState(null);
  const [createState, createAction, createPending] = useActionState(createFeePackage, null);
  const [updateState, updateAction, updatePending] = useActionState(updateFeePackage, null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteFeePackage, null);

  const BADGE_COLORS = [
    'from-cyan-600 to-blue-700',
    'from-violet-600 to-purple-700',
    'from-emerald-600 to-teal-700',
    'from-amber-600 to-orange-700',
    'from-pink-600 to-rose-700',
  ];

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <Link href="/admin/fees" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors mb-3 group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Fee Management
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><IconSettings className="w-6 h-6 text-cyan-400" /> Fee Packages</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Define percentage-based fee tiers. Students are auto-assigned during enrollment.
          </p>
        </div>
        <div className="text-xs text-zinc-500 bg-[#0d0f1a] border border-[#1e233d] rounded-xl px-4 py-2">
          💡 Higher % = better package = lower fee
        </div>
      </div>

      {/* Create Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><IconPlus className="w-4 h-4 text-cyan-400" /> Create New Package</h2>
        <form action={createAction} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Package Name *</label>
            <input name="name" type="text" placeholder="e.g. Scholar" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Min % *</label>
            <input name="minPercentage" type="number" step="0.01" min="0" max="100" placeholder="e.g. 90.00" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Max % *</label>
            <input name="maxPercentage" type="number" step="0.01" min="0" max="100" placeholder="e.g. 100.00" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Monthly Fee (₨) *</label>
            <input name="monthlyFee" type="number" step="1" min="0" placeholder="e.g. 2000" className={inputCls} required />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Description (optional)</label>
            <input name="description" type="text" placeholder="e.g. Full scholarship for top performers" className={inputCls} />
          </div>
          <div className="lg:col-span-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={createPending}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center gap-2">
              {createPending ? <><IconLoader className="w-4 h-4 animate-spin" /> Creating...</> : <><IconCheckCircle className="w-4 h-4" /> Create Package</>}
            </button>
            {createState?.error && <p className="text-red-400 text-sm flex items-center gap-1"><IconXCircle className="w-4 h-4" /> {createState.error}</p>}
            {createState?.success && <p className="text-emerald-400 text-sm flex items-center gap-1"><IconCheckCircle className="w-4 h-4" /> Package created successfully!</p>}
          </div>
        </form>
      </div>

      {/* Packages List */}
      {packages.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-dashed border-[#1e233d] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-zinc-400 font-medium">No fee packages yet</p>
          <p className="text-zinc-600 text-sm mt-1">Create your first package above to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {packages.map((pkg, idx) => (
            <div key={pkg.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden h-full">
              {editId === pkg.id ? (
                <form action={updateAction} className="p-5 space-y-4">
                  <input type="hidden" name="id" value={pkg.id} />
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1"><IconEdit className="w-3 h-3" /> Editing — {pkg.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Package Name</label>
                      <input name="name" type="text" defaultValue={pkg.name} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Min %</label>
                      <input name="minPercentage" type="number" step="0.01" defaultValue={pkg.minPercentage} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Max %</label>
                      <input name="maxPercentage" type="number" step="0.01" defaultValue={pkg.maxPercentage} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Monthly Fee (₨)</label>
                      <input name="monthlyFee" type="number" step="1" defaultValue={pkg.monthlyFee} className={inputCls} required />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Description</label>
                      <input name="description" type="text" defaultValue={pkg.description || ''} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={updatePending}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                      {updatePending ? '⏳' : '💾 Save'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)}
                      className="px-4 py-2 rounded-lg border border-[#1e233d] text-zinc-400 text-sm hover:text-white transition-colors">
                      Cancel
                    </button>
                    {updateState?.error && <p className="text-red-400 text-xs">❌ {updateState.error}</p>}
                  </div>
                </form>
              ) : (
                <div>
                  {/* Gradient header */}
                  <div className={`bg-gradient-to-r ${BADGE_COLORS[idx % BADGE_COLORS.length]} p-5`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                      <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                        {pkg.studentCount} students
                      </span>
                    </div>
                    <p className="text-white/70 text-sm mt-1">
                      {pkg.minPercentage}% – {pkg.maxPercentage}% admission marks
                    </p>
                  </div>
                  {/* Details */}
                  <div className="p-5">
                    <div className="text-3xl font-bold text-white mb-1">
                      ₨{pkg.monthlyFee.toLocaleString()}
                      <span className="text-sm font-normal text-zinc-500">/month</span>
                    </div>
                    {pkg.description && (
                      <p className="text-zinc-500 text-xs mt-1">{pkg.description}</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setEditId(pkg.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-[#1e233d] text-zinc-400 text-xs hover:text-cyan-400 hover:border-cyan-600/40 transition-colors">
                        <IconEdit className="w-3 h-3" /> Edit
                      </button>
                      <form action={deleteAction} className="flex-1">
                        <input type="hidden" name="id" value={pkg.id} />
                        <button type="submit" disabled={deletePending}
                          className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-red-800/30 text-red-400 text-xs hover:bg-red-950/40 transition-colors disabled:opacity-50">
                          <IconTrash className="w-3 h-3" /> Delete
                        </button>
                      </form>
                    </div>
                    {deleteState?.error && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><IconXCircle className="w-3 h-3" /> {deleteState.error}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
