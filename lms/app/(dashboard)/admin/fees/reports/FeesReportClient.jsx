'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Download, Printer, Search, 
  ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, Banknote 
} from 'lucide-react';
import Link from 'next/link';
import AnimatedSection from '@/app/components/AnimatedSection';
import { IconPrint } from '@/app/components/icons';

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getMonthName = (m) => new Date(2000, m - 1).toLocaleString('default', { month: 'long' });

const STATUS_BADGE = {
  PAID: { label: 'Paid', cls: 'bg-green-100 text-green-700 print:bg-green-100 print:text-green-800' },
  UNPAID: { label: 'Unpaid', cls: 'bg-red-100 text-red-700 print:bg-red-100 print:text-red-800' },
  PARTIAL: { label: 'Partial', cls: 'bg-amber-100 text-amber-700 print:bg-amber-100 print:text-amber-800' },
  WAIVED: { label: 'Waived', cls: 'bg-blue-100 text-blue-700 print:bg-blue-100 print:text-blue-800' },
};

export default function FeesReportClient({ initialData, initialStatus, initialMonth, initialYear }) {
  const router = useRouter();
  const [data] = useState(initialData);
  const [status, setStatus] = useState(initialStatus);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFilterChange = () => {
    router.push(`/admin/fees/reports?status=${status}&month=${month}&year=${year}`);
  };

  const filteredData = data.filter(bill => 
    bill.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredData.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalCollected = filteredData.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const totalOutstanding = totalAmount - totalCollected;

  // Print Header — same design as Ledger
  const PrintHeader = () => (
    <div className="hidden print:flex justify-between items-end border-b-2 border-cyan-600 pb-4 mb-8 text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-cyan-800">Fusion College</h1>
          <p className="text-sm font-semibold text-zinc-600">Excellence in Education</p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-xl font-bold uppercase tracking-widest text-indigo-900">Fee Report</h2>
        <p className="text-xs font-medium text-zinc-500">Generated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filters — Hidden in Print */}
      <AnimatedSection>
        <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-[#0b051a]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-xl">
          <div className="space-y-4 w-full md:w-auto">
            <Link href="/admin/fees" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-bold text-sm uppercase tracking-widest transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Fees
            </Link>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-cyan-500/50 outline-none"
              >
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i+1} value={i+1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
              
              <select 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-cyan-500/50 outline-none"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-cyan-500/50 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="WAIVED">Waived</option>
              </select>

              <button 
                onClick={handleFilterChange}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              >
                Apply Filter
              </button>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Printable Report — White background, same design as Ledger */}
      <AnimatedSection delay={0.1}>
        <div className="bg-white print:bg-transparent print:shadow-none print:border-none border border-zinc-200 rounded-2xl p-8 print:p-0 shadow-2xl text-black">
          <PrintHeader />
          
          {/* Report Info + Print Button */}
          <div className="flex justify-between items-start mb-8 print:mb-6">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Fee Report</h3>
              <div className="mt-2 space-y-1 text-sm font-medium">
                <p><strong>Period:</strong> {getMonthName(initialMonth)} {initialYear}</p>
                <p><strong>Filter:</strong> {initialStatus === 'ALL' ? 'All Records' : initialStatus}</p>
                <p><strong>Total Records:</strong> {filteredData.length}</p>
              </div>
            </div>
            <button onClick={() => window.print()} className="print:hidden flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-colors shadow-lg">
              <IconPrint className="w-4 h-4" /> Print PDF
            </button>
          </div>

          {/* Search — Hidden in Print */}
          <div className="print:hidden mb-6">
            <div className="relative max-w-md">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search student, roll number, or class..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-zinc-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-black placeholder-zinc-400 focus:ring-2 focus:ring-cyan-500/50 outline-none"
              />
            </div>
          </div>

          {/* Data Table — Ledger Style */}
          <table className="w-full text-left border-collapse mb-8 text-sm">
            <thead>
              <tr className="border-b-2 border-black bg-zinc-100 print:bg-transparent">
                <th className="py-2 px-2 font-bold uppercase tracking-wider">Roll No</th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider">Student Name</th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider">Class</th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Total Due</th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Paid</th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-right">Balance</th>
                <th className="py-2 px-2 font-bold uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan="7" className="py-4 text-center italic text-zinc-500">No billing records found.</td></tr>
              ) : (
                filteredData.map((bill) => {
                  const badge = STATUS_BADGE[bill.status] || STATUS_BADGE.UNPAID;
                  const balance = bill.totalAmount - bill.paidAmount;
                  return (
                    <tr key={bill.id} className="border-b border-zinc-200 print:border-zinc-400">
                      <td className="py-2 px-2 font-medium">{bill.rollNumber}</td>
                      <td className="py-2 px-2 font-semibold uppercase">{bill.studentName}</td>
                      <td className="py-2 px-2">{bill.className}</td>
                      <td className="py-2 px-2 text-right font-mono">₨ {bill.totalAmount.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-green-700">₨ {bill.paidAmount.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-red-600">₨ {balance.toLocaleString()}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${badge.cls}`}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Summary Totals — Same as Class Ledger */}
          <div className="flex justify-end pt-4 mt-8 border-t-2 border-black">
            <div className="w-80 space-y-2 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total Billed:</span>
                <span className="font-mono">₨ {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total Collected:</span>
                <span className="font-mono text-green-700">₨ {totalCollected.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
                <span>Total Outstanding:</span>
                <span className="font-mono text-red-600">₨ {totalOutstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
