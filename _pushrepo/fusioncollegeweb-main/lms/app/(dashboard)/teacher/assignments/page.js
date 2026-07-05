import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function TeacherAssignmentsPage() {
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

  // Fetch teacher's assignments
  let teacher = null;
  let assignments = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        teacher: true,
      },
    });
    teacher = dbUser?.teacher;

    if (teacher) {
      assignments = await prisma.assignment.findMany({
        where: {
          classSubject: {
            teacherId: teacher.id,
          },
        },
        include: {
          classSubject: {
            include: {
              class: true,
              subject: true,
            },
          },
          submissions: {
            include: {
              student: true,
            },
          },
        },
        orderBy: { deadline: 'desc' },
      });
    }
  } catch (err) {
    console.error('Error fetching teacher assignments:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Assignments</h1>
          <p className="text-zinc-400 text-sm mt-1">View and manage assignments for your classes</p>
        </div>
        <Link href="/teacher" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No assignments created yet. Create your first assignment.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{assignment.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{assignment.description || 'No description'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                    <span>{assignment.classSubject.class.name}</span>
                    <span>{assignment.classSubject.subject.name}</span>
                    <span>Deadline: {new Date(assignment.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-cyan-400">{assignment.submissions.length}</div>
                  <div className="text-xs text-zinc-400">Submissions</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {assignment.submissions.filter(s => s.grade !== null).length} graded
                  </div>
                </div>
              </div>

              {/* Submissions */}
              {assignment.submissions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Submissions</h4>
                  <div className="space-y-2">
                    {assignment.submissions.map((submission) => (
                      <div key={submission.id} className="bg-[#16192b]/50 border border-[#2b3052] rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-white">{submission.student.name}</div>
                          <div className="text-xs text-zinc-400">{submission.student.rollNumber}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {submission.grade ? (
                            <span className="text-sm font-bold text-emerald-400">{submission.grade}/100</span>
                          ) : (
                            <span className="text-xs text-amber-400">Pending</span>
                          )}
                          <button className="text-xs px-2 py-1 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 hover:bg-cyan-950/20 transition-colors cursor-pointer">
                            Grade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
