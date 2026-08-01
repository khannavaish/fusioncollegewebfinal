import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft } from '@/app/components/icons';
import AnimatedSection from '@/app/components/AnimatedSection';
import TeacherProfileActions from './TeacherProfileActions';

export default async function TeacherProfilePage({ params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard');

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      inchargeClasses: { orderBy: { name: 'asc' } },
      subjects: {
        include: {
          class: true,
          subject: true,
        },
        orderBy: { class: { name: 'asc' } },
      },
      salaryBills: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      },
    },
  });

  if (!teacher) redirect('/admin/teachers');

  // Serialize all Decimals + Dates into plain JS — NEVER spread raw Prisma objects to client
  const serializedTeacher = {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.name,
    phone: teacher.phone,
    department: teacher.department,
    qualification: teacher.qualification,
    baseSalary: teacher.baseSalary ? Number(teacher.baseSalary) : null,
    user: teacher.user ? {
      id: teacher.user.id,
      email: teacher.user.email,
      plainPassword: teacher.user.plainPassword,
      status: teacher.user.status,
    } : null,
    inchargeClasses: teacher.inchargeClasses.map(c => ({ id: c.id, name: c.name })),
    subjects: teacher.subjects.map(cs => ({
      id: cs.id,
      class: { id: cs.class.id, name: cs.class.name },
      subject: { id: cs.subject.id, name: cs.subject.name },
    })),
    salaryBills: teacher.salaryBills.map(b => ({
      id: b.id,
      month: b.month,
      year: b.year,
      baseAmount: Number(b.baseAmount),
      paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
      status: b.status,
      paidAt: b.paidAt ? b.paidAt.toISOString() : null,
      remarks: b.remarks ?? null,
    })),
  };

  const totalSubjects = teacher.subjects.length;
  const inchargeCount = teacher.inchargeClasses.length;
  const totalSalaryPaid = serializedTeacher.salaryBills
    .filter(b => b.status === 'PAID')
    .reduce((sum, b) => sum + (b.paidAmount ?? b.baseAmount), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <AnimatedSection delay={0.1}>
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[#1e233d] pb-6">
          <Link href="/admin/teachers" className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0d0f1a] border border-[#1e233d] text-zinc-400 hover:text-white hover:border-cyan-500/50 transition-colors">
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 font-bold text-xl ring-2 ring-cyan-900/50 flex-shrink-0">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{teacher.name}</h1>
              <p className="text-zinc-400 text-sm mt-0.5">
                {teacher.department || 'No Department'}
                {teacher.qualification && <span className="text-zinc-500"> • {teacher.qualification}</span>}
              </p>
            </div>
          </div>
          {/* Actions (edit, password, delete) */}
          <TeacherProfileActions teacher={serializedTeacher} />
        </div>
      </AnimatedSection>

      {/* Stats strip */}
      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Subjects Assigned', value: totalSubjects, color: 'text-cyan-400', bg: 'from-cyan-950/30 to-cyan-900/10', border: 'border-cyan-500/20' },
            { label: 'Incharge Classes', value: inchargeCount, color: 'text-violet-400', bg: 'from-violet-950/30 to-violet-900/10', border: 'border-violet-500/20' },
            { label: 'Base Salary', value: serializedTeacher.baseSalary ? `₨ ${serializedTeacher.baseSalary.toLocaleString()}` : '—', color: 'text-emerald-400', bg: 'from-emerald-950/30 to-emerald-900/10', border: 'border-emerald-500/20' },
            { label: 'Total Paid (YTD)', value: totalSalaryPaid > 0 ? `₨ ${totalSalaryPaid.toLocaleString()}` : '—', color: 'text-amber-400', bg: 'from-amber-950/30 to-amber-900/10', border: 'border-amber-500/20' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} border ${stat.border} rounded-xl p-4`}>
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <AnimatedSection delay={0.2}>
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#1e233d] pb-3">Personal Information</h2>
            {[
              { label: 'Full Name', value: teacher.name },
              { label: 'Phone', value: teacher.phone || '—' },
              { label: 'Department', value: teacher.department || '—' },
              { label: 'Qualification', value: teacher.qualification || '—' },
              { label: 'Status', value: teacher.user?.status || 'ACTIVE', badge: true },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <span className="text-xs text-zinc-500 font-medium flex-shrink-0">{item.label}</span>
                {item.badge ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                    item.value === 'ACTIVE'
                      ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-950/50 text-red-400 border-red-500/30'
                  }`}>{item.value}</span>
                ) : (
                  <span className="text-sm text-white font-medium text-right">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Login Credentials */}
        <AnimatedSection delay={0.25}>
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-[#1e233d] pb-3">Login Credentials</h2>
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-zinc-500 font-medium flex-shrink-0">Email</span>
              <span className="text-sm text-white font-mono text-right break-all">{teacher.user?.email}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-zinc-500 font-medium flex-shrink-0">Password</span>
              <span className="text-sm text-zinc-300 font-mono">{teacher.user?.plainPassword || '(hidden)'}</span>
            </div>
            {/* Incharge classes */}
            {teacher.inchargeClasses.length > 0 && (
              <>
                <div className="border-t border-[#1e233d] pt-4">
                  <div className="text-xs text-zinc-500 font-medium mb-2">Incharge Of</div>
                  <div className="flex flex-wrap gap-2">
                    {teacher.inchargeClasses.map(c => (
                      <span key={c.id} className="text-xs bg-violet-950/30 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded font-semibold">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </AnimatedSection>
      </div>

      {/* Assigned Subjects */}
      <AnimatedSection delay={0.3}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e233d] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Assigned Subjects</h2>
            <span className="text-xs text-zinc-500">{totalSubjects} subject{totalSubjects !== 1 ? 's' : ''}</span>
          </div>
          {teacher.subjects.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">No subjects assigned yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Class</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {serializedTeacher.subjects.map((cs, i) => (
                    <tr key={cs.id} className={`border-b border-[#1e233d] ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                      <td className="px-5 py-3 text-sm font-semibold text-white">{cs.class.name}</td>
                      <td className="px-5 py-3 text-sm text-cyan-400 font-medium">{cs.subject.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* Salary History */}
      <AnimatedSection delay={0.35}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e233d] flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Salary History</h2>
            <Link href="/admin/fees/payroll" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              Go to Payroll →
            </Link>
          </div>
          {serializedTeacher.salaryBills.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">No salary records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Period</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Base Amount</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Paid Amount</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serializedTeacher.salaryBills.map((b, i) => (
                    <tr key={b.id} className={`border-b border-[#1e233d] ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                      <td className="px-5 py-3 text-sm font-mono text-zinc-300">{b.month}/{b.year}</td>
                      <td className="px-5 py-3 text-sm font-mono text-zinc-300">₨ {b.baseAmount.toLocaleString()}</td>
                      <td className="px-5 py-3 text-sm font-mono font-bold text-emerald-400">
                        {b.paidAmount ? `₨ ${b.paidAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                          b.status === 'PAID'
                            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-950/50 text-amber-400 border-amber-500/30'
                        }`}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
