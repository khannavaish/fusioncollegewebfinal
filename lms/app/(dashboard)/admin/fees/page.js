import prisma from '@/utils/db';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { generateMonthlyBills } from '@/app/actions/fees';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const statusConfig = {
  UNPAID: { label: 'Unpaid', color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/40', dot: 'bg-red-500' },
  PAID:   { label: 'Paid',   color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40', dot: 'bg-emerald-500' },
  PARTIAL:{ label: 'Partial',color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40', dot: 'bg-amber-500' },
  WAIVED: { label: 'Waived', color: 'text-violet-400', bg: 'bg-violet-950/40 border-violet-800/40', dot: 'bg-violet-500' },
};

export const metadata = { title: '💼 Fee Management — Fusion LMS' };

export default async function FeeHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Aggregate stats for current month
  const [bills, packages, totalStudents] = await Promise.all([
    prisma.feeBill.findMany({
      where: { month, year },
      select: { status: true, totalAmount: true, paidAmount: true },
    }),
    prisma.feePackage.findMany({ orderBy: { monthlyFee: 'asc' } }),
    prisma.student.count({ where: { user: { status: 'ACTIVE' } } }),
  ]);

  const stats = {
    total: bills.length,
    unpaid: bills.filter((b) => b.status === 'UNPAID').length,
    paid: bills.filter((b) => b.status === 'PAID').length,
    partial: bills.filter((b) => b.status === 'PARTIAL').length,
    waived: bills.filter((b) => b.status === 'WAIVED').length,
    totalDue: bills.reduce((s, b) => s + Number(b.totalAmount), 0),
    totalCollected: bills
      .filter((b) => b.status === 'PAID' || b.status === 'PARTIAL')
      .reduce((s, b) => s + Number(b.paidAmount || 0), 0),
  };

  const studentsWithoutPackage = await prisma.student.count({
    where: { user: { status: 'ACTIVE' }, feePackageId: null, feeMonthlyOverride: null },
  });

  return (
    <div className="min-h-screen bg-[#060810] text-white p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <Link href="/admin" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-zinc-300">Fee Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white">💼 Fee Management</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {MONTH_NAMES[month - 1]} {year} — {stats.total} bills generated
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/fees/packages"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-600/40 bg-violet-950/30 text-violet-300 text-sm font-medium hover:bg-violet-950/60 transition-colors"
          >
            📦 Manage Packages
          </Link>
          <Link
            href="/admin/fees/bills"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-600/40 bg-cyan-950/30 text-cyan-300 text-sm font-medium hover:bg-cyan-950/60 transition-colors"
          >
            📋 View All Bills
          </Link>
        </div>
      </div>

      {/* Warning: students without package */}
      {studentsWithoutPackage > 0 && (
        <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-700/40 rounded-2xl p-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-amber-300 font-semibold text-sm">
              {studentsWithoutPackage} active student(s) have no fee package assigned
            </p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              These students will be skipped during bill generation.{' '}
              <Link href="/admin/students" className="underline hover:text-amber-300">Assign packages →</Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bills', value: stats.total, icon: '📄', color: 'cyan' },
          { label: 'Unpaid', value: stats.unpaid, icon: '❌', color: 'red' },
          { label: 'Paid', value: stats.paid, icon: '✅', color: 'emerald' },
          { label: 'Partial / Waived', value: `${stats.partial} / ${stats.waived}`, icon: '⏳', color: 'amber' },
        ].map((s) => (
          <div key={s.label} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400 text-sm">💰 Total Due This Month</span>
          </div>
          <div className="text-3xl font-bold text-white mt-2">
            ₨{stats.totalDue.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-600 mt-1">Across {stats.total} bills</div>
        </div>
        <div className="bg-[#0d0f1a] border border-emerald-800/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400 text-sm">📥 Collected So Far</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 mt-2">
            ₨{stats.totalCollected.toLocaleString()}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {stats.totalDue > 0
              ? `${Math.round((stats.totalCollected / stats.totalDue) * 100)}% collection rate`
              : 'No bills generated yet'}
          </div>
        </div>
      </div>

      {/* Generate Bills Section */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          🚀 Generate Monthly Bills (Admin Control)
        </h2>
        <p className="text-cyan-400/80 text-sm mb-5 font-medium">
          Select the month and year to instantly generate fee vouchers for all enrolled students.
        </p>
        <form action={generateMonthlyBills} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">📅 Month</label>
            <select name="month" defaultValue={month}
              className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors">
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">📆 Year</label>
            <select name="year" defaultValue={year}
              className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors">
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">📌 Due Day</label>
            <select name="dueDay" defaultValue={10}
              className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors">
              {[5, 7, 10, 12, 15, 20].map((d) => (
                <option key={d} value={d}>{d}th of month</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors">
            ⚡ Generate Bills + Send WhatsApp
          </button>
        </form>
      </div>

      {/* Fee Packages Overview */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">📦 Active Fee Packages</h2>
          <Link href="/admin/fees/packages" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            Manage →
          </Link>
        </div>
        {packages.length === 0 ? (
          <p className="text-zinc-500 text-sm">No packages yet. <Link href="/admin/fees/packages" className="text-cyan-400 underline">Create one →</Link></p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-[#0a0c14] border border-[#1e233d] rounded-xl p-4">
                <div className="text-sm font-bold text-white mb-1">{pkg.name}</div>
                <div className="text-2xl font-bold text-cyan-400">₨{Number(pkg.monthlyFee).toLocaleString()}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {Number(pkg.minPercentage)}% – {Number(pkg.maxPercentage)}%
                </div>
                {pkg.description && (
                  <div className="text-xs text-zinc-600 mt-2">{pkg.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
