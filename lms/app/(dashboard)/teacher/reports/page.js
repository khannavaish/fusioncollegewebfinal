import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import TeacherReportsClient from './TeacherReportsClient';

export const metadata = {
  title: 'Reports & Marks Entry | Fusion College LMS',
  description: 'View class attendance reports and record student exam marks.',
};

export default async function TeacherReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { teacher: true }
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'TEACHER' || !dbUser.teacher) {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const teacherId = dbUser.teacher.id;

  // Fetch classes and subjects this teacher takes
  let classSubjects = [];
  try {
    classSubjects = await prisma.classSubject.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            students: { orderBy: { rollNumber: 'asc' } }
          }
        },
        subject: true,
        exams: {
          orderBy: { date: 'desc' },
          include: { results: true }
        }
      }
    });
  } catch (err) {
    console.error('Error fetching teacher classes:', err);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reports & Marks Entry</h1>
          <p className="text-zinc-400 text-sm mt-1">Review student attendance and enter exam marks with auto grading</p>
        </div>
      </div>

      <TeacherReportsClient
        teacherId={teacherId}
        classSubjects={classSubjects}
      />
    </div>
  );
}
