import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

export const dynamic = 'force-dynamic';

export default async function ParentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true },
    });
  } catch (err) {
    console.error('Error fetching user role:', err);
  }

  if (!dbUser || dbUser.role !== 'PARENT') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  // Fetch full parent profile with children
  let parent = null;
  try {
    const fullUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        parent: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    class: true,
                    attendance: {
                      include: { lecture: true },
                    },
                    examResults: {
                      include: {
                        exam: {
                          include: { classSubject: { include: { subject: true } } },
                        },
                      },
                      orderBy: { exam: { date: 'desc' } },
                      take: 10,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    parent = fullUser?.parent;
  } catch (err) {
    console.error('Error fetching parent details:', err);
  }

  const parentName = parent?.name || user.email;
  const children = parent?.children || [];

  // Compute stats for each child
  const childStats = children.map(({ student }) => {
    if (!student) return null;

    const totalLectures = student.attendance.length;
    const presentCount = student.attendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const attendanceRate = totalLectures > 0 ? ((presentCount / totalLectures) * 100).toFixed(1) : null;

    const totalMarks = student.examResults.reduce(
      (sum, r) => sum + (r.marksObt / r.exam.totalMarks) * 100,
      0
    );
    const gradeAvg = student.examResults.length > 0
      ? (totalMarks / student.examResults.length).toFixed(1)
      : null;

    const scholarshipActive = gradeAvg !== null ? parseFloat(gradeAvg) >= 85 : null;

    return { student, attendanceRate, gradeAvg, scholarshipActive };
  }).filter(Boolean);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Parent Portal</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {parentName}</p>
        </div>
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">{children.length} Linked Child{children.length !== 1 ? 'ren' : ''}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Fusion College Narowal</div>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
          No children linked to your account yet. Please contact the admin to link your child.
        </div>
      ) : (
        childStats.map(({ student, attendanceRate, gradeAvg, scholarshipActive }) => (
          <div key={student.id} className="space-y-6">
            {/* Child Info Bar */}
            <div className="flex items-center gap-4 bg-[#16192b]/40 border border-[#1e233d] rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-lg flex-shrink-0">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="text-base font-bold text-white">{student.name}</div>
                <div className="text-xs text-zinc-400">{student.rollNumber} · {student.class?.name}</div>
                <div className="text-[11px] text-zinc-500">Father: {student.fatherName}</div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-5">
                <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance</div>
                {attendanceRate !== null ? (
                  <>
                    <div className={`text-3xl font-black mt-2 ${parseFloat(attendanceRate) >= 85 ? 'text-emerald-400' : parseFloat(attendanceRate) >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                      {attendanceRate}%
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {student.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length} / {student.attendance.length} lectures · Required: 85%+
                    </p>
                  </>
                ) : (
                  <div className="text-3xl font-black text-zinc-600 mt-2">N/A</div>
                )}
              </div>

              <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-5">
                <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Exam Average</div>
                {gradeAvg !== null ? (
                  <>
                    <div className={`text-3xl font-black mt-2 ${parseFloat(gradeAvg) >= 85 ? 'text-emerald-400' : parseFloat(gradeAvg) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {gradeAvg}%
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Based on {student.examResults.length} exams</p>
                  </>
                ) : (
                  <div className="text-3xl font-black text-zinc-600 mt-2">No exams yet</div>
                )}
              </div>

              <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-5">
                <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Scholarship</div>
                {scholarshipActive !== null ? (
                  <>
                    <div className={`text-3xl font-black mt-2 ${scholarshipActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {scholarshipActive ? 'Active' : 'At Risk'}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Requires maintaining 85%+ average</p>
                  </>
                ) : (
                  <div className="text-3xl font-black text-zinc-600 mt-2">N/A</div>
                )}
              </div>
            </div>

            {/* Recent Exam Results */}
            {student.examResults.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-white mb-3">Recent Exam Results</h2>
                <div className="overflow-x-auto bg-[#0d0f1a] border border-[#1e233d] rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1e233d] text-xs font-bold uppercase tracking-wider text-zinc-400 bg-[#16192b]/50">
                        <th className="p-4">Exam</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Marks</th>
                        <th className="p-4">%</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d] text-sm text-zinc-300">
                      {student.examResults.map((result) => {
                        const pct = ((result.marksObt / result.exam.totalMarks) * 100).toFixed(1);
                        return (
                          <tr key={result.id} className="hover:bg-[#16192b]/20 transition-colors">
                            <td className="p-4 font-semibold text-white">{result.exam.title}</td>
                            <td className="p-4">{result.exam.classSubject.subject.name}</td>
                            <td className="p-4">{new Date(result.exam.date).toLocaleDateString()}</td>
                            <td className="p-4">{result.marksObt}/{result.exam.totalMarks}</td>
                            <td className="p-4">
                              <span className={`font-bold ${parseFloat(pct) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</span>
                            </td>
                            <td className="p-4">
                              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${
                                result.status === 'PASS' || result.status === 'PASSED'
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-950/50 text-red-400 border-red-500/20'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {children.length > 1 && <hr className="border-[#1e233d]" />}
          </div>
        ))
      )}
    </div>
  );
}
