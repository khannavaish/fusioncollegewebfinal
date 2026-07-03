import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function TeacherAttendanceIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has TEACHER role
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true },
    });
  } catch (err) {
    console.error('Error fetching user role:', err);
  }

  if (!dbUser || dbUser.role !== 'TEACHER') {
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  // Fetch teacher's assigned class subjects
  let teacher = null;
  let classSubjects = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        teacher: true,
      },
    });
    teacher = dbUser?.teacher;

    if (teacher) {
      classSubjects = await prisma.classSubject.findMany({
        where: { teacherId: teacher.id },
        include: {
          class: {
            include: {
              students: true,
            },
          },
          subject: true,
        },
        orderBy: { class: { name: 'asc' } },
      });
    }
  } catch (err) {
    console.error('Error fetching teacher data for attendance:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Attendance Center</h1>
          <p className="text-zinc-400 text-sm mt-1">Select an allotted class to mark attendance or view past lecture logs</p>
        </div>
        <Link href="/teacher" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {classSubjects.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No classes assigned yet. Contact admin to assign classes and subjects.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classSubjects.map((cs) => (
            <div key={cs.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 flex flex-col justify-between hover:border-[#2b3052] transition-colors group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{cs.class.name}</h3>
                    <p className="text-sm font-semibold text-cyan-400 mt-1">{cs.subject.name}</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 font-bold uppercase rounded">
                    Session 2026
                  </span>
                </div>

                <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-lg p-4 mb-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Total Students</span>
                    <span className="text-base font-bold text-white mt-0.5 block">{cs.class.students.length} Enrolled</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Academic Year</span>
                    <span className="text-base font-bold text-white mt-0.5 block">{cs.class.academicYr}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/teacher/classes/${cs.id}/attendance`}
                  className="block w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider text-center rounded-lg transition-colors cursor-pointer"
                >
                  Take Attendance & Log Lecture
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
