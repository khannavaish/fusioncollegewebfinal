import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import ReportsClient from './ReportsClient';

export const metadata = {
  title: 'Reports Center — Fusion College LMS',
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
        class: { select: { name: true } }
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-zinc-400 text-sm mt-1">Export academic progress, attendance grids, and log records</p>
        </div>
      </div>

      <ReportsClient
        students={students}
        classes={classes}
        teachers={teachers}
      />
    </div>
  );
}
