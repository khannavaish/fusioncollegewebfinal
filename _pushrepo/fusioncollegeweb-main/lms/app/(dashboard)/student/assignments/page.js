import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function StudentAssignmentsPage() {
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

  // Fetch student's submissions
  let student = null;
  let submissions = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: true,
      },
    });
    student = dbUser?.student;

    if (student) {
      submissions = await prisma.submission.findMany({
        where: { studentId: student.id },
        include: {
          assignment: {
            include: {
              classSubject: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });
    }
  } catch (err) {
    console.error('Error fetching student submissions:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Assignments</h1>
          <p className="text-zinc-400 text-sm mt-1">View your assignment submissions and grades</p>
        </div>
        <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No assignments submitted yet.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{submission.assignment.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{submission.assignment.description || 'No description'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                    <span>{submission.assignment.classSubject.subject.name}</span>
                    <span>Deadline: {new Date(submission.assignment.deadline).toLocaleDateString()}</span>
                    <span>Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  {submission.grade ? (
                    <>
                      <div className="text-3xl font-black text-emerald-400">{submission.grade}</div>
                      <div className="text-xs text-zinc-400">Grade</div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-black text-amber-400">Pending</div>
                      <div className="text-xs text-zinc-400">Status</div>
                    </>
                  )}
                </div>
              </div>

              {submission.remarks && (
                <div className="mt-4 p-3 bg-[#16192b]/50 border border-[#2b3052] rounded-lg">
                  <h4 className="text-sm font-semibold text-white mb-1">Teacher Remarks</h4>
                  <p className="text-xs text-zinc-400">{submission.remarks}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
