import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

export default async function ParentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has PARENT role
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
    // If user doesn't have PARENT role, redirect to their actual dashboard
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  // Fetch parent details
  let parent = null;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        parent: {
          include: {
            children: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    parent = dbUser?.parent;
  } catch (err) {
    console.error('Error fetching parent details:', err);
  }

  const parentName = parent?.name || user.email;

  // Seed fallback child info if empty
  const children = parent?.children || [];
  const primaryChild = children[0]?.student || { name: 'Ahmad Ali', rollNumber: 'FC-2026-004', class: { name: 'F.Sc Pre-Medical Part I' } };

  const grades = [
    { exam: 'Diagnostic Test Oct', subject: 'Biology', marks: '88/100', percentage: '88%', status: 'Passed' },
    { exam: 'Diagnostic Test Oct', subject: 'Chemistry', marks: '92/100', percentage: '92%', status: 'Passed' },
    { exam: 'Diagnostic Test Oct', subject: 'Physics', marks: '75/100', percentage: '75%', status: 'Passed' },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Parent Portal</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {parentName}</p>
        </div>
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">Linked Child: {primaryChild.name}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Roll No: {primaryChild.rollNumber}</div>
        </div>
      </div>

      {/* Child Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Child Attendance</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">95.4%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Perfect standing. Required: 85%+</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Diagnostic Grade Average</div>
          <div className="text-3xl font-black text-white mt-2">85.0%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Class Rank: Top 10%</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Scholarship Maintenance</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">Active</div>
          <p className="text-[10px] text-zinc-500 mt-1">Requires maintaining 85%+ average</p>
        </div>
      </div>

      {/* Child Grades Table */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-tight">Recent Exam Results ({primaryChild.name})</h2>
        <div className="overflow-x-auto bg-[#0d0f1a] border border-[#1e233d] rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e233d] text-xs font-bold uppercase tracking-wider text-zinc-400 bg-[#16192b]/50">
                <th className="p-4">Exam Title</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Marks Obtained</th>
                <th className="p-4">Percentage</th>
                <th className="p-4">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e233d] text-sm text-zinc-300">
              {grades.map((grade, idx) => (
                <tr key={idx} className="hover:bg-[#16192b]/20 transition-colors">
                  <td className="p-4 font-semibold text-white">{grade.exam}</td>
                  <td className="p-4">{grade.subject}</td>
                  <td className="p-4">{grade.marks}</td>
                  <td className="p-4">{grade.percentage}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-500/20">
                      {grade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
