import prisma from '@/utils/db';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
  IconChart, IconSettings, IconDocumentText, IconAlertTriangle,
  IconCheckCircle, IconXCircle, IconClock, IconDownload, IconBolt,
  IconChevronRight
} from '@/app/components/icons';
import AnimatedSection from '@/app/components/AnimatedSection';
import { generateMonthlyBills } from '@/app/actions/fees';
import BillingExecutionForm from './BillingExecutionForm';
import BankSettingsForm from './BankSettingsForm';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const metadata = { title: 'Fee Management | Fusion LMS' };

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
  const [bills, packages, totalStudents, bankConfig] = await Promise.all([
    prisma.feeBill.findMany({
      where: { month, year },
      select: { status: true, totalAmount: true, paidAmount: true },
    }),
    prisma.feePackage.findMany({ orderBy: { monthlyFee: 'asc' } }),
    prisma.student.count({ where: { user: { status: 'ACTIVE' } } }),
    prisma.bankConfig.findUnique({ where: { id: 'default' } }),
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
    <div className="space-y-8 font-sans">
      {/* Header */}
      <AnimatedSection delay={0.05}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
            <Link href="/admin" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
            <IconChevronRight className="w-3 h-3" />
            <span className="text-zinc-300">Fee Management</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <IconChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Fee Management</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-2 font-medium">
            {MONTH_NAMES[month - 1]} {year} Overview • {stats.total} bills generated
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/fees/packages"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1e233d] bg-[#0d0f1a] text-zinc-300 text-sm font-medium hover:bg-[#1e233d] hover:text-white transition-all shadow-sm"
          >
            <IconSettings className="w-4 h-4 text-violet-400" />
            Manage Packages
          </Link>
          <Link
            href="/admin/fees/bills"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1e233d] bg-[#0d0f1a] text-zinc-300 text-sm font-medium hover:bg-[#1e233d] hover:text-white transition-all shadow-sm"
          >
            <IconDocumentText className="w-4 h-4 text-cyan-400" />
            View All Bills
          </Link>
        </div>
      </div>
    </AnimatedSection>

      {/* Warning: students without package */}
      {studentsWithoutPackage > 0 && (
        <AnimatedSection delay={0.1}>
          <div className="flex items-start gap-4 bg-amber-950/20 border border-amber-900/50 rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <IconAlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-amber-400 font-semibold text-sm">
              Action Required: {studentsWithoutPackage} active student(s) lack a fee package
            </p>
            <p className="text-zinc-400 text-sm mt-1">
              These students will be excluded from the automated billing cycle.
            </p>
            <Link href="/admin/fees/assign" className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium mt-2 transition-colors">
              Assign packages now <IconChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        </AnimatedSection>
      )}

      {/* Stats Grid */}
      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bills', value: stats.total, icon: <IconDocumentText className="w-5 h-5 text-cyan-400" />, bg: 'bg-cyan-500/10' },
          { label: 'Unpaid', value: stats.unpaid, icon: <IconXCircle className="w-5 h-5 text-red-400" />, bg: 'bg-red-500/10' },
          { label: 'Paid', value: stats.paid, icon: <IconCheckCircle className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/10' },
          { label: 'Partial / Waived', value: `${stats.partial} / ${stats.waived}`, icon: <IconClock className="w-5 h-5 text-amber-400" />, bg: 'bg-amber-500/10' },
        ].map((s, idx) => (
          <div key={idx} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-5 hover:border-[#2a304e] transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.bg}`}>
                {s.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-white group-hover:text-cyan-50 transition-colors">{s.value}</div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
        </div>
      </AnimatedSection>

      {/* Revenue Cards */}
      <AnimatedSection delay={0.2}>
        <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#0d0f1a] to-[#111322] border border-[#1e233d] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Total Due This Month</span>
          </div>
          <div className="text-4xl font-black text-white mt-3">
            <span className="text-zinc-500 font-light text-2xl mr-1">₨</span>
            {stats.totalDue.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-zinc-500 mt-2 bg-black/20 inline-block px-2.5 py-1 rounded-md border border-white/5">
            Across {stats.total} generated bills
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0d0f1a] to-[#0a1614] border border-[#1e233d] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Collected So Far</span>
          </div>
          <div className="text-4xl font-black text-emerald-400 mt-3 drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)]">
            <span className="text-emerald-700 font-light text-2xl mr-1">₨</span>
            {stats.totalCollected.toLocaleString()}
          </div>
          <div className="text-xs font-medium text-zinc-500 mt-2 bg-black/20 inline-block px-2.5 py-1 rounded-md border border-white/5">
            {stats.totalDue > 0
              ? `${Math.round((stats.totalCollected / stats.totalDue) * 100)}% collection rate achieved`
              : 'Awaiting bill generation'}
          </div>
        </div>
        </div>
      </AnimatedSection>

      {/* Bank Config Settings */}
      <AnimatedSection delay={0.3}>
        <BankSettingsForm initialConfig={bankConfig || { accountTitle: 'Fusion College Narowal', accountNumber: '', bankName: '', branchCode: '' }} />
      </AnimatedSection>

      {/* Generate Bills Section */}
      <AnimatedSection delay={0.25}>
        <div className="bg-gradient-to-r from-cyan-950/20 to-blue-950/20 border border-cyan-900/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <IconBolt className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Manual Billing Execution</h2>
        </div>
        
        <p className="text-zinc-400 text-sm mb-6 max-w-2xl leading-relaxed">
          Select the billing cycle and due date to instantly generate fee vouchers for all enrolled students. 
          Notifications will be dispatched automatically to parent WhatsApp numbers upon execution.
        </p>
        
        <BillingExecutionForm month={month} year={year} />
        </div>
      </AnimatedSection>

      {/* Fee Packages Overview */}
      <AnimatedSection delay={0.3}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1e233d] flex items-center justify-center">
                <IconSettings className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">Configured Fee Packages</h2>
            </div>
            <Link href="/admin/fees/packages" className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Manage Configuration <IconChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {packages.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-[#1e233d] rounded-xl">
              <IconSettings className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium">No fee packages configured.</p>
              <Link href="/admin/fees/packages" className="text-cyan-400 text-sm font-medium hover:underline mt-1 inline-block">
                Create your first package
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-[#060810] border border-[#1e233d] rounded-xl p-5 hover:border-violet-500/30 transition-colors group">
                  <div className="text-sm font-bold text-white mb-2">{pkg.name}</div>
                  <div className="text-3xl font-black text-cyan-400 tracking-tight group-hover:scale-105 transition-transform origin-left">
                    <span className="text-cyan-700 text-lg mr-1 font-light">₨</span>
                    {Number(pkg.monthlyFee).toLocaleString()}
                  </div>
                  <div className="inline-block px-2 py-1 bg-white/5 rounded text-xs text-zinc-400 font-medium mt-3 border border-white/5">
                    Criteria: {Number(pkg.minPercentage)}% – {Number(pkg.maxPercentage)}%
                  </div>
                  {pkg.description && (
                    <div className="text-xs text-zinc-500 mt-3 leading-relaxed">{pkg.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
