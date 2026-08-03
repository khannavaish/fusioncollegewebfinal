import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft, IconEdit, IconDocumentText, IconTrash, IconIdCard, IconMail, IconKey } from '@/app/components/icons';
import AnimatedSection from '@/app/components/AnimatedSection';
import Image from 'next/image';
import StudentProfileActions from './StudentProfileActions';
import EditFeeButton from './EditFeeButton';
import GenerateBillButton from './GenerateBillButton';

export default async function StudentProfilePage({ params }) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: true,
      user: true,
      feePackage: true,
    },
  });

  if (!student) {
    redirect('/admin/students');
  }

  const classes = await prisma.class.findMany({ orderBy: { name: 'asc' } });
  const feePackagesRaw = await prisma.feePackage.findMany({ orderBy: { minPercentage: 'asc' } });
  const feePackages = feePackagesRaw.map(fp => ({
    ...fp,
    monthlyFee: Number(fp.monthlyFee)
  }));

  const assignedFee = student.feeMonthlyOverride 
    ? Number(student.feeMonthlyOverride)
    : (student.feePackage ? Number(student.feePackage.monthlyFee) : 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans text-white">
      <AnimatedSection delay={0.1}>
        {/* Header - Glassmorphism */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black/20 backdrop-blur-3xl border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-6 relative z-10">
            <Link href="/admin/students" className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all hover:scale-105">
              <IconChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-5">
              {student.photoUrl ? (
                <Image src={student.photoUrl} alt={student.name} width={72} height={72} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10 shadow-xl" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-black text-2xl ring-2 ring-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  {student.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-black tracking-tight drop-shadow-md">{student.name}</h1>
                <p className="text-white/60 text-sm mt-1 font-medium">Roll No: <span className="text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md">{student.rollNumber}</span> • {student.class.name} ({student.class.academicYr})</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 relative z-10">
              <StudentProfileActions 
                student={{
                  ...student,
                  admissionPercentage: student.admissionPercentage ? Number(student.admissionPercentage) : null,
                  feeMonthlyOverride: student.feeMonthlyOverride ? Number(student.feeMonthlyOverride) : null,
                  feePackage: student.feePackage ? { ...student.feePackage, monthlyFee: Number(student.feePackage.monthlyFee) } : null,
                  feeBills: student.feeBills ? student.feeBills.map(b => ({ ...b, baseAmount: Number(b.baseAmount), totalAmount: Number(b.totalAmount), paidAmount: b.paidAmount ? Number(b.paidAmount) : null })) : [],
                }} 
                classes={classes} 
              />
            <GenerateBillButton studentId={student.id} />
            <Link href={`/admin/students/${student.id}/ledger`} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-bold rounded-xl transition-all hover:scale-105 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <IconDocumentText className="w-4 h-4" /> Ledger
            </Link>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4">
        {/* Left Column: Demographic Info - Unboxed, Clean Flow */}
        <AnimatedSection delay={0.2}>
          <div className="relative group">
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <IconIdCard className="w-4 h-4 text-cyan-400" />
              </div>
              Demographic Info
            </h2>
            <div className="space-y-5">
              {[
                { label: "Father's Name", value: student.fatherName },
                { label: "Gender", value: student.gender || 'N/A' },
                { label: "Student CNIC", value: student.cnic || 'N/A', mono: true },
                { label: "Father CNIC", value: student.fatherCnic || 'N/A', mono: true },
                { label: "WhatsApp", value: student.whatsappNumber || 'N/A', mono: true },
                { label: "Telephone", value: student.telephone || 'N/A', mono: true },
                { label: "Address", value: student.address || 'N/A' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-end border-b border-white/5 pb-3 group-hover:border-white/10 transition-colors">
                  <span className="text-xs text-white/40 font-bold uppercase tracking-wider">{item.label}</span>
                  <span className={`text-sm text-white/90 font-semibold text-right max-w-[60%] ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Right Column: Account & Fee - Unboxed */}
        <AnimatedSection delay={0.3} className="space-y-12">
          
          {/* Account Credentials */}
          <div>
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <IconKey className="w-4 h-4 text-violet-400" />
              </div>
              Account Access
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <IconMail className="w-5 h-5 text-white/40" />
                  <div>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Email Login</p>
                    <p className="text-sm text-white/90 font-mono mt-0.5">{student.user.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <IconKey className="w-5 h-5 text-white/40" />
                  <div>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Password</p>
                    <p className="text-sm text-amber-400 font-mono font-bold tracking-widest mt-0.5">{student.user.plainPassword || 'Hidden'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Assignment */}
          <div className="relative group">
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <EditFeeButton 
                student={{
                  ...student,
                  admissionPercentage: student.admissionPercentage ? Number(student.admissionPercentage) : null,
                  feeMonthlyOverride: student.feeMonthlyOverride ? Number(student.feeMonthlyOverride) : null,
                  feePackage: student.feePackage ? { ...student.feePackage, monthlyFee: Number(student.feePackage.monthlyFee) } : null,
                  feePackageId: student.feePackageId,
                  id: student.id,
                }} 
                feePackages={feePackages} 
              />
            </div>
            <h2 className="text-lg font-black text-white/90 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <IconDocumentText className="w-4 h-4 text-emerald-400" />
              </div>
              Fee Assignment
            </h2>
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-emerald-900/20 to-black/20 border border-emerald-500/10 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-sm font-bold text-emerald-100">{student.feeMonthlyOverride ? 'Custom Fee (Override)' : (student.feePackage?.name || 'No Package Assigned')}</p>
                  <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-wider mt-1">Status: {student.user.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-emerald-400 drop-shadow-md tracking-tighter">₨{assignedFee.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-wider mt-1">per month</p>
                </div>
              </div>
            </div>
          </div>

        </AnimatedSection>
      </div>
    </div>
  );
}
