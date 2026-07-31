import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { submitAssignment } from '@/app/actions/assignments';

export const metadata = {
  title: 'Assignments — Fusion College LMS',
  description: 'View and submit your assignments',
};

export const dynamic = 'force-dynamic';

export default async function StudentAssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { student: true },
    });
  } catch (err) {
    console.error('Error fetching user:', err);
  }

  if (!dbUser || dbUser.role !== 'STUDENT' || !dbUser.student) {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const student = dbUser.student;

  let pending = [];
  let submissions = [];

  try {
    // Get all assignments for student's class
    const allAssignments = await prisma.assignment.findMany({
      where: { classSubject: { classId: student.classId } },
      include: {
        classSubject: { include: { subject: true, teacher: true } },
        submissions: { where: { studentId: student.id } },
      },
      orderBy: { deadline: 'asc' },
    });

    // Split into pending (not yet submitted) and submitted
    pending = allAssignments.filter((a) => a.submissions.length === 0);
    const submitted = allAssignments.filter((a) => a.submissions.length > 0);

    submissions = submitted.map((a) => ({
      ...a.submissions[0],
      assignment: a,
    }));
  } catch (err) {
    console.error('Error fetching assignments:', err);
  }

  const inputCls = 'w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">My Assignments</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {pending.length} pending · {submissions.length} submitted
            </p>
          </div>
          <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      {/* Pending Assignments */}
      <AnimatedSection delay={0.2}>
        {pending.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              Pending Assignments
            </h2>
            <div className="space-y-4">
              {pending.map((assignment) => {
                const isOverdue = new Date(assignment.deadline) < new Date();
                return (
                  <div key={assignment.id} className={`bg-[#0d0f1a] border rounded-xl overflow-hidden ${isOverdue ? 'border-red-500/30' : 'border-amber-500/20'}`}>
                    <div className="p-5 border-b border-[#1e233d]">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-white">{assignment.title}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${isOverdue ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-amber-950/40 text-amber-400 border-amber-500/20'}`}>
                              {isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            {assignment.classSubject.subject.name} · Teacher: {assignment.classSubject.teacher.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Deadline: {new Date(assignment.deadline).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          {assignment.description && (
                            <p className="text-xs text-zinc-400 mt-2">{assignment.description}</p>
                          )}
                          {assignment.fileUrl && (
                            <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                              📎 View Assignment File
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Submit Form */}
                    <div className="p-5 bg-[#16192b]/20">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Submit Your Work</h4>
                      <form action={submitAssignment} className="space-y-2">
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <input
                          name="fileUrl"
                          placeholder="File / Google Drive link (e.g. https://drive.google.com/...)"
                          className={inputCls}
                        />
                        <div className="text-[10px] text-zinc-500 text-center">— or write your answer below —</div>
                        <textarea
                          name="textAnswer"
                          placeholder="Type your written answer here..."
                          rows={3}
                          className={`${inputCls} resize-none`}
                        />
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Submit Assignment
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AnimatedSection>

      {/* Submitted Assignments */}
      <AnimatedSection delay={0.3}>
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Submitted ({submissions.length})</h2>
  
          {submissions.length === 0 && pending.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
              No assignments have been posted for your class yet.
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-600 text-xs">
              No submissions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white">{submission.assignment.title}</h3>
                      <div className="text-xs text-zinc-400 mt-1">
                        {submission.assignment.classSubject.subject.name} · Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                      </div>
                      {submission.fileUrl && (
                        <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                          📎 View Submission
                        </a>
                      )}
                      {submission.remarks && (
                        <div className="mt-3 p-3 bg-[#16192b]/50 border border-[#2b3052] rounded-lg">
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Teacher Remarks</div>
                          <p className="text-xs text-zinc-300">{submission.remarks}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {submission.grade ? (
                        <>
                          <div className="text-2xl font-black text-emerald-400">{submission.grade}</div>
                          <div className="text-[10px] text-zinc-500">Grade</div>
                        </>
                      ) : (
                        <>
                          <div className="text-lg font-black text-amber-400">Pending</div>
                          <div className="text-[10px] text-zinc-500">Awaiting grade</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
