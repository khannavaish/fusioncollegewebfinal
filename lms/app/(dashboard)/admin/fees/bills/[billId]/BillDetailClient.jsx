'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markBillPaid, waiveBill, addBillItem, removeBillItem, resendBillWhatsApp } from '@/app/actions/fees';
import { generateBillPDF, getBillFilename } from '@/app/utils/billPdf';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_CONFIG = {
  UNPAID:  { label: '❌ Unpaid',  cls: 'bg-red-950/50 border-red-700/50 text-red-300'    },
  PAID:    { label: '✅ Paid',    cls: 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300' },
  PARTIAL: { label: '⏳ Partial', cls: 'bg-amber-950/50 border-amber-700/50 text-amber-300'  },
  WAIVED:  { label: '🚫 Waived', cls: 'bg-violet-950/50 border-violet-700/50 text-violet-300' },
};

const inputCls = "w-full bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function BillDetailClient({ bill }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const sc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
  const monthName = MONTH_NAMES[bill.month - 1];

  function showMsg(text) { setMsg(text); setTimeout(() => setMsg(''), 4000); }

  async function handleMarkPaid(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', bill.id);
    const result = await markBillPaid(fd);
    setLoading(false);
    if (result?.success) { showMsg('✅ Marked as paid successfully!'); router.refresh(); }
    else showMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleWaive(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', bill.id);
    const result = await waiveBill(fd);
    setLoading(false);
    if (result?.success) { showMsg('✅ Bill waived!'); router.refresh(); }
    else showMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleAddCharge(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', bill.id);
    const result = await addBillItem(fd);
    setLoading(false);
    if (result?.success) { e.target.reset(); showMsg('✅ Charge added!'); router.refresh(); }
    else showMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleRemoveItem(itemId) {
    if (!confirm('Remove this charge item?')) return;
    setLoading(true);
    const fd = new FormData();
    fd.set('itemId', itemId);
    fd.set('billId', bill.id);
    const result = await removeBillItem(fd);
    setLoading(false);
    if (result?.success) { showMsg('✅ Charge removed'); router.refresh(); }
    else showMsg('❌ ' + (result?.error || 'Failed'));
  }

  async function handleResendWA() {
    setLoading(true);
    const fd = new FormData();
    fd.set('billId', bill.id);
    const result = await resendBillWhatsApp(fd);
    setLoading(false);
    showMsg(result?.success ? `✅ WhatsApp sent to ${result.sent} parent(s)!` : '❌ ' + (result?.error || 'Failed'));
  }

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      const doc = await generateBillPDF(bill);
      doc.save(getBillFilename(bill));
    } catch (err) {
      showMsg('❌ PDF generation failed: ' + err.message);
    }
    setPdfLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">📄 Fee Bill</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {bill.student?.name} · {monthName} {bill.year}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleResendWA} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-700/40 bg-green-950/30 text-green-300 text-sm font-medium hover:bg-green-950/60 transition-colors disabled:opacity-50">
            📲 Resend WhatsApp
          </button>
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-600/40 bg-violet-950/30 text-violet-300 text-sm font-medium hover:bg-violet-950/60 transition-colors disabled:opacity-50">
            {pdfLoading ? '⏳ Generating...' : '📄 Download PDF'}
          </button>
        </div>
      </div>

      {/* Flash msg */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
          {msg}
        </div>
      )}

      {/* Bill Voucher Preview */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden" id="bill-voucher">
        {/* Dark header */}
        <div className="bg-gradient-to-r from-[#060810] to-[#0d1535] p-6 border-b-2 border-cyan-500/60">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white tracking-wide">🏫 FUSION COLLEGE NAROWAL</h2>
            <p className="text-cyan-400 text-sm mt-1 font-medium">OFFICIAL FEE VOUCHER</p>
            <p className="text-zinc-400 text-sm mt-0.5">{monthName} {bill.year}</p>
          </div>
          <div className="flex justify-center mt-3">
            <span className={`text-xs font-bold px-4 py-1.5 rounded-full border ${sc.cls}`}>
              {sc.label}
            </span>
          </div>
        </div>

        {/* Student details */}
        <div className="p-6 border-b border-[#1e233d]">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">👤 Student Details</h3>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              ['Student Name',    bill.student?.name],
              ['Roll Number',     bill.student?.rollNumber],
              ['Class',           bill.student?.class?.name || '—'],
              ["Father's Name",   bill.student?.fatherName],
              ['Fee Package',     bill.student?.feePackage?.name || 'Custom Override'],
              ['Admission %',     bill.student?.admissionPercentage != null ? `${bill.student.admissionPercentage}%` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center border-b border-[#1a1f35] pb-2">
                <span className="text-xs text-zinc-500">{label}</span>
                <span className="text-sm font-semibold text-white">{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Charges */}
        <div className="p-6 border-b border-[#1e233d]">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">📋 Charges</h3>
          <div className="space-y-2">
            {bill.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-[#0a0c14] rounded-xl px-4 py-3">
                <span className="text-sm text-zinc-300">{item.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">₨{item.amount.toLocaleString()}</span>
                  <button onClick={() => handleRemoveItem(item.id)} disabled={loading}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-xs disabled:opacity-50" title="Remove charge">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-800/40 rounded-xl px-4 py-4 flex items-center justify-between">
            <span className="text-sm font-bold text-cyan-300">💰 TOTAL DUE</span>
            <span className="text-2xl font-bold text-white">₨{bill.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Due / Payment info */}
        <div className="p-6">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-zinc-500 text-xs block mb-1">📆 Due Date</span>
              <span className="text-white font-semibold">
                {new Date(bill.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {(bill.status === 'PAID' || bill.status === 'PARTIAL') && (
              <div>
                <span className="text-zinc-500 text-xs block mb-1">✅ Amount Paid</span>
                <span className="text-emerald-400 font-bold">₨{(bill.paidAmount || 0).toLocaleString()}</span>
                {bill.paidAt && (
                  <span className="text-zinc-500 text-xs ml-2">
                    on {new Date(bill.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}
            {bill.remarks && (
              <div>
                <span className="text-zinc-500 text-xs block mb-1">📝 Remarks</span>
                <span className="text-zinc-300">{bill.remarks}</span>
              </div>
            )}
            <div>
              <span className="text-zinc-500 text-xs block mb-1">📲 WhatsApp</span>
              <span className={bill.whatsappSent ? 'text-emerald-400' : 'text-zinc-500'}>
                {bill.whatsappSent ? '✅ Sent to parent' : '⏳ Not sent yet'}
              </span>
            </div>
          </div>

          {/* Parents */}
          {bill.student?.parents?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#1e233d]">
              <span className="text-xs text-zinc-500 mb-2 block">👨‍👩‍👧 Parent Contact(s)</span>
              <div className="flex flex-wrap gap-2">
                {bill.student.parents.map((p, i) => (
                  <span key={i} className="text-xs bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-1.5 text-zinc-300">
                    {p.name} · {p.phone}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Add Charge */}
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">➕ Add Charge</h3>
          <form onSubmit={handleAddCharge} className="space-y-3">
            <input name="title" type="text" placeholder="Charge title" className={inputCls} required />
            <input name="amount" type="number" step="1" min="0" placeholder="Amount (₨)" className={inputCls} required />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? '⏳' : '➕ Add Charge'}
            </button>
          </form>
        </div>

        {/* Mark Paid */}
        {bill.status !== 'PAID' && bill.status !== 'WAIVED' && (
          <div className="bg-[#0d0f1a] border border-emerald-800/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">💳 Mark as Paid</h3>
            <form onSubmit={handleMarkPaid} className="space-y-3">
              <input name="paidAmount" type="number" step="1" min="0" defaultValue={bill.totalAmount}
                className={inputCls} required />
              <input name="remarks" type="text" placeholder="Remarks (optional)" className={inputCls} />
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {loading ? '⏳' : '✅ Confirm Payment'}
              </button>
            </form>
          </div>
        )}

        {/* Waive */}
        {bill.status !== 'WAIVED' && (
          <div className="bg-[#0d0f1a] border border-violet-800/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">🚫 Waive Bill</h3>
            <form onSubmit={handleWaive} className="space-y-3">
              <input name="remarks" type="text" placeholder="Reason for waiver" className={inputCls} required />
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {loading ? '⏳' : '🚫 Waive Bill'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
