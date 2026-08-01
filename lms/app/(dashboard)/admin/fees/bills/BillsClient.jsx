'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markBillPaid, waiveBill, addBillItem, resendBillWhatsApp, removeBillItem, updateBillAmount, updateStudentFeeAccount } from '@/app/actions/fees';
import { generateBillPDF, getBillFilename } from '@/app/utils/billPdf';
import { IconClipboardCheck, IconDownload, IconCheckCircle, IconXCircle, IconSchool, IconChart, IconDocumentText, IconBolt, IconPlus, IconChatBubble, IconAlertTriangle, IconEdit, IconLoader } from '@/app/components/icons';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  async function handleUpdateBill(e, billId) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', billId);
    const result = await updateBillAmount(fd);
    setLoading(false);
    if (result?.success) { setMsg('✅ Bill updated!'); setTimeout(() => { setActionBillId(null); router.refresh(); }, 1000); }
    else setMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleUpdateAccount(e, studentId) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('studentId', studentId);
    const result = await updateStudentFeeAccount(fd);
    setLoading(false);
    if (result?.success) { setMsg('✅ Account updated!'); setTimeout(() => { setActionBillId(null); router.refresh(); }, 1000); }
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
        const className = bill.student?.class?.name || 'Unassigned';
        // If downloading all classes, group them into folders by class name
        const filePath = !targetClassId ? `${className}/${getBillFilename(bill)}` : getBillFilename(bill);
        zip.file(filePath, pdfBytes);
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
      {/* Back + Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <Link href="/admin/fees" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors mb-3 group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Fee Management
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><IconClipboardCheck className="w-6 h-6 text-cyan-400" /> Fee Bills</h1>
          <p className="text-zinc-400 text-sm mt-1 flex items-center gap-1">
            {monthNames[filters.month - 1]} {filters.year} - {total} bills
            {total > 0 && <> · <span className="text-red-400">{unpaidCount} unpaid</span> · <span className="text-emerald-400">{paidCount} paid</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadClassZIP(filters.classId !== 'ALL' ? filters.classId : null)}
            disabled={zipLoading || bills.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-600/40 bg-violet-950/30 text-violet-300 text-sm font-medium hover:bg-violet-950/60 transition-colors disabled:opacity-50"
          >
            {zipLoading ? <><IconAlertTriangle className="w-4 h-4 animate-spin" /> Generating...</> : <><IconDownload className="w-4 h-4" /> Download All PDFs (ZIP)</>}
          </button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
          {msg}
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-4 flex flex-col gap-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by student name or roll number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060810] border border-[#1e233d] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Month</label>
          <select value={filters.month} onChange={(e) => applyFilter('month', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {monthNames.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Year</label>
          <select value={filters.year} onChange={(e) => applyFilter('year', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconSchool className="w-3 h-3" /> Class</label>
          <select value={filters.classId} onChange={(e) => applyFilter('classId', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="ALL">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5 font-medium flex items-center gap-1"><IconChart className="w-3 h-3" /> Status</label>
          <select value={filters.status} onChange={(e) => applyFilter('status', e.target.value)}
            className="bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="ALL">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="WAIVED">Waived</option>
          </select>
        </div>
          {isPending && <span className="text-xs text-cyan-400 animate-pulse mt-2">Loading...</span>}
        </div>
      </div>

      {/* Bills Table */}
      {(() => {
        const filtered = bills.filter(b => 
          b.student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          b.student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filtered.length === 0) {
          return (
            <div className="bg-[#0d0f1a] border border-dashed border-[#1e233d] rounded-2xl p-12 text-center">
              <div className="flex justify-center mb-3"><IconDocumentText className="w-10 h-10 text-zinc-600" /></div>
              <p className="text-zinc-400 font-medium">No bills found</p>
              <p className="text-zinc-600 text-sm mt-1">
                {total === 0 ? 'Generate bills from the Fee Hub →' : 'Try changing filters or search query'}
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {/* Quick total bar */}
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl px-5 py-3 flex flex-wrap gap-6 text-sm">
              <span className="text-zinc-500 flex items-center gap-1"><IconBolt className="w-4 h-4" /> Total Due: <span className="text-white font-bold">₨{totalDue.toLocaleString()}</span></span>
              <span className="text-zinc-500 flex items-center gap-1"><IconDocumentText className="w-4 h-4" /> Bills: <span className="text-white font-bold">{filtered.length}</span></span>
              <span className="text-zinc-500 flex items-center gap-1"><IconXCircle className="w-4 h-4" /> Unpaid: <span className="text-red-400 font-bold">{filtered.filter(b => b.status === 'UNPAID').length}</span></span>
              <span className="text-zinc-500 flex items-center gap-1"><IconCheckCircle className="w-4 h-4" /> Paid: <span className="text-emerald-400 font-bold">{filtered.filter(b => b.status === 'PAID').length}</span></span>
            </div>

            {filtered.map((bill) => {
              const sc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
              const isOpen = actionBillId === bill.id;

              return (
                <div key={bill.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden flex flex-col">
                  {/* Top: Details */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-5 border-b border-[#1e233d]/50">
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
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                      <span>Father: {bill.student?.fatherName}</span>
                      {bill.student?.admissionPercentage != null && (
                        <span className="flex items-center gap-1"><IconChart className="w-3 h-3" /> {bill.student.admissionPercentage}%</span>
                      )}
                      <span className={`flex items-center gap-1 ${bill.whatsappSent ? 'text-emerald-500' : 'text-zinc-600'}`}>
                        {bill.whatsappSent ? <><IconCheckCircle className="w-3 h-3" /> WA sent</> : <><IconXCircle className="w-3 h-3" /> WA pending</>}
                      </span>
                    </div>
                  </div>

                  {/* Amount & Status Container */}
                  <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <div className="text-left md:text-right">
                      <div className="text-xl font-bold text-white">₨{bill.totalAmount.toLocaleString()}</div>
                      {bill.status === 'PARTIAL' && bill.paidAmount && (
                        <div className="text-xs text-amber-400 mt-0.5">Paid: ₨{bill.paidAmount.toLocaleString()}</div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </div>
                  </div>
                </div>

                {/* Bottom: Actions */}
                <div className="bg-[#0a0c14]/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Edit Fee Account */}
                    <button onClick={() => openPanel(bill.id, 'edit-account')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        isOpen && panelType === 'edit-account'
                          ? 'border-amber-600/60 bg-amber-950/40 text-amber-300'
                          : 'border-[#1e233d] text-zinc-400 hover:text-amber-400 hover:border-amber-600/40'
                      }`}>
                      <IconSchool className="w-3.5 h-3.5" /> Fee Account
                    </button>

                    {/* View Full Bill */}
                    <Link href={`/admin/fees/bills/${bill.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-cyan-400 hover:border-cyan-600/40 text-xs font-medium transition-colors">
                      <IconDocumentText className="w-3.5 h-3.5" /> View Bill
                    </Link>

                    {/* Mark Paid */}
                    {bill.status !== 'PAID' && bill.status !== 'WAIVED' && (
                      <button onClick={() => openPanel(bill.id, 'pay')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isOpen && panelType === 'pay'
                            ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-300'
                            : 'border-[#1e233d] text-zinc-400 hover:text-emerald-400 hover:border-emerald-600/40'
                        }`}>
                        <IconCheckCircle className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}

                    {/* Add Extra Charge */}
                    <button onClick={() => openPanel(bill.id, 'charge')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        isOpen && panelType === 'charge'
                          ? 'border-cyan-600/60 bg-cyan-950/40 text-cyan-300'
                          : 'border-[#1e233d] text-zinc-400 hover:text-cyan-400 hover:border-cyan-600/40'
                      }`}>
                      <IconPlus className="w-3.5 h-3.5" /> Add Charge
                    </button>

                    {/* Edit Base Fee */}
                    <button onClick={() => openPanel(bill.id, 'edit-bill')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        isOpen && panelType === 'edit-bill'
                          ? 'border-amber-600/60 bg-amber-950/40 text-amber-300'
                          : 'border-[#1e233d] text-zinc-400 hover:text-amber-400 hover:border-amber-600/40'
                      }`}>
                      <IconEdit className="w-3.5 h-3.5" /> Edit Amount
                    </button>

                    {/* Waive Bill */}
                    {bill.status !== 'WAIVED' && (
                      <button onClick={() => openPanel(bill.id, 'waive')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          isOpen && panelType === 'waive'
                            ? 'border-violet-600/60 bg-violet-950/40 text-violet-300'
                            : 'border-[#1e233d] text-zinc-400 hover:text-violet-400 hover:border-violet-600/40'
                        }`}>
                        <IconXCircle className="w-3.5 h-3.5" /> Waive Fee
                      </button>
                    )}

                    {/* Resend WhatsApp */}
                    <button onClick={() => handleResendWA(bill.id)} disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-green-400 hover:border-green-600/40 text-xs font-medium transition-colors disabled:opacity-50">
                      <IconChatBubble className="w-3.5 h-3.5" /> Send WhatsApp
                    </button>

                    {/* Download PDF */}
                    <button onClick={() => downloadPDF(bill)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-violet-400 hover:border-violet-600/40 text-xs font-medium transition-colors">
                      <IconDownload className="w-3.5 h-3.5" /> Download PDF
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
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconBolt className="w-3 h-3" /> Amount Paid (₨)</label>
                          <input name="paidAmount" type="number" step="1" min="0" defaultValue={bill.totalAmount}
                            className={inputCls + ' w-32'} required />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconDocumentText className="w-3 h-3" /> Receipt (Img)</label>
                          <input name="receiptImage" type="file" accept="image/*" className="w-48 text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-cyan-900/40 file:text-cyan-400 hover:file:bg-cyan-900/60 transition-colors" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconDocumentText className="w-3 h-3" /> Remarks (optional)</label>
                          <input name="remarks" type="text" placeholder="e.g. Cash received" className={inputCls} />
                        </div>
                        <button type="submit" disabled={loading}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                          {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <><IconCheckCircle className="w-4 h-4" /> Confirm Payment</>}
                        </button>
                      </form>
                    )}

                    {/* Waive panel */}
                    {panelType === 'waive' && (
                      <form onSubmit={(e) => handleWaive(e, bill.id)} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconDocumentText className="w-3 h-3" /> Reason for Waiver</label>
                          <input name="remarks" type="text" placeholder="e.g. Scholarship / Hardship" className={inputCls} required />
                        </div>
                        <button type="submit" disabled={loading}
                          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                          {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <><IconXCircle className="w-4 h-4" /> Waive Bill</>}
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
                            <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconDocumentText className="w-3 h-3" /> Charge Title</label>
                            <input name="title" type="text" placeholder="e.g. Exam Fee" className={inputCls} required />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconBolt className="w-3 h-3" /> Amount (₨)</label>
                            <input name="amount" type="number" step="1" min="0" placeholder="500"
                              className={inputCls + ' w-32'} required />
                          </div>
                          <button type="submit" disabled={loading}
                            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                            {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <><IconPlus className="w-4 h-4" /> Add Charge</>}
                          </button>
                        </form>
                      </div>
                    )}
                    {/* Edit Account panel */}
                    {panelType === 'edit-account' && (
                      <form onSubmit={(e) => handleUpdateAccount(e, bill.student.id)} className="flex flex-wrap gap-3 items-end">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconSchool className="w-3 h-3" /> Fee Package</label>
                          <select name="feePackageId" defaultValue={bill.student.feePackageId || 'NONE'} className={inputCls + ' w-40'}>
                            <option value="NONE">Custom / None</option>
                            <option value={bill.student.feePackageId}>{bill.student.feePackage?.name || 'Current'}</option>
                            {/* We don't have the full packages list here, so we let admin type override below */}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconBolt className="w-3 h-3" /> Monthly Override (₨)</label>
                          <input name="feeMonthlyOverride" type="number" step="1" min="0" defaultValue={bill.student.feeMonthlyOverride} className={inputCls + ' w-40'} placeholder="Leave blank to use package" />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconChart className="w-3 h-3" /> Admission %</label>
                          <input name="admissionPercentage" type="number" step="0.01" min="0" max="100" defaultValue={bill.student.admissionPercentage} className={inputCls + ' w-32'} placeholder="e.g. 95.00" />
                        </div>
                        <button type="submit" disabled={loading}
                          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                          {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <><IconCheckCircle className="w-4 h-4" /> Update Account</>}
                        </button>
                      </form>
                    )}

                    {/* Edit Bill panel */}
                    {panelType === 'edit-bill' && (
                      <div>
                        <form onSubmit={(e) => handleUpdateBill(e, bill.id)} className="flex flex-wrap gap-3 items-end mb-4 pb-4 border-b border-[#1e233d]">
                          <div>
                            <label className="block text-xs text-zinc-500 mb-1 flex items-center gap-1"><IconBolt className="w-3 h-3" /> Base Amount (₨)</label>
                            <input name="baseAmount" type="number" step="1" min="0" defaultValue={bill.baseAmount}
                              className={inputCls + ' w-40'} required />
                          </div>
                          <button type="submit" disabled={loading}
                            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
                            {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <><IconCheckCircle className="w-4 h-4" /> Update Base Fee</>}
                          </button>
                        </form>
                        
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1"><IconDocumentText className="w-4 h-4" /> Extra Charges</p>
                          {bill.items.filter(i => !i.title.includes('Monthly Tuition')).map((item) => (
                            <form key={item.id} action={async (fd) => { fd.set('itemId', item.id); fd.set('billId', bill.id); await removeBillItem(fd); }} className="flex items-center justify-between bg-[#060810] border border-[#1e233d] p-3 rounded-lg">
                              <div>
                                <p className="text-sm text-white font-medium">{item.title}</p>
                                <p className="text-xs text-zinc-500">₨{Number(item.amount).toLocaleString()}</p>
                              </div>
                              <button type="submit" className="w-8 h-8 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 flex items-center justify-center transition-colors">
                                <IconXCircle className="w-4 h-4" />
                              </button>
                            </form>
                          ))}
                          {bill.items.filter(i => !i.title.includes('Monthly Tuition')).length === 0 && (
                            <p className="text-xs text-zinc-600">No extra charges on this bill.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
}
