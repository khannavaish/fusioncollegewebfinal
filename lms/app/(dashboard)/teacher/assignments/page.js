import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { createAssignment, deleteAssignment, gradeSubmission } from '@/app/actions/assignments';

export const metadata = {
  title: 'Assignments | Fusion College LMS',
  description: 'Create and manage assignments for your classes',
};

export const dynamic = 'force-dynamic';

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { teacher: true },
    });
  } catch (err) {
    console.error('Error fetching user:', err);
  }

  if (!dbUser || dbUser.role !== 'TEACHER' || !dbUser.teacher) {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const teacher = dbUser.teacher;

  // Fetch teacher's ClassSubjects for the Create form dropdown
  let classSubjects = [];
  let assignments = [];

  try {
    classSubjects = await prisma.classSubject.findMany({
      where: { teacherId: teacher.id },
      include: { class: true, subject: true },
      orderBy: [{ class: { name: 'asc' } }],
    });

    assignments = await prisma.assignment.findMany({
      where: { classSubject: { teacherId: teacher.id } },
      include: {
        classSubject: { include: { class: true, subject: true } },
        submissions: { include: { student: true } },
      },
      orderBy: { deadline: 'desc' },
    });
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
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Assignments</h1>
            <p className="text-zinc-400 text-sm mt-1">Create and manage assignments · grade student submissions</p>
          </div>
          <Link href="/teacher" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      {/* Create Assignment Form */}
      <AnimatedSection delay={0.2}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Create New Assignment</h2>
          {classSubjects.length === 0 ? (
            <p className="text-xs text-zinc-500">No classes assigned to you yet. Contact admin.</p>
          ) : (
            <form action={createAssignment} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input name="title" placeholder="Assignment title *" className={inputCls} required />
                <select name="classSubjectId" className={inputCls} required>
                  <option value="">Select Class / Subject *</option>
                  {classSubjects.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.class.name} - {cs.subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="description"
                placeholder="Assignment description / instructions *"
                rows={3}
                className={`${inputCls} resize-none`}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Deadline *</label>
                  <input name="deadline" type="datetime-local" className={inputCls} required />
                </div>
                <input name="fileUrl" placeholder="Resource link (optional, e.g. Google Drive)" className={inputCls} />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Publish Assignment
              </button>
            </form>
          )}
        </div>
      </AnimatedSection>

      {/* Assignments List */}
      <AnimatedSection delay={0.3}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">My Assignments ({assignments.length})</h2>
  
          {assignments.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
              No assignments published yet. Create your first one above.
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const isOverdue = new Date(assignment.deadline) < new Date();
                const gradedCount = assignment.submissions.filter((s) => s.grade !== null).length;
                return (
                  <div key={assignment.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
                    {/* Assignment Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-[#1e233d]">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white">{assignment.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${isOverdue ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'}`}>
                            {isOverdue ? 'Closed' : 'Active'}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">{assignment.classSubject.class.name} - {assignment.classSubject.subject.name}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Deadline: {new Date(assignment.deadline).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        {assignment.description && (
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{assignment.description}</p>
                        )}
                        {assignment.fileUrl && (
                          <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                            📎 View Resource
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-black text-cyan-400">{assignment.submissions.length}</div>
                          <div className="text-[10px] text-zinc-500">Submissions</div>
                          <div className="text-[10px] text-zinc-600">{gradedCount} graded</div>
                        </div>
                        <form action={deleteAssignment}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-red-400 text-xs font-medium hover:bg-red-950/20 transition-colors cursor-pointer"
                            onClick={(e) => { if (!confirm('Delete this assignment and all submissions?')) e.preventDefault(); }}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
  
                    {/* Submissions */}
                    {assignment.submissions.length > 0 && (
                      <div className="p-5">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Student Submissions</h4>
                        <div className="space-y-2">
                          {assignment.submissions.map((submission) => (
                            <div key={submission.id} className="bg-[#16192b]/50 border border-[#2b3052] rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">{submission.student.name}</div>
                                <div className="text-[11px] text-zinc-500">{submission.student.rollNumber} · Submitted {new Date(submission.submittedAt).toLocaleDateString()}</div>
                                {submission.fileUrl && (
                                  <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline">
                                    📎 View Submission
                                  </a>
                                )}
                                {submission.remarks && (
                                  <p className="text-[11px] text-zinc-400 mt-1">Remarks: {submission.remarks}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {submission.grade ? (
                                  <div className="text-right">
                                    <div className="text-lg font-black text-emerald-400">{submission.grade}</div>
                                    <div className="text-[10px] text-zinc-500">Grade</div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-amber-400 font-medium">Pending</span>
                                )}
                                {/* Grade Dropdown */}
                                <details className="relative">
                                  <summary className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-xs font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer list-none">
                                    {submission.grade ? 'Re-grade' : 'Grade'}
                                  </summary>
                                  <div className="absolute right-0 top-9 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 w-64 shadow-2xl">
                                    <form action={gradeSubmission} className="space-y-2">
                                      <input type="hidden" name="submissionId" value={submission.id} />
                                      <div>
                                        <label className="text-[10px] text-zinc-400 block mb-1">Grade (e.g. 85/100 or A+)</label>
                                        <input
                                          name="grade"
                                          placeholder="Enter grade *"
                                          defaultValue={submission.grade || ''}
                                          className="w-full bg-[#16192b] border border-[#2b3052] rounded px-2 py-1.5 text-xs text-white"
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] text-zinc-400 block mb-1">Remarks (optional)</label>
                                        <textarea
                                          name="remarks"
                                          rows={2}
                                          placeholder="Feedback for student..."
                                          defaultValue={submission.remarks || ''}
                                          className="w-full bg-[#16192b] border border-[#2b3052] rounded px-2 py-1.5 text-xs text-white resize-none"
                                        />
                                      </div>
                                      <button type="submit" className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
                                        Save Grade
                                      </button>
                                    </form>
                                  </div>
                                </details>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
