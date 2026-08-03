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
        include: { class: true, subject: true },
        orderBy: { class: { name: 'asc' } },
      },
      salaryBills: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
    },
  });

  if (!teacher) redirect('/admin/teachers');

  const serializedTeacher = {
    id: teacher.id,
    userId: teacher.userId,
    name: teacher.name,
    phone: teacher.phone,
    department: teacher.department,
    qualification: teacher.qualification,
    baseSalary: teacher.baseSalary ? Number(teacher.baseSalary) : null,
    user: teacher.user ? { id: teacher.user.id, email: teacher.user.email, plainPassword: teacher.user.plainPassword, status: teacher.user.status } : null,
    inchargeClasses: teacher.inchargeClasses.map(c => ({ id: c.id, name: c.name })),
    subjects: teacher.subjects.map(cs => ({ id: cs.id, class: { id: cs.class.id, name: cs.class.name }, subject: { id: cs.subject.id, name: cs.subject.name } })),
    salaryBills: teacher.salaryBills.map(b => ({ id: b.id, month: b.month, year: b.year, baseAmount: Number(b.baseAmount), paidAmount: b.paidAmount ? Number(b.paidAmount) : null, status: b.status, paidAt: b.paidAt ? b.paidAt.toISOString() : null, remarks: b.remarks ?? null })),
  };

  const totalSubjects = teacher.subjects.length;
  const inchargeCount = teacher.inchargeClasses.length;
  const totalSalaryPaid = serializedTeacher.salaryBills
    .filter(b => b.status === 'PAID')
    .reduce((sum, b) => sum + (b.paidAmount ?? b.baseAmount), 0);

  return (
    <div className="space-y-10 max-w-5xl mx-auto font-sans text-white">
      <AnimatedSection delay={0.1}>
        {/* Header - Glassmorphism */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black/20 backdrop-blur-3xl border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
            <Link href="/admin/teachers" className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all hover:scale-105">
              <IconChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 font-black text-2xl ring-2 ring-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.2)] flex-shrink-0">
                {teacher.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight drop-shadow-md">{teacher.name}</h1>
                <p className="text-white/60 text-sm mt-1 font-medium">
                  {teacher.department || 'No Department'}
                  {teacher.qualification && <span className="text-white/40"> • {teacher.qualification}</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <TeacherProfileActions teacher={serializedTeacher} />
          </div>
        </div>
      </AnimatedSection>

      {/* Floating Stats */}
      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
          {[
            { label: 'Subjects', value: totalSubjects, color: 'text-cyan-400', border: 'border-cyan-500/10' },
            { label: 'Incharge Of', value: inchargeCount, color: 'text-violet-400', border: 'border-violet-500/10' },
            { label: 'Base Salary', value: serializedTeacher.baseSalary ? `₨ ${serializedTeacher.baseSalary.toLocaleString()}` : '—', color: 'text-emerald-400', border: 'border-emerald-500/10' },
            { label: 'YTD Paid', value: totalSalaryPaid > 0 ? `₨ ${totalSalaryPaid.toLocaleString()}` : '—', color: 'text-amber-400', border: 'border-amber-500/10' },
          ].map(stat => (
            <div key={stat.label} className={`bg-white/5 backdrop-blur-md border ${stat.border} rounded-2xl p-5 hover:bg-white/10 transition-colors shadow-lg`}>
              <div className={`text-2xl font-black ${stat.color} drop-shadow-md`}>{stat.value}</div>
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-4 pt-4">
        {/* Personal & Login Info - Clean Unboxed */}
        <AnimatedSection delay={0.2} className="space-y-12">
          <div>
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-bold">i</span>
              Personal Information
            </h2>
            <div className="space-y-5">
              {[
                { label: 'Full Name', value: teacher.name },
                { label: 'Phone', value: teacher.phone || '—' },
                { label: 'Department', value: teacher.department || '—' },
                { label: 'Qualification', value: teacher.qualification || '—' },
                { label: 'Status', value: teacher.user?.status || 'ACTIVE', badge: true },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-end border-b border-white/5 pb-3 hover:border-white/10 transition-colors">
                  <span className="text-xs text-white/40 font-bold uppercase tracking-wider">{item.label}</span>
                  {item.badge ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      item.value === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>{item.value}</span>
                  ) : (
                    <span className="text-sm text-white/90 font-semibold text-right">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 font-bold">@</span>
              Login Credentials
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                <div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Email</p>
                  <p className="text-sm text-white/90 font-mono mt-0.5">{teacher.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                <div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Password</p>
                  <p className="text-sm text-amber-400 font-mono font-bold mt-0.5 tracking-widest">{teacher.user?.plainPassword || '(hidden)'}</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Subjects & Salary Tables - Glass Lists */}
        <AnimatedSection delay={0.3} className="space-y-12">
          
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white/90">Assigned Subjects</h2>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20 uppercase tracking-wider">{totalSubjects} Subjects</span>
            </div>
            {teacher.subjects.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm font-semibold bg-white/5 rounded-2xl border border-white/5">No subjects assigned yet.</div>
            ) : (
              <div className="space-y-2">
                {serializedTeacher.subjects.map((cs) => (
                  <div key={cs.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <span className="text-sm font-bold text-white/90">{cs.class.name}</span>
                    <span className="text-sm text-cyan-400 font-semibold">{cs.subject.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white/90">Salary History</h2>
              <Link href="/admin/fees/payroll" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">View Payroll →</Link>
            </div>
            {serializedTeacher.salaryBills.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm font-semibold bg-white/5 rounded-2xl border border-white/5">No salary records found.</div>
            ) : (
              <div className="space-y-2">
                {serializedTeacher.salaryBills.map((b) => (
                  <div key={b.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-white/90">{b.month}/{b.year}</div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">Base: ₨ {b.baseAmount.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">{b.paidAmount ? `₨ ${b.paidAmount.toLocaleString()}` : '—'}</div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${b.status === 'PAID' ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>{b.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </AnimatedSection>
      </div>
    </div>
  );
}
