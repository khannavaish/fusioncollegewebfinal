'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { markBillPaid, waiveBill, addBillItem, removeBillItem, resendBillWhatsApp, updateBillAmount } from '@/app/actions/fees';
import { generateBillPDF, getBillFilename } from '@/app/utils/billPdf';
import {
  IconCheckCircle, IconXCircle, IconPlus, IconChatBubble, IconDownload,
  IconAlertTriangle, IconDocumentText, IconBolt, IconLoader, IconChart,
  IconClipboardCheck, IconEdit, IconTrash,
} from '@/app/components/icons';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_CONFIG = {
  UNPAID:  { label: 'Unpaid',  cls: 'bg-red-950/60 border-red-700/50 text-red-300',         dot: 'bg-red-500'    },
  PAID:    { label: 'Paid',    cls: 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300', dot: 'bg-emerald-500' },
  PARTIAL: { label: 'Partial', cls: 'bg-amber-950/60 border-amber-700/50 text-amber-300',    dot: 'bg-amber-500'  },
  WAIVED:  { label: 'Waived',  cls: 'bg-violet-950/60 border-violet-700/50 text-violet-300', dot: 'bg-violet-500' },
};

const inputCls = "w-full bg-[#060810] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function BillDetailClient({ bill, bankConfig }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);

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

  async function handleUpdateBase(e) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    fd.set('billId', bill.id);
    const result = await updateBillAmount(fd);
    setLoading(false);
    if (result?.success) { showMsg('✅ Bill amount updated!'); router.refresh(); }
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
      const doc = await generateBillPDF(bill, bankConfig);
      doc.save(getBillFilename(bill));
    } catch (err) {
      showMsg('❌ PDF generation failed: ' + err.message);
    }
    setPdfLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <IconClipboardCheck className="w-6 h-6 text-cyan-400" /> Fee Challan
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{bill.student?.name} · {monthName} {bill.year}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleResendWA} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-700/40 bg-green-950/30 text-green-300 text-sm font-medium hover:bg-green-950/60 transition-colors disabled:opacity-50">
            <IconChatBubble className="w-4 h-4" /> Resend WhatsApp
          </button>
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-600/40 bg-violet-950/30 text-violet-300 text-sm font-medium hover:bg-violet-950/60 transition-colors disabled:opacity-50">
            {pdfLoading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconDownload className="w-4 h-4" />}
            {pdfLoading ? 'Generating...' : 'Download Challan PDF'}
          </button>
        </div>
      </div>

      {/* Flash msg */}
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${msg.startsWith('✅') ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300' : 'bg-red-950/40 border-red-700/40 text-red-300'}`}>
          {msg.startsWith('✅') ? <IconCheckCircle className="w-4 h-4" /> : <IconXCircle className="w-4 h-4" />}
          {msg.replace(/^[✅❌]\s*/, '')}
        </div>
      )}

      {/* ══ Professional Voucher Preview ══ */}
      <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-200" id="bill-voucher">
        
        {/* Challan Header */}
        <div className="bg-[#1e233d] px-6 py-4 flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-md">
            <Image src="/logo.png" alt="Fusion College Logo" width={60} height={60} className="object-contain" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg tracking-wide">FUSION COLLEGE NAROWAL</h2>
            <p className="text-cyan-300 text-xs mt-0.5">Official Fee Challan - {monthName} {bill.year}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${sc.cls}`}>
              <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
            <p className="text-zinc-400 text-xs mt-1">Voucher #{bill.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* 3 Copies separator bar */}
        <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-200">
          {['Bank Copy', 'College Copy', 'Student Copy'].map((copy, i) => (
            <div key={copy} className={`py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider ${i < 2 ? 'border-r border-dashed border-gray-300' : ''}`}>
              {copy}
            </div>
          ))}
        </div>

        {/* Student Info Grid */}
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Student Name',  bill.student?.name],
              ['Roll Number',   bill.student?.rollNumber],
              ['Class',         bill.student?.class?.name || '-'],
              ["Father's Name", bill.student?.fatherName],
              ['Fee Package',   bill.student?.feePackage?.name || 'Custom Override'],
              ['Admission %',   bill.student?.admissionPercentage != null ? `${bill.student.admissionPercentage}%` : '-'],
              ['Due Date',      new Date(bill.dueDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })],
              ['Issue Date',    new Date(bill.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-gray-400 block">{label}</span>
                <span className="text-sm font-semibold text-gray-800">{value || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Breakdown Table */}
        <div className="p-6 border-b border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e233d] text-white">
                <th className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-tl-lg">#</th>
                <th className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wider">Fee Description</th>
                <th className="text-right px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">Rs {Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#1e233d] text-white">
                <td colSpan={2} className="px-4 py-3 font-bold text-sm rounded-bl-lg">TOTAL PAYABLE AMOUNT</td>
                <td className="px-4 py-3 text-right text-lg font-bold rounded-br-lg">Rs {bill.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Status & Receipt */}
        <div className="p-6 bg-gray-50">
          <div className="flex flex-wrap gap-6 items-start">
            <div className="flex-1 space-y-2">
              {(bill.status === 'PAID' || bill.status === 'PARTIAL') && (
                <>
                  <div>
                    <span className="text-xs text-gray-400">Amount Paid</span>
                    <p className="font-bold text-emerald-600 text-lg">Rs {(bill.paidAmount || 0).toLocaleString()}</p>
                  </div>
                  {bill.paidAt && (
                    <div>
                      <span className="text-xs text-gray-400">Payment Date</span>
                      <p className="text-sm font-medium text-gray-700">
                        {new Date(bill.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </>
              )}
              {bill.remarks && (
                <div>
                  <span className="text-xs text-gray-400">Remarks</span>
                  <p className="text-sm text-gray-700">{bill.remarks}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400">WhatsApp Notification</span>
                <p className={`text-sm font-medium ${bill.whatsappSent ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {bill.whatsappSent ? '✓ Sent to parent' : '○ Not sent yet'}
                </p>
              </div>
            </div>

            {/* Receipt image */}
            {bill.paymentReceipt && (
              <div className="flex-shrink-0">
                <span className="text-xs text-gray-400 block mb-1">Payment Receipt</span>
                <a href={bill.paymentReceipt} target="_blank" rel="noreferrer">
                  <img
                    src={bill.paymentReceipt}
                    alt="Payment Receipt"
                    className="w-32 h-32 object-cover rounded-xl border border-gray-200 shadow-md hover:scale-105 transition-transform cursor-pointer"
                  />
                </a>
              </div>
            )}
            
            {/* Signature lines */}
            <div className="hidden md:flex flex-col items-center gap-2 ml-auto">
              <div className="w-32 border-t border-gray-400 pt-1 text-center text-xs text-gray-400">Bank Officer</div>
              <div className="w-32 border-t border-gray-400 pt-1 text-center text-xs text-gray-400 mt-4">Depositor</div>
            </div>
          </div>
        </div>
      </div>

      {/* Parent Contact */}
      {bill.student?.parents?.length > 0 && (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <IconChatBubble className="w-4 h-4" /> Parent Contact(s)
          </h3>
          <div className="flex flex-wrap gap-2">
            {bill.student.parents.map((p, i) => (
              <span key={i} className="text-xs bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-1.5 text-zinc-300">
                {p.name} · {p.phone}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══ Admin Actions ══ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Add Extra Charge */}
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <IconPlus className="w-4 h-4 text-cyan-400" /> Add Extra Charge
          </h3>
          <form onSubmit={handleAddCharge} className="space-y-3">
            <input name="title" type="text" placeholder="Charge title (e.g. Exam Fee)" className={inputCls} required />
            <input name="amount" type="number" step="1" min="0" placeholder="Amount (₨)" className={inputCls} required />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconPlus className="w-4 h-4" />}
              Add Charge
            </button>
          </form>
        </div>

        {/* Update Base Amount */}
        <div className="bg-[#0d0f1a] border border-amber-800/30 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <IconEdit className="w-4 h-4 text-amber-400" /> Edit Base Fee
          </h3>
          <form onSubmit={handleUpdateBase} className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Current Base: Rs {bill.baseAmount?.toLocaleString()}</label>
              <input name="baseAmount" type="number" step="1" min="0" defaultValue={bill.baseAmount} className={inputCls} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconCheckCircle className="w-4 h-4" />}
              Update Base Fee
            </button>
          </form>
        </div>

        {/* Mark Paid */}
        {bill.status !== 'PAID' && bill.status !== 'WAIVED' && (
          <div className="bg-[#0d0f1a] border border-emerald-800/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <IconCheckCircle className="w-4 h-4 text-emerald-400" /> Mark as Paid
            </h3>
            <form onSubmit={handleMarkPaid} className="space-y-3">
              <input name="paidAmount" type="number" step="1" min="0" defaultValue={bill.totalAmount}
                placeholder="Amount paid (₨)" className={inputCls} required />
              <input name="remarks" type="text" placeholder="Remarks (optional)" className={inputCls} />
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block flex items-center gap-1">
                  <IconDocumentText className="w-3 h-3" /> Payment Receipt (optional)
                </label>
                <input
                  name="receiptImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setReceiptPreview(URL.createObjectURL(file));
                  }}
                  className="w-full text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-emerald-900/40 file:text-emerald-400 hover:file:bg-emerald-900/60 transition-colors"
                />
                {receiptPreview && (
                  <img src={receiptPreview} alt="Receipt Preview" className="mt-2 w-full h-24 object-cover rounded-lg border border-emerald-700/30" />
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconCheckCircle className="w-4 h-4" />}
                Confirm Payment
              </button>
            </form>
          </div>
        )}

        {/* Waive */}
        {bill.status !== 'WAIVED' && (
          <div className="bg-[#0d0f1a] border border-violet-800/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <IconXCircle className="w-4 h-4 text-violet-400" /> Waive Bill
            </h3>
            <form onSubmit={handleWaive} className="space-y-3">
              <input name="remarks" type="text" placeholder="Reason for waiver" className={inputCls} required />
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <IconLoader className="w-4 h-4 animate-spin" /> : <IconXCircle className="w-4 h-4" />}
                Waive Bill
              </button>
            </form>
          </div>
        )}

        {/* Remove Extra Charges */}
        {bill.items.filter(i => !i.title.includes('Monthly Tuition')).length > 0 && (
          <div className="bg-[#0d0f1a] border border-red-900/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <IconTrash className="w-4 h-4 text-red-400" /> Remove Charges
            </h3>
            <div className="space-y-2">
              {bill.items.filter(i => !i.title.includes('Monthly Tuition')).map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-[#060810] rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm text-zinc-300 font-medium">{item.title}</p>
                    <p className="text-xs text-zinc-600">Rs {Number(item.amount).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} disabled={loading}
                    className="w-7 h-7 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 flex items-center justify-center transition-colors disabled:opacity-50">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
