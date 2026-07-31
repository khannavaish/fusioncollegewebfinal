'use client';

import { useState } from 'react';
import { generateBillPDF, getBillFilename } from '@/app/utils/billPdf';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_CONFIG = {
  UNPAID:  { label: '❌ Unpaid',  cls: 'bg-red-950/50 border-red-700/50 text-red-300',       icon: '❌' },
  PAID:    { label: '✅ Paid',    cls: 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300', icon: '✅' },
  PARTIAL: { label: '⏳ Partial', cls: 'bg-amber-950/50 border-amber-700/50 text-amber-300',   icon: '⏳' },
  WAIVED:  { label: '🚫 Waived', cls: 'bg-violet-950/50 border-violet-700/50 text-violet-300', icon: '🚫' },
};

export default function StudentFeesClient({ student }) {
  const [expandedId, setExpandedId] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();
  const currentBill  = student.bills.find((b) => b.month === currentMonth && b.year === currentYear);
  const monthlyFee   = student.feeMonthlyOverride ?? student.feePackage?.monthlyFee;

  async function downloadPDF(bill) {
    setPdfLoading(bill.id);
    try {
      const doc = await generateBillPDF(bill);
      doc.save(getBillFilename(bill));
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    }
    setPdfLoading(null);
  }

  return (
    <div className="min-h-screen bg-[#060810] text-white p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">💰 My Fee Bills</h1>
        <p className="text-zinc-400 text-sm mt-1">View and download your monthly fee vouchers</p>
      </div>

      {/* Student Info Card */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">👤 My Fee Details</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-zinc-600 block mb-1">Student</span>
            <span className="text-sm font-bold text-white">{student.name}</span>
            <span className="text-xs text-zinc-500 block">{student.rollNumber} · {student.class}</span>
          </div>
          <div>
            <span className="text-xs text-zinc-600 block mb-1">📦 Fee Package</span>
            {student.feePackage ? (
              <>
                <span className="text-sm font-bold text-cyan-400">{student.feePackage.name}</span>
                {student.admissionPercentage != null && (
                  <span className="text-xs text-zinc-500 block">📊 {student.admissionPercentage}% admission marks</span>
                )}
              </>
            ) : student.feeMonthlyOverride ? (
              <span className="text-sm font-bold text-amber-400">Custom Rate</span>
            ) : (
              <span className="text-sm text-zinc-500">Not assigned</span>
            )}
          </div>
          <div>
            <span className="text-xs text-zinc-600 block mb-1">💰 Monthly Fee</span>
            {monthlyFee ? (
              <span className="text-2xl font-bold text-white">₨{monthlyFee.toLocaleString()}</span>
            ) : (
              <span className="text-sm text-zinc-500">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Current Month Bill */}
      {currentBill ? (
        <div className={`rounded-2xl border p-6 ${STATUS_CONFIG[currentBill.status]?.cls || ''}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold text-white">
                  📅 {MONTH_NAMES[currentBill.month - 1]} {currentBill.year} - Current Month
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[currentBill.status]?.cls}`}>
                  {STATUS_CONFIG[currentBill.status]?.label}
                </span>
              </div>
              <div className="text-3xl font-bold text-white mt-2">
                ₨{currentBill.totalAmount.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                📆 Due: {new Date(currentBill.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <button onClick={() => downloadPDF(currentBill)} disabled={pdfLoading === currentBill.id}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {pdfLoading === currentBill.id ? '⏳ Generating...' : '📄 Download Voucher'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0d0f1a] border border-dashed border-[#1e233d] rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-zinc-400 font-medium">No bill generated for this month yet</p>
          <p className="text-zinc-600 text-sm mt-1">Bills are generated on the 1st of each month</p>
        </div>
      )}

      {/* Bill History */}
      <div>
        <h2 className="text-base font-bold text-white mb-4">📚 Bill History</h2>
        {student.bills.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-dashed border-[#1e233d] rounded-2xl p-8 text-center text-zinc-500">
            No bills yet
          </div>
        ) : (
          <div className="space-y-2">
            {student.bills.map((bill) => {
              const sc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.UNPAID;
              const isOpen = expandedId === bill.id;

              return (
                <div key={bill.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex flex-col md:flex-row md:items-center gap-3 p-4 text-left hover:bg-[#0f1120] transition-colors"
                    onClick={() => setExpandedId(isOpen ? null : bill.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">
                          {MONTH_NAMES[bill.month - 1]} {bill.year}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        📆 Due: {new Date(bill.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {bill.status === 'PARTIAL' && bill.paidAmount != null && (
                          <span className="ml-3 text-amber-400">Paid ₨{bill.paidAmount.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-white">₨{bill.totalAmount.toLocaleString()}</span>
                      <span className="text-zinc-600 text-sm">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#1e233d] bg-[#0a0c14] p-4 space-y-3">
                      {/* Charges breakdown */}
                      <div className="space-y-1.5">
                        {bill.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-zinc-400">{item.title}</span>
                            <span className="text-white font-semibold">₨{item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-[#1e233d] pt-2 flex justify-between text-sm font-bold">
                          <span className="text-zinc-300">Total</span>
                          <span className="text-white">₨{bill.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {bill.remarks && (
                        <p className="text-xs text-zinc-500">📝 {bill.remarks}</p>
                      )}

                      <button onClick={() => downloadPDF(bill)} disabled={pdfLoading === bill.id}
                        className="w-full py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-violet-400 hover:border-violet-600/40 transition-colors disabled:opacity-50">
                        {pdfLoading === bill.id ? '⏳ Generating PDF...' : '📄 Download PDF Voucher'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
