import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft } from '@/app/components/icons';
import TeacherCreateForm from './TeacherCreateForm';
import TeachersClient from './TeachersClient';
import { PageShell } from '@/app/components/Brand';
import { Users } from 'lucide-react';

const PAGE_SIZE = 20;

export const metadata = {
  title: 'Manage Teachers | Fusion College LMS',
};

export default async function AdminTeachersPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  let teachers = [], total = 0;
  try {
    [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        include: {
          user: true,
          inchargeClasses: true,
          _count: { select: { subjects: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.teacher.count(),
    ]);
  } catch {}

  // Serialize Decimal (baseSalary) so Client Components don't crash
  const serializedTeachers = teachers.map(t => ({
    id: t.id,
    userId: t.userId,
    name: t.name,
    phone: t.phone,
    qualification: t.qualification,
    department: t.department,
    baseSalary: t.baseSalary ? Number(t.baseSalary) : null,
    inchargeClasses: t.inchargeClasses.map(c => ({ id: c.id, name: c.name })),
    user: t.user ? { email: t.user.email, plainPassword: t.user.plainPassword, status: t.user.status } : null,
    _count: t._count,
  }));

  return (
    <PageShell
      title="Manage Teachers"
      icon={<Users />}
      description={`${total} teacher${total !== 1 ? 's' : ''} registered`}
      rightContent={
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 uppercase tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 transition-all hover:bg-cyan-500/20">
            <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
          <TeacherCreateForm />
        </div>
      }
    >
      <div className="space-y-8 font-sans mt-4">
        {/* Teachers Table */}
      <AnimatedSection delay={0.3}>
        {teachers.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
            No teachers yet. Register your first teacher above.
          </div>
        ) : (
          <TeachersClient
            teachers={serializedTeachers}
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
