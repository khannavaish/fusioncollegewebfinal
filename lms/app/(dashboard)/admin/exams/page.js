import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft } from '@/app/components/icons';
import { adminCreateExam, adminDeleteExam } from '@/app/actions/adminReports';

export const metadata = {
  title: 'Manage Exams — Fusion College LMS',
};

export const dynamic = 'force-dynamic';

export default async function AdminExamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let exams = [];
  let classSubjects = [];
  try {
    exams = await prisma.exam.findMany({
      include: {
        classSubject: {
          include: {
            class: true,
            subject: true,
            teacher: true,
          },
        },
        _count: { select: { results: true } },
      },
      orderBy: { date: 'desc' },
    });

    classSubjects = await prisma.classSubject.findMany({
      include: {
        class: true,
        subject: true,
      },
      orderBy: [
        { class: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });
  } catch (err) {
    console.error('Error fetching exams data:', err);
  }

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Academic Exams</h1>
          <p className="text-zinc-400 text-sm mt-1">{exams.length} exam{exams.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
          <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      </div>

      {/* Schedule Exam Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">Schedule New Exam</h2>
        {classSubjects.length === 0 ? (
          <p className="text-xs text-zinc-500">Please assign subjects to classes before scheduling exams.</p>
        ) : (
          <form action={adminCreateExam} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input name="title" placeholder="Exam Title (e.g. Diagnostic Test, Mid-Term) *" className={inputCls} required />
              <select name="classSubjectId" className={inputCls} required>
                <option value="">Select Class / Subject *</option>
                {classSubjects.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.class.name} — {cs.subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Date *</label>
                <input name="date" type="date" className={inputCls} required />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Total Marks *</label>
                <input name="totalMarks" type="number" placeholder="Total Marks (e.g. 100) *" className={inputCls} required />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
              Schedule Exam
            </button>
          </form>
        )}
      </div>

      {/* Scheduled Exams Table */}
      {exams.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
          No exams scheduled yet. Use the form above to schedule the first exam.
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white">Scheduled Exams History</h2>
          <div className="overflow-x-auto bg-[#0d0f1a] border border-[#1e233d] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] text-xs font-bold uppercase tracking-wider text-zinc-400 bg-[#16192b]/50">
                  <th className="p-4">Exam Title</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Teacher</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Total Marks</th>
                  <th className="p-4">Graded Students</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e233d] text-sm text-zinc-300">
                {exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-[#16192b]/20 transition-colors">
                    <td className="p-4 font-semibold text-white">{ex.title}</td>
                    <td className="p-4">{ex.classSubject.class.name}</td>
                    <td className="p-4">{ex.classSubject.subject.name}</td>
                    <td className="p-4">{ex.classSubject.teacher.name}</td>
                    <td className="p-4">{new Date(ex.date).toLocaleDateString()}</td>
                    <td className="p-4 font-mono font-bold text-cyan-400">{ex.totalMarks}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">
                        {ex._count.results} entries
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <form action={adminDeleteExam} className="inline-block">
                        <input type="hidden" name="examId" value={ex.id} />
                        <button type="submit" className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer">
                          Cancel Exam
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
