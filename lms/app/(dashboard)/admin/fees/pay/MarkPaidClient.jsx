'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { updateBillAmount } from '@/app/actions/fees';
import { IconSearch, IconFilter, IconCheckCircle, IconXCircle, IconUpload, IconSchool } from '@/app/components/icons';
import Link from 'next/link';
import ClientPortal from '@/app/components/ClientPortal';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner";

export default function MarkPaidClient({ bills, classes, filters, monthNames }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState('');
  
  // Modal state
  const [actionBillId, setActionBillId] = useState(null);
  const [loading, setLoading] = useState(false);

  function applyFilter(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (value === 'ALL') params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.push(`/admin/fees/pay?${params.toString()}`);
    });
  }

  async function handleMarkPaid(e, billId) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const fd = new FormData(e.target);
    fd.set('billId', billId);
    
    // In updateBillAmount, it sets status based on amount vs totalAmount automatically
    const result = await updateBillAmount(fd);
    setLoading(false);
    
    if (result?.success) {
      setMsg('✅ Bill marked as paid successfully!');
      setActionBillId(null);
      router.refresh();
    } else {
      setMsg('❌ ' + (result?.error || 'Failed to update bill'));
    }
  }

  const filteredBills = bills.filter(b => 
    b.student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeBill = bills.find(b => b.id === actionBillId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <Link href="/admin/fees" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors mb-3 group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Fee Management
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <IconCheckCircle className="w-6 h-6 text-emerald-400" /> Fast Mark Paid
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Quickly process incoming fee payments for {monthNames[filters.month - 1]} {filters.year}. Only unpaid or partial bills are shown.</p>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-4 flex flex-col gap-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search student name or roll number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060810] border border-[#1e233d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <IconSearch className="w-5 h-5" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Month</label>
            <select value={filters.month} onChange={(e) => applyFilter('month', e.target.value)}
              className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Year</label>
            <select value={filters.year} onChange={(e) => applyFilter('year', e.target.value)}
              className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1">
              <IconSchool className="w-3 h-3" /> Class
            </label>
            <select value={filters.classId} onChange={(e) => applyFilter('classId', e.target.value)}
              className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              <option value="ALL">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {isPending && <span className="text-xs text-cyan-400 animate-pulse mt-2">Loading...</span>}
        </div>
      </div>

      {/* Bill List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500 bg-[#0d0f1a] border border-[#1e233d] rounded-2xl">
            No unpaid bills found for this selection.
          </div>
        ) : (
          filteredBills.map(bill => (
            <div key={bill.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-black/20 hover:border-cyan-900/50 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-white text-base">{bill.student.name}</div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${bill.status === 'PARTIAL' ? 'bg-amber-950/40 text-amber-400 border-amber-900/50' : 'bg-red-950/40 text-red-400 border-red-900/50'}`}>
                    {bill.status}
                  </div>
                </div>
                <div className="text-xs text-zinc-400 mb-4 font-mono">{bill.student.rollNumber} · {bill.student.class?.name || 'No Class'}</div>
                
                <div className="flex justify-between items-end border-t border-white/5 pt-3 mb-4">
                  <div className="text-xs text-zinc-500">
                    <div className="mb-1">Total Bill</div>
                    {bill.paidAmount > 0 && <div className="text-amber-500">Already Paid</div>}
                    <div className="font-bold text-zinc-300 mt-1">Remaining Due</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-bold text-white">₨{bill.totalAmount.toLocaleString()}</div>
                    {bill.paidAmount > 0 && <div className="text-amber-500">- ₨{bill.paidAmount.toLocaleString()}</div>}
                    <div className="font-black text-emerald-400 text-lg mt-1">₨{(bill.totalAmount - (bill.paidAmount || 0)).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              <button onClick={() => setActionBillId(bill.id)}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2">
                <IconCheckCircle className="w-4 h-4" /> Process Payment
              </button>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {actionBillId && activeBill && (
        <ClientPortal>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setActionBillId(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm max-h-[90vh] flex flex-col bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl"
            >
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 rounded-t-3xl">
                <div>
                  <h2 className="text-base font-black text-white">Process Payment</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{activeBill.student.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActionBillId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <IconXCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-6 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                <form onSubmit={(e) => handleMarkPaid(e, activeBill.id)} className="space-y-5">
                  
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-xs text-zinc-400 font-bold uppercase">Remaining Balance</span>
                    <span className="text-xl font-black text-emerald-400">₨{(activeBill.totalAmount - (activeBill.paidAmount || 0)).toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Amount Received (₨) <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₨</span>
                      <input 
                        type="number" 
                        name="amount" 
                        defaultValue={activeBill.totalAmount - (activeBill.paidAmount || 0)} 
                        required 
                        min="1" 
                        max={activeBill.totalAmount - (activeBill.paidAmount || 0)} 
                        step="0.01" 
                        className={`${inputCls} pl-10 text-lg font-bold text-emerald-300`} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Payment Photo/Receipt (Optional)</label>
                    <div className="relative group">
                      <input type="file" name="receipt" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="w-full bg-white/5 group-hover:bg-white/10 border border-white/10 border-dashed rounded-xl px-4 py-6 flex flex-col items-center justify-center text-center transition-colors">
                        <IconUpload className="w-6 h-6 text-cyan-400 mb-2" />
                        <span className="text-sm font-medium text-white">Tap to upload receipt</span>
                        <span className="text-xs text-zinc-500 mt-1">Image or PDF (Max 2MB)</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconCheckCircle className="w-5 h-5" />}
                    {loading ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </ClientPortal>
      )}
    </div>
  );
}
