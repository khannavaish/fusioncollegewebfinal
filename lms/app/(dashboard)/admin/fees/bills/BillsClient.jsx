'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markBillPaid, waiveBill, addBillItem, resendBillWhatsApp } from '@/app/actions/fees';
import { generateBillPDF, getBillFilename } from '@/app/utils/billPdf';

const STATUS_CONFIG = {
  UNPAID:  { label: 'Unpaid',  bg: 'bg-red-950/60 border-red-800/50',     text: 'text-red-400',     dot: 'bg-red-500'   },
  PAID:    { label: 'Paid',    bg: 'bg-emerald-950/60 border-emerald-800/50', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  PARTIAL: { label: 'Partial', bg: 'bg-amber-950/60 border-amber-800/50',  text: 'text-amber-400',   dot: 'bg-amber-500'  },
  WAIVED:  { label: 'Waived',  bg: 'bg-violet-950/60 border-violet-800/50',text: 'text-violet-400',  dot: 'bg-violet-500' },
};

const inputCls = "w-full bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function BillsClient({ bills, classes, filters, monthNames }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionBillId, setActionBillId] = useState(null); // which bill's panel is open
  const [panelType, setPanelType] = useState(null);       // 'pay' | 'waive' | 'charge'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [zipLoading, setZipLoading] = useState(false);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  function applyFilter(key, value) {
    const params = new URLSearchParams();
    params.set('month',   key === 'month'   ? value : filters.month);
    params.set('year',    key === 'year'    ? value : filters.year);
    params.set('status',  key === 'status'  ? value : filters.status);
    params.set('classId', key === 'classId' ? value : filters.classId);
    startTransition(() => router.push(`/admin/fees/bills?${params.toString()}`));
  }

  function openPanel(billId, type) {
    setActionBillId(billId === actionBillId && panelType === type ? null : billId);
    setPanelType(type);
    setMsg('');
  }

  // ── Bill Actions ───────────────────────────────────────────────────────────
  async function handleMarkPaid(e, billId) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', billId);
    const result = await markBillPaid(fd);
    setLoading(false);
    if (result?.success) { setMsg('✅ Marked as paid!'); setTimeout(() => { setActionBillId(null); router.refresh(); }, 1000); }
    else setMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleWaive(e, billId) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', billId);
    const result = await waiveBill(fd);
    setLoading(false);
    if (result?.success) { setMsg('✅ Bill waived!'); setTimeout(() => { setActionBillId(null); router.refresh(); }, 1000); }
    else setMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleAddCharge(e, billId) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', billId);
    const result = await addBillItem(fd);
    setLoading(false);
    if (result?.success) { e.target.reset(); setMsg('✅ Charge added!'); setTimeout(() => { setActionBillId(null); router.refresh(); }, 1000); }
    else setMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleResendWA(billId) {
    setLoading(true);
    const fd = new FormData();
    fd.set('billId', billId);
    const result = await resendBillWhatsApp(fd);
    setLoading(false);
    setMsg(result?.success ? `✅ WhatsApp sent to ${result.sent} parent(s)` : '❌ ' + (result?.error || 'Failed'));
    setTimeout(() => setMsg(''), 3000);
  }

  // ── Individual PDF Download ────────────────────────────────────────────────
  async function downloadPDF(bill) {
    try {
      const doc = await generateBillPDF(bill);
      doc.save(getBillFilename(bill));
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    }
  }

  // ── Class ZIP Download ─────────────────────────────────────────────────────
  async function downloadClassZIP(targetClassId) {
    setZipLoading(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      const classBills = bills.filter((b) => !targetClassId || b.student?.class?.id === targetClassId);
      for (const bill of classBills) {
        const doc = await generateBillPDF(bill);
        const pdfBytes = doc.output('arraybuffer');
        zip.file(getBillFilename(bill), pdfBytes);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cls = classes.find((c) => c.id === targetClassId);
      a.href = url;
      a.download = `Fee_Bills_${cls ? cls.name.replace(/\s+/g,'_') : 'All'}_${monthNames[filters.month - 1]}_${filters.year}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('ZIP generation failed: ' + err.message);
    }
    setZipLoading(false);
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const total       = bills.length;
  const unpaidCount = bills.filter((b) => b.status === 'UNPAID').length;
  const paidCount   = bills.filter((b) => b.status === 'PAID').length;
  const totalDue    = bills.reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Fee Bills</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {monthNames[filters.month - 1]} {filters.year} — {total} bills
            {total > 0 && <> · <span className="text-red-400">{unpaidCount} unpaid</span> · <span className="text-emerald-400">{paidCount} paid</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadClassZIP(filters.classId !== 'ALL' ? filters.classId : null)}
            disabled={zipLoading || bills.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-600/40 bg-violet-950/30 text-violet-300 text-sm font-medium hover:bg-violet-950/60 transition-colors disabled:opacity-50"
          >
            {zipLoading ? '⏳ Generating...' : '📦 Download ZIP'}
          </button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium">📅 Month</label>
          <select value={filters.month} onChange={(e) => applyFilter('month', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium">📆 Year</label>
          <select value={filters.year} onChange={(e) => applyFilter('year', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium">🎓 Class</label>
          <select value={filters.classId} onChange={(e) => applyFilter('classId', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="ALL">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium">📊 Status</label>
          <select value={filters.status} onChange={(e) => applyFilter('status', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="ALL">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="WAIVED">Waived</option>
          </select>
        </div>
        {isPending && <span className="text-xs text-cyan-400 animate-pulse">Loading...</span>}
      </div>

      {/* Bills Table */}
      {bills.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-dashed border-[#1e233d] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-zinc-400 font-medium">No bills found</p>
          <p className="text-zinc-600 text-sm mt-1">
            {total === 0 ? 'Generate bills from the Fee Hub →' : 'Try changing the filters above'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Quick total bar */}
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl px-5 py-3 flex flex-wrap gap-6 text-sm">
            <span className="text-zinc-500">💰 Total Due: <span className="text-white font-bold">₨{totalDue.toLocaleString()}</span></span>
            <span className="text-zinc-500">📄 Bills: <span className="text-white font-bold">{total}</span></span>
            <span className="text-zinc-500">❌ Unpaid: <span className="text-red-400 font-bold">{unpaidCount}</span></span>
            <span className="text-zinc-500">✅ Paid: <span className="text-emerald-400 font-bold">{paidCount}</span></span>
          </div>

          {bills.map((bill) => {
            const sc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
            const isOpen = actionBillId === bill.id;

            return (
              <div key={bill.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden">
                {/* Main row */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 p-4">
                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{bill.student?.name}</span>
                      <span className="text-xs text-zinc-500 font-mono">{bill.student?.rollNumber}</span>
                      <span className="text-xs text-zinc-600">{bill.student?.class?.name}</span>
                      {bill.student?.feePackage && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300">
                          {bill.student.feePackage.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>Father: {bill.student?.fatherName}</span>
                      {bill.student?.admissionPercentage != null && (
                        <span>📊 {bill.student.admissionPercentage}%</span>
                      )}
                      <span className={bill.whatsappSent ? 'text-emerald-500' : 'text-zinc-600'}>
                        {bill.whatsappSent ? '✅ WA sent' : '📵 WA pending'}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right md:min-w-[120px]">
                    <div className="text-lg font-bold text-white">₨{bill.totalAmount.toLocaleString()}</div>
                    {bill.status === 'PARTIAL' && bill.paidAmount && (
                      <div className="text-xs text-amber-400">Paid: ₨{bill.paidAmount.toLocaleString()}</div>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5">
                    <Link href={`/admin/fees/bills/${bill.id}`}
                      className="px-2.5 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 text-xs hover:text-cyan-400 hover:border-cyan-600/40 transition-colors">
                      👁️
                    </Link>
                    {bill.status !== 'PAID' && bill.status !== 'WAIVED' && (
                      <button onClick={() => openPanel(bill.id, 'pay')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${isOpen && panelType === 'pay' ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-300' : 'border-[#1e233d] text-zinc-400 hover:text-emerald-400'}`}>
                        💳
                      </button>
                    )}
                    <button onClick={() => openPanel(bill.id, 'charge')}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${isOpen && panelType === 'charge' ? 'border-cyan-600/60 bg-cyan-950/40 text-cyan-300' : 'border-[#1e233d] text-zinc-400 hover:text-cyan-400'}`}>
                      ➕
                    </button>
                    {bill.status !== 'WAIVED' && (
                      <button onClick={() => openPanel(bill.id, 'waive')}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${isOpen && panelType === 'waive' ? 'border-violet-600/60 bg-violet-950/40 text-violet-300' : 'border-[#1e233d] text-zinc-400 hover:text-violet-400'}`}>
                        🚫
                      </button>
                    )}
                    <button onClick={() => handleResendWA(bill.id)} disabled={loading}
                      className="px-2.5 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 text-xs hover:text-green-400 transition-colors disabled:opacity-50">
                      📲
                    </button>
                    <button onClick={() => downloadPDF(bill)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 text-xs hover:text-violet-400 transition-colors">
                      📄
                    </button>
                  </div>
                </div>

                {/* Expandable action panels */}
                {isOpen && (
                  <div className="border-t border-[#1e233d] bg-[#0a0c14] p-4">
                    {msg && actionBillId === bill.id && (
                      <p className={`text-xs mb-3 font-medium ${msg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>
                    )}

                    {/* Mark Paid panel */}
                    {panelType === 'pay' && (
                      <form onSubmit={(e) => handleMarkPaid(e, bill.id)} className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">💳 Amount Paid (₨)</label>
                          <input name="paidAmount" type="number" step="1" min="0" defaultValue={bill.totalAmount}
                            className={inputCls + ' w-40'} required />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-zinc-500 mb-1">📝 Remarks (optional)</label>
                          <input name="remarks" type="text" placeholder="e.g. Cash received" className={inputCls} />
                        </div>
                        <button type="submit" disabled={loading}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                          {loading ? '⏳' : '✅ Confirm Payment'}
                        </button>
                      </form>
                    )}

                    {/* Waive panel */}
                    {panelType === 'waive' && (
                      <form onSubmit={(e) => handleWaive(e, bill.id)} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-zinc-500 mb-1">📝 Reason for Waiver</label>
                          <input name="remarks" type="text" placeholder="e.g. Scholarship / Hardship" className={inputCls} required />
                        </div>
                        <button type="submit" disabled={loading}
                          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                          {loading ? '⏳' : '🚫 Waive Bill'}
                        </button>
                      </form>
                    )}

                    {/* Add charge panel */}
                    {panelType === 'charge' && (
                      <div>
                        {/* Existing items */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {bill.items.map((item) => (
                            <span key={item.id} className="text-xs px-3 py-1 rounded-full bg-[#0d0f1a] border border-[#1e233d] text-zinc-300">
                              {item.title}: ₨{item.amount.toLocaleString()}
                            </span>
                          ))}
                        </div>
                        <form onSubmit={(e) => handleAddCharge(e, bill.id)} className="flex flex-wrap gap-3 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1">📋 Charge Title</label>
                            <input name="title" type="text" placeholder="e.g. Exam Fee" className={inputCls} required />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1">💰 Amount (₨)</label>
                            <input name="amount" type="number" step="1" min="0" placeholder="500"
                              className={inputCls + ' w-32'} required />
                          </div>
                          <button type="submit" disabled={loading}
                            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                            {loading ? '⏳' : '➕ Add Charge'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
