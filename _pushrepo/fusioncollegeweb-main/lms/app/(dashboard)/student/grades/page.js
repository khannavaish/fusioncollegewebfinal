import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function StudentGradesPage() {
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

  // Fetch student's exam results
  let student = null;
  let examResults = [];

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: true,
      },
    });
    student = dbUser?.student;

    if (student) {
      examResults = await prisma.examResult.findMany({
        where: { studentId: student.id },
        include: {
          exam: {
            include: {
              classSubject: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: { exam: { date: 'desc' } },
      });
    }
  } catch (err) {
    console.error('Error fetching student grades:', err);
  }

  // Calculate grade average
  let average = 0;
  if (examResults.length > 0) {
    const totalPercentage = examResults.reduce((sum, result) => {
      return sum + ((result.marksObt / result.exam.totalMarks) * 100);
    }, 0);
    average = (totalPercentage / examResults.length).toFixed(1);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Grades</h1>
          <p className="text-zinc-400 text-sm mt-1">View your exam results and performance</p>
        </div>
        <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Grade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Average Grade</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{average}%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Based on {examResults.length} exams</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total Exams</div>
          <div className="text-3xl font-black text-white mt-2">{examResults.length}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Completed</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Scholarship</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{parseFloat(average) >= 85 ? 'Active' : 'At Risk'}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Requires 85%+ average</p>
        </div>
      </div>

      {examResults.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No exam results yet.
        </div>
      ) : (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] text-xs font-bold uppercase tracking-wider text-zinc-400 bg-[#16192b]/50">
                  <th className="p-4">Exam</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Marks</th>
                  <th className="p-4">Percentage</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e233d] text-sm text-zinc-300">
                {examResults.map((result) => {
                  const percentage = ((result.marksObt / result.exam.totalMarks) * 100).toFixed(1);
                  return (
                    <tr key={result.id} className="hover:bg-[#16192b]/20 transition-colors">
                      <td className="p-4 font-semibold text-white">{result.exam.title}</td>
                      <td className="p-4">{result.exam.classSubject.subject.name}</td>
                      <td className="p-4">{new Date(result.exam.date).toLocaleDateString()}</td>
                      <td className="p-4">{result.marksObt}/{result.exam.totalMarks}</td>
                      <td className="p-4">
                        <span className={`font-bold ${parseFloat(percentage) >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {percentage}%
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${
                          result.status === 'PASS' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                          result.status === 'FAIL' ? 'bg-red-950/50 text-red-400 border border-red-500/20' :
                          'bg-amber-950/50 text-amber-400 border border-amber-500/20'
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
    </div>
  );
}
