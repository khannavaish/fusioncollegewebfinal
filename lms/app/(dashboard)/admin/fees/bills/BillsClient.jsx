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
  const [actionBillId, setActionBillId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [panelType, setPanelType] = useState(null);
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

            {(() => {
              const grouped = Object.values(filtered.reduce((acc, bill) => {
                if (!acc[bill.studentId]) {
                  acc[bill.studentId] = {
                    student: bill.student,
                    bills: [],
                    totalBilled: 0,
                    totalPaid: 0,
                    whatsappSent: true,
                    status: 'UNPAID'
                  };
                }
                acc[bill.studentId].bills.push(bill);
                acc[bill.studentId].totalBilled += Number(bill.totalAmount);
                if (bill.status === 'PAID') acc[bill.studentId].totalPaid += Number(bill.totalAmount);
                else if (bill.status === 'PARTIAL') acc[bill.studentId].totalPaid += Number(bill.paidAmount || 0);
                if (!bill.whatsappSent) acc[bill.studentId].whatsappSent = false;
                return acc;
              }, {}));

              grouped.forEach(g => {
                if (g.totalPaid === 0) g.status = 'UNPAID';
                else if (g.totalPaid >= g.totalBilled) g.status = 'PAID';
                else g.status = 'PARTIAL';
              });

              return grouped.map((group) => {
                const isGroupOpen = expandedGroupId === group.student.id;

                return (
                  <div key={group.student.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden flex flex-col">
                    {/* Top: Group Details */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-5 border-b border-[#1e233d]/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{group.student?.name}</span>
                          <span className="text-xs text-zinc-500 font-mono">{group.student?.rollNumber}</span>
                          <span className="text-xs text-zinc-600">{group.student?.class?.name}</span>
                          {group.student?.feePackage && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300">
                              {group.student.feePackage.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                          <span>Father: {group.student?.fatherName}</span>
                          {group.student?.admissionPercentage != null && (
                            <span className="flex items-center gap-1"><IconChart className="w-3 h-3" /> {group.student.admissionPercentage}%</span>
                          )}
                          <span className={`flex items-center gap-1 ${group.whatsappSent ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            {group.whatsappSent ? <><IconCheckCircle className="w-3 h-3" /> WA sent</> : <><IconXCircle className="w-3 h-3" /> WA pending</>}
                          </span>
                          <span className="text-zinc-600">| {group.bills.length} Bill{group.bills.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Each bill shown as its own distinct status row */}
                      <div className="flex flex-col items-end gap-1.5 mt-2 md:mt-0">
                        {group.bills.map(bill => {
                          const bsc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
                          return (
                            <div key={bill.id} className="flex items-center gap-2 bg-[#060810]/60 px-3 py-1.5 rounded-lg border border-[#1e233d]/60">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{bill.isTuition ? 'Tuition' : 'Extra Charge'}</span>
                              <span className="text-sm font-bold text-white">₨{Number(bill.totalAmount).toLocaleString()}</span>
                              {bill.status === 'PARTIAL' && bill.paidAmount && (
                                <span className="text-[10px] text-amber-400">Paid: ₨{Number(bill.paidAmount).toLocaleString()}</span>
                              )}
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${bsc.bg} ${bsc.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${bsc.dot}`} />
                                {bsc.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom: Group Actions */}
                    <div className="bg-[#0a0c14]/50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/students/${group.student.id}/ledger`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-amber-400 hover:border-amber-600/40 text-xs font-medium transition-colors">
                          <IconSchool className="w-3.5 h-3.5" /> Student Ledger
                        </Link>
                        
                        <button onClick={() => setExpandedGroupId(isGroupOpen ? null : group.student.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            isGroupOpen
                              ? 'border-cyan-600/60 bg-cyan-950/40 text-cyan-300'
                              : 'border-[#1e233d] text-zinc-400 hover:text-cyan-400 hover:border-cyan-600/40'
                          }`}>
                          <IconDocumentText className="w-3.5 h-3.5" /> {isGroupOpen ? 'Hide Bills' : 'View Bills'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Individual Bills */}
                    {isGroupOpen && (
                      <div className="border-t border-[#1e233d] bg-[#060810] p-4 flex flex-col gap-4">
                        {group.bills.map(bill => {
                          const billSc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
                          const isOpen = actionBillId === bill.id;
                          return (
                            <div key={bill.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 border-b border-[#1e233d]/50">
                                <div>
                                  <div className="text-sm font-bold text-white flex items-center gap-2">
                                    {bill.isTuition ? 'Monthly Tuition Bill' : 'Extra Charge Bill'}
                                    <span className={`text-xs px-2 py-0.5 rounded border ${billSc.bg} ${billSc.text}`}>{billSc.label}</span>
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-1">Due: {new Date(bill.dueDate).toLocaleDateString('en-PK')}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-base font-bold text-white">₨{bill.totalAmount.toLocaleString()}</div>
                                  {bill.status === 'PARTIAL' && bill.paidAmount && (
                                    <div className="text-xs text-amber-400 mt-0.5">Paid: ₨{bill.paidAmount.toLocaleString()}</div>
                                  )}
                                </div>
                              </div>
                              <div className="bg-[#0a0c14]/50 p-3 flex flex-wrap gap-2 border-b border-[#1e233d]/50">
                                <Link href={`/admin/fees/bills/${bill.id}`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-cyan-400 hover:border-cyan-600/40 text-xs font-medium transition-colors">
                                  <IconDocumentText className="w-3.5 h-3.5" /> View Receipt
                                </Link>

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

                                <button onClick={() => openPanel(bill.id, 'charge')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                    isOpen && panelType === 'charge'
                                      ? 'border-cyan-600/60 bg-cyan-950/40 text-cyan-300'
                                      : 'border-[#1e233d] text-zinc-400 hover:text-cyan-400 hover:border-cyan-600/40'
                                  }`}>
                                  <IconPlus className="w-3.5 h-3.5" /> Add Charge
                                </button>

                                <button onClick={() => openPanel(bill.id, 'edit-bill')}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                    isOpen && panelType === 'edit-bill'
                                      ? 'border-amber-600/60 bg-amber-950/40 text-amber-300'
                                      : 'border-[#1e233d] text-zinc-400 hover:text-amber-400 hover:border-amber-600/40'
                                  }`}>
                                  <IconEdit className="w-3.5 h-3.5" /> Edit Amount
                                </button>

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

                                <button onClick={() => handleResendWA(bill.id)} disabled={loading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-green-400 hover:border-green-600/40 text-xs font-medium transition-colors disabled:opacity-50">
                                  <IconChatBubble className="w-3.5 h-3.5" /> Send WA
                                </button>

                                <button onClick={() => downloadPDF(bill)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e233d] text-zinc-400 hover:text-violet-400 hover:border-violet-600/40 text-xs font-medium transition-colors">
                                  <IconDownload className="w-3.5 h-3.5" /> PDF
                                </button>
                              </div>

                              {/* Action Modal Overlay */}
                              {actionBillId === bill.id && panelType && (
                                <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 pb-28 px-4 md:pt-0 md:pb-0 md:items-center md:p-6 bg-black/70 backdrop-blur-md">
                                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setActionBillId(null); setPanelType(null); setMsg(''); }} />
                                  <div className="relative w-full max-w-lg max-h-full md:max-h-[90vh] flex flex-col bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 rounded-t-3xl">
                                      <h2 className="text-base font-black text-white tracking-wide">
                                        {panelType === 'pay' && 'Mark as Paid'}
                                        {panelType === 'charge' && 'Add Extra Charge'}
                                        {panelType === 'waive' && 'Waive / Void Bill'}
                                        {panelType === 'edit-bill' && 'Edit Base Tuition'}
                                      </h2>
                                      <button
                                        type="button"
                                        onClick={() => { setActionBillId(null); setPanelType(null); setMsg(''); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="px-6 py-6 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                                      {msg && (
                                        <div className={`px-4 py-3 rounded-xl text-xs font-bold mb-4 border ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border-red-500/30 text-red-400'}`}>
                                          {msg}
                                        </div>
                                      )}

                                      {/* Mark Paid Panel */}
                                      {panelType === 'pay' && (
                                        <form onSubmit={(e) => handleMarkPaid(e, bill.id)} className="space-y-4">
                                          <div>
                                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Amount Received</label>
                                            <div className="relative">
                                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₨</span>
                                              <input type="number" name="amount" defaultValue={bill.totalAmount} required min="1" max={bill.totalAmount} step="0.01" className={`${inputCls} pl-10`} />
                                            </div>
                                          </div>
                                          <div className="pt-2 border-t border-white/5">
                                            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 cursor-pointer">
                                              Confirm Payment
                                            </button>
                                          </div>
                                        </form>
                                      )}

                                      {/* Add Charge Panel */}
                                      {panelType === 'charge' && (
                                        <form onSubmit={(e) => handleAddCharge(e, bill.id)} className="space-y-4">
                                          <div>
                                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Charge Title</label>
                                            <input type="text" name="title" placeholder="e.g. Fine, Books" required className={inputCls} />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Amount</label>
                                            <div className="relative">
                                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₨</span>
                                              <input type="number" name="amount" required min="1" step="0.01" className={`${inputCls} pl-10`} />
                                            </div>
                                          </div>
                                          <div className="pt-2 border-t border-white/5">
                                            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50 cursor-pointer">
                                              Add Charge
                                            </button>
                                          </div>
                                        </form>
                                      )}

                                      {/* Waive Panel */}
                                      {panelType === 'waive' && (
                                        <form onSubmit={(e) => handleWaive(e, bill.id)} className="space-y-4">
                                          <div>
                                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Reason for Waiving</label>
                                            <input type="text" name="remarks" placeholder="Optional..." className={inputCls} />
                                          </div>
                                          <div className="pt-2 border-t border-white/5">
                                            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-black rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 cursor-pointer">
                                              Confirm Waive / Void
                                            </button>
                                          </div>
                                        </form>
                                      )}

                                      {/* Edit Bill Amount Panel */}
                                      {panelType === 'edit-bill' && (
                                        <form onSubmit={(e) => handleUpdateBill(e, bill.id)} className="space-y-4">
                                          <div>
                                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">New Base Tuition Amount</label>
                                            <div className="relative">
                                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₨</span>
                                              <input type="number" name="baseAmount" defaultValue={bill.baseAmount} required min="0" step="0.01" className={`${inputCls} pl-10`} />
                                            </div>
                                          </div>
                                          <div className="pt-2 border-t border-white/5">
                                            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 cursor-pointer">
                                              Update Base Tuition
                                            </button>
                                          </div>
                                        </form>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        );
      })()}
    </div>
  );
}
