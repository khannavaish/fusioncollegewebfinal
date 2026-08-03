import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import ReportsClient from './ReportsClient';
import { PageShell } from '@/app/components/Brand';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Reports Center | Fusion College LMS',
  description: 'View and manage student progress, class attendance, and teacher logs.',
};

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true }
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  // Fetch initial filter option lists
  let students = [];
  let classes = [];
  let teachers = [];

  try {
    students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        rollNumber: true,
        class: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    });

    teachers = await prisma.teacher.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (err) {
    console.error('Error loading filters data:', err);
  }

  return (
    <PageShell
      title="Reports & Analytics"
      icon={<BarChart3 />}
      description="Export academic progress, attendance grids, and log records"
    >
      <div className="space-y-6 mt-4">

      <AnimatedSection delay={0.2}>
        <ReportsClient
          students={students}
          classes={classes}
          teachers={teachers}
        />
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
