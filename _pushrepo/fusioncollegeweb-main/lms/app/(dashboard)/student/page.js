import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function StudentDashboard() {
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
    // If user doesn't have STUDENT role, redirect to their actual dashboard
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  // Fetch student profile details from db
  let student = null;
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
  } catch (err) {
    console.error('Error fetching student dashboard info:', err);
  }

  const studentClassName = student?.class?.name || 'F.Sc Pre-Medical Part I (Session 2026)';
  const studentRollNumber = student?.rollNumber || 'FC-2026-4892';

  const courses = [
    { name: 'Biology', teacher: 'Biology HOD', progress: 88, grade: 'A' },
    { name: 'Chemistry', teacher: 'Chemistry HOD', progress: 92, grade: 'A+' },
    { name: 'Physics', teacher: 'Physics HOD', progress: 75, grade: 'B' },
  ];

  const assignments = [
    { title: 'Organic Chemistry Revision', subject: 'Chemistry', deadline: 'July 05, 2026', status: 'Pending' },
    { title: 'Mitosis Diagram Submission', subject: 'Biology', deadline: 'July 02, 2026', status: 'Submitted' },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Student Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {student?.name || user.email}</p>
        </div>
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">{studentClassName}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Roll No: {studentRollNumber}</div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">94.8%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Goal: Keep above 85% for scholarship merit</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Assignments Submitted</div>
          <div className="text-3xl font-black text-white mt-2">12 / 13</div>
          <p className="text-[10px] text-zinc-500 mt-1">1 pending task requires completion</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Current Merit Position</div>
          <div className="text-3xl font-black text-red-400 mt-2">Top 5%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Based on monthly diagnostic exams</p>
        </div>
      </div>

      {/* Course Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white tracking-tight">Active Courses</h2>
          <div className="space-y-4">
            {courses.map((course, idx) => (
              <div key={idx} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-white text-base">{course.name}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{course.teacher}</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Class Grade</div>
                    <div className="text-sm font-black text-white mt-0.5">{course.grade}</div>
                  </div>
                  <div className="w-24 bg-[#16192b] h-2 rounded-full overflow-hidden border border-[#2b3052]">
                    <div className="bg-cyan-500 h-full" style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments Panel */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white tracking-tight">Upcoming Deadlines</h2>
          <div className="space-y-4">
            {assignments.map((assignment, idx) => (
              <div key={idx} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-semibold text-sm text-white truncate">{assignment.title}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${assignment.status === 'Submitted' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' : 'bg-amber-950/50 text-amber-400 border border-amber-500/20'}`}>
                    {assignment.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{assignment.subject}</span>
                  <span className="text-zinc-500">{assignment.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/student/courses" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Courses
          </Link>
          <Link href="/student/assignments" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Assignments
          </Link>
          <Link href="/student/grades" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Grades
          </Link>
          <Link href="/student/attendance" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Attendance
          </Link>
        </div>
      </div>
    </div>
  );
}
