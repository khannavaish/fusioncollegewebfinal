import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function StudentCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has STUDENT role
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true },
    });
  } catch (err) {
    console.error('Error fetching user role:', err);
  }

  if (!dbUser || dbUser.role !== 'STUDENT') {
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  // Fetch student's courses
  let student = null;
  let courses = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });
    student = dbUser?.student;

    if (student) {
      courses = await prisma.classSubject.findMany({
        where: { classId: student.classId },
        include: {
          subject: true,
          teacher: true,
        },
      });
    }
  } catch (err) {
    console.error('Error fetching student courses:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Courses</h1>
          <p className="text-zinc-400 text-sm mt-1">View all your enrolled courses</p>
        </div>
        <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No courses assigned yet. Contact admin for course assignments.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{course.subject.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{course.teacher.name}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-950/30 border border-cyan-800/30 rounded-lg flex items-center justify-center">
                  <span className="text-cyan-400 text-lg font-bold">{course.subject.name.charAt(0)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Teacher:</span>
                  <span className="text-white">{course.teacher.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Class:</span>
                  <span className="text-white">{student?.class?.name || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#1e233d]">
                <Link href={`/student/courses/${course.id}`} className="block text-xs px-3 py-2 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 hover:bg-cyan-950/20 transition-colors text-center">
                  View Course
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
