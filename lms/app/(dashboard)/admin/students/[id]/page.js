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

  // Calculate assigned monthly fee (custom override or package)
  const assignedFee = student.feeMonthlyOverride 
    ? Number(student.feeMonthlyOverride)
    : (student.feePackage ? Number(student.feePackage.monthlyFee) : 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <AnimatedSection delay={0.1}>
        <div className="flex items-center gap-4 border-b border-[#1e233d] pb-6">
          <Link href="/admin/students" className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0d0f1a] border border-[#1e233d] text-zinc-400 hover:text-white hover:border-cyan-500/50 transition-colors">
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 flex items-center gap-4">
            {student.photoUrl ? (
              <Image src={student.photoUrl} alt={student.name} width={56} height={56} className="w-14 h-14 rounded-full object-cover ring-2 ring-[#1e233d]" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-cyan-950 flex items-center justify-center text-cyan-400 font-bold text-xl ring-2 ring-cyan-900/50">
                {student.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{student.name}</h1>
              <p className="text-zinc-400 text-sm mt-0.5">Roll No: <span className="text-cyan-400 font-mono">{student.rollNumber}</span> • {student.class.name} ({student.class.academicYr})</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
              <StudentProfileActions 
                student={{
                  ...student,
                  admissionPercentage: student.admissionPercentage ? Number(student.admissionPercentage) : null,
                  feeMonthlyOverride: student.feeMonthlyOverride ? Number(student.feeMonthlyOverride) : null,
                  feePackage: student.feePackage ? {
                    ...student.feePackage,
                    monthlyFee: Number(student.feePackage.monthlyFee),
                  } : null,
                  feeBills: student.feeBills ? student.feeBills.map(b => ({
                    ...b,
                    baseAmount: Number(b.baseAmount),
                    totalAmount: Number(b.totalAmount),
                    paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
                  })) : [],
                }} 
                classes={classes} 
              />
            <GenerateBillButton studentId={student.id} />
            <Link href={`/admin/students/${student.id}/ledger`} className="flex items-center gap-2 px-4 py-2 bg-[#0d0f1a] hover:bg-[#16192b] border border-[#1e233d] text-white text-sm font-semibold rounded-xl transition-colors">
              <IconDocumentText className="w-4 h-4 text-emerald-400" /> Ledger
            </Link>
          </div>
        </div>
      </AnimatedSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatedSection delay={0.4}>
          <div className="bg-[#0a0c14] border border-[#1e233d] rounded-2xl p-6 h-full flex flex-col justify-center relative group">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <IconIdCard className="w-4 h-4 text-cyan-400" /> Demographic Info
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#1e233d]/50">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Father's Name</span>
                <span className="text-sm text-white font-medium">{student.fatherName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e233d]/50">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Gender</span>
                <span className="text-sm text-white font-medium">{student.gender || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e233d]/50">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Student CNIC</span>
                <span className="text-sm text-zinc-300 font-mono">{student.cnic || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e233d]/50">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Father CNIC</span>
                <span className="text-sm text-zinc-300 font-mono">{student.fatherCnic || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e233d]/50">
                <span className="text-xs text-zinc-500 font-semibold uppercase">WhatsApp</span>
                <span className="text-sm text-zinc-300 font-mono">{student.whatsappNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#1e233d]/50">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Telephone</span>
                <span className="text-sm text-zinc-300 font-mono">{student.telephone || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Address</span>
                <span className="text-sm text-white font-medium text-right max-w-[60%] truncate" title={student.address}>{student.address || 'N/A'}</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <div className="space-y-6">
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <IconKey className="w-4 h-4 text-emerald-400" /> Account & Credentials
              </h2>
              <div className="space-y-3">
                <div className="bg-[#16192b] border border-[#1e233d] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950 flex items-center justify-center">
                      <IconMail className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase">Email Login</p>
                      <p className="text-xs text-white font-mono">{student.user.email}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#16192b] border border-[#1e233d] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-950 flex items-center justify-center">
                      <IconKey className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase">Password</p>
                      <p className="text-xs text-amber-400 font-mono font-bold tracking-widest">{student.user.plainPassword || 'Hidden'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <IconDocumentText className="w-4 h-4 text-indigo-400" /> Fee Assignment
              </h2>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">{student.feeMonthlyOverride ? 'Custom Fee (Override)' : (student.feePackage?.name || 'No Package Assigned')}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Status: {student.user.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-400 tracking-tighter">₨{assignedFee.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">per month</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
