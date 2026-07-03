import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function TeacherDashboard() {
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
    // If user doesn't have TEACHER role, redirect to their actual dashboard
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  // Fetch teacher profile details
  let teacher = null;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        teacher: {
          include: {
            subjects: {
              include: {
                subject: true,
                class: {
                  include: {
                    _count: { select: { students: true } }
                  }
                }
              }
            }
          }
        }
      },
    });
    teacher = dbUser?.teacher;
  } catch (err) {
    console.error('Error fetching teacher data:', err);
  }

  const teacherName = teacher?.name || user.email;
  const qualification = teacher?.qualification || 'Senior Subject Specialist';

  const classes = teacher?.subjects?.map(cs => ({
    name: cs.class.name,
    subject: cs.subject.name,
    students: cs.class._count.students,
    schedule: 'Scheduled', // Time slots are in timetable
  })) || [];

  const totalStudents = classes.reduce((sum, cls) => sum + cls.students, 0);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Teacher Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {teacherName}</p>
        </div>
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">{qualification}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Fusion Faculty</div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Assigned Classes</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{classes.length} Classes</div>
          <p className="text-[10px] text-zinc-500 mt-1">Total active students: {totalStudents}</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance Lock Status</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">All Marked</div>
          <p className="text-[10px] text-zinc-500 mt-1">Attendance logs locked for today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Classes List */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white tracking-tight">My Classes</h2>
          <div className="space-y-4">
            {classes.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
                You have not been assigned any classes yet.
              </div>
            ) : (
              classes.map((cls, idx) => (
                <div key={idx} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-white text-base">{cls.name}</div>
                    <div className="text-xs text-cyan-400 mt-0.5">Subject: {cls.subject}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Total Students</div>
                      <div className="text-xs font-semibold text-white mt-0.5">{cls.students} enrolled</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/teacher/classes" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            View My Classes
          </Link>
          <Link href="/teacher/assignments" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            Manage Assignments
          </Link>
        </div>
      </div>
    </div>
  );
}
