import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft } from '@/app/components/icons';
import StudentCreateForm from './StudentCreateForm';
import StudentsClient from './StudentsClient';
import { PageShell } from '@/app/components/Brand';
import { Users } from 'lucide-react';

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  let students = [], classes = [], feePackages = [], total = 0;
  try {
    [students, total, classes, feePackages] = await Promise.all([
      prisma.student.findMany({
        include: { class: true, user: true },
        orderBy: { name: 'asc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.student.count(),
      prisma.class.findMany({ orderBy: { name: 'asc' } }),
      prisma.feePackage.findMany({ orderBy: { minPercentage: 'desc' }, select: { id: true, name: true, minPercentage: true, maxPercentage: true, monthlyFee: true } }),
    ]);
  } catch {}

  // Serialize Decimal fields from feePackages
  const serializedPackages = feePackages.map((p) => ({
    id: p.id,
    name: p.name,
    minPercentage: Number(p.minPercentage),
    maxPercentage: Number(p.maxPercentage),
    monthlyFee: Number(p.monthlyFee),
  }));

  return (
    <PageShell 
      title="Manage Students" 
      icon={<Users />}
      description={`${students.length} student${students.length !== 1 ? 's' : ''} enrolled`}
      rightContent={
        <Link href="/admin" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 uppercase tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 transition-all hover:bg-cyan-500/20">
          <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      }
    >
      <div className="space-y-8 font-sans mt-4">
        {/* Client enrollment form (shows credential modal on success) */}
        <AnimatedSection delay={0.2}>
          <StudentCreateForm classes={classes} feePackages={serializedPackages} />
        </AnimatedSection>

        {/* Students Table */}
        <AnimatedSection delay={0.3}>
          {students.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
              No students enrolled yet. Enroll your first student above.
            </div>
          ) : (
            <StudentsClient
              students={students.map(s => ({
                id: s.id,
                userId: s.userId,
                name: s.name,
                fatherName: s.fatherName,
                rollNumber: s.rollNumber,
                photoUrl: s.photoUrl,
                classId: s.classId,
                class: s.class,
                user: s.user ? { email: s.user.email, status: s.user.status } : null,
              }))}
              classes={classes}
              feePackages={serializedPackages}
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
            />
          )}
        </AnimatedSection>
      </div>
    </PageShell>
  );
}
