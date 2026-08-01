import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import prisma from '@/utils/db';
import AnimatedSection from '@/app/components/AnimatedSection';
import Link from 'next/link';
import { IconChevronLeft, IconPrint } from '@/app/components/icons';
import PrintButton from '@/app/components/PrintButton';

export const metadata = {
  title: 'Student Fee Ledger',
};

export default async function StudentLedgerPage({ params }) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard');

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      feeBills: {
        orderBy: [
          { year: 'asc' },
          { month: 'asc' }
        ],
        include: { items: true }
      }
    }
  });

  if (!student) {
    return <div className="p-10 text-white">Student not found.</div>;
  }

  // Calculate totals
  const totalBilled = student.feeBills.reduce((acc, bill) => acc + Number(bill.totalAmount), 0);
  const totalPaid = student.feeBills.reduce((acc, bill) => acc + (bill.paidAmount ? Number(bill.paidAmount) : 0), 0);
  const totalOutstanding = totalBilled - totalPaid;

  const getMonthName = (m) => new Date(2000, m - 1).toLocaleString('default', { month: 'short' });

  return (
    <div className="p-6 print:bg-white print:p-0 print:m-0 print:text-black min-h-screen">
      <AnimatedSection delay={0.1}>
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link href="/admin/students" className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors text-sm font-semibold">
            <IconChevronLeft className="w-4 h-4" /> Back to Students
          </Link>
          <PrintButton 
            label="Print Ledger" 
            className="px-4 py-2 bg-[#16192b] hover:bg-[#1e233d] text-white text-xs font-bold rounded-lg border border-[#2b3052] transition-colors" 
          />
        </div>

        {/* Print Header */}
        <div className="hidden print:flex justify-between items-end border-b-2 border-cyan-600 pb-4 mb-8 text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-cyan-800 m-0">Fusion College</h1>
              <p className="text-sm font-semibold text-zinc-600 m-0">Excellence in Education</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-widest text-indigo-900 m-0">Student Fee Ledger</h2>
            <p className="text-xs font-medium text-zinc-500 m-0">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Ledger Header Card */}
        <div className="bg-[#0d0f1a] print:bg-white print:border-black print:shadow-none border border-[#1e233d] rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
          <div className="flex items-center gap-5">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/50" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 text-2xl font-black border-2 border-cyan-500/30">
                {student.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-white print:text-black">{student.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400 font-medium print:text-gray-700">
                <span className="bg-[#16192b] print:bg-transparent px-2 py-0.5 rounded border border-[#2b3052] print:border-gray-400">Roll: {student.rollNumber}</span>
                <span className="bg-[#16192b] print:bg-transparent px-2 py-0.5 rounded border border-[#2b3052] print:border-gray-400">Class: {student.class?.name}</span>
                <span className="bg-[#16192b] print:bg-transparent px-2 py-0.5 rounded border border-[#2b3052] print:border-gray-400">Father: {student.fatherName}</span>
                {student.address && <span className="bg-[#16192b] print:bg-transparent px-2 py-0.5 rounded border border-[#2b3052] print:border-gray-400">Address: {student.address}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none text-right">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Paid</p>
              <p className="text-xl font-mono font-bold text-emerald-400">₨ {totalPaid.toLocaleString()}</p>
            </div>
            <div className="w-px bg-[#1e233d] hidden md:block"></div>
            <div className="flex-1 md:flex-none text-right">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Outstanding</p>
              <p className="text-xl font-mono font-bold text-amber-400">₨ {totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-[#0d0f1a] print:bg-transparent border border-[#1e233d] print:border-black rounded-2xl overflow-hidden shadow-2xl print:shadow-none">
          <div className="bg-[#16192b]/50 print:bg-transparent p-4 border-b border-[#1e233d] print:border-black">
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Financial Ledger</h2>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] print:border-black">
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider">Billing Period</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider">Bill Date</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider text-right">Total Billed</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider text-right">Amount Paid</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider text-right">Balance</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-zinc-400 print:text-black uppercase tracking-wider text-right">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {student.feeBills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-sm text-zinc-500">
                      No fee records found for this student.
                    </td>
                  </tr>
                ) : (
                  student.feeBills.map((bill, index) => {
                    // Calculate running balance up to this row
                    const runningBalance = student.feeBills
                      .slice(0, index + 1)
                      .reduce((acc, b) => acc + Number(b.totalAmount) - (b.paidAmount ? Number(b.paidAmount) : 0), 0);

                    return (
                      <tr key={bill.id} className="border-b border-[#1e233d] print:border-black hover:bg-[#16192b]/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-sm font-bold text-white print:text-black">{getMonthName(bill.month)} {bill.year}</div>
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-400 print:text-black">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-zinc-300 print:text-black text-right">
                          ₨ {Number(bill.totalAmount).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-emerald-400 print:text-green-700 text-right">
                          {bill.paidAmount ? `₨ ${Number(bill.paidAmount).toLocaleString()}` : '-'}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-amber-400 print:text-black font-bold text-right">
                          ₨ {runningBalance.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-center" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                          {bill.status === 'PAID' && <span className="text-[9px] px-2 py-0.5 rounded border bg-emerald-950/40 text-emerald-400 border-emerald-500/30 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-500 font-bold uppercase">PAID</span>}
                          {bill.status === 'UNPAID' && <span className="text-[9px] px-2 py-0.5 rounded border bg-red-950/40 text-red-400 border-red-500/30 print:bg-red-100 print:text-red-800 print:border-red-500 font-bold uppercase">UNPAID</span>}
                          {bill.status === 'PARTIAL' && <span className="text-[9px] px-2 py-0.5 rounded border bg-amber-950/40 text-amber-400 border-amber-500/30 print:bg-amber-100 print:text-amber-800 print:border-amber-500 font-bold uppercase">PARTIAL</span>}
                          {bill.status === 'WAIVED' && <span className="text-[9px] px-2 py-0.5 rounded border bg-blue-950/40 text-blue-400 border-blue-500/30 print:bg-blue-100 print:text-blue-800 print:border-blue-500 font-bold uppercase">WAIVED</span>}
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-400 print:text-black text-right">
                          {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
