import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft } from '@/app/components/icons';
import StudentCreateForm from './StudentCreateForm';
import { updateStudent, deleteStudent, transferStudent, updateUserPassword } from '@/app/actions/admin';
import PasswordShowHide from '@/app/components/PasswordShowHide';
import Pagination from '@/app/components/Pagination';

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  let students = [], classes = [], total = 0;
  try {
    [students, total, classes] = await Promise.all([
      prisma.student.findMany({
        include: { class: true, user: true },
        orderBy: { name: 'asc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.student.count(),
      prisma.class.findMany({ orderBy: { name: 'asc' } }),
    ]);
  } catch {}

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";
  const statusColors = {
    ACTIVE: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
    INACTIVE: 'bg-red-950/50 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manage Students</h1>
          <p className="text-zinc-400 text-sm mt-1">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
          <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      </div>

      {/* Client enrollment form (shows credential modal on success) */}
      <StudentCreateForm classes={classes} />

      {/* Students Table */}
      {students.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
          No students enrolled yet. Enroll your first student above.
        </div>
      ) : (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Roll No</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Class</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Father&apos;s Name</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Login Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Password</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className={`border-b border-[#1e233d] hover:bg-[#16192b]/30 transition-colors ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                    <td className="px-5 py-4 text-xs text-zinc-600">{i + 1}</td>
                    <td className="px-5 py-4 font-semibold text-sm text-white">{s.name}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/20">
                        {s.rollNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{s.class?.name || '—'}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{s.fatherName}</td>
                    <td className="px-5 py-4 text-xs text-zinc-500 font-mono">{s.user?.email}</td>
                    <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                      <div className="flex items-center gap-2">
                        <PasswordShowHide password={s.user?.plainPassword} />
                        <details className="relative">
                          <summary className="p-1 hover:bg-[#1e233d] rounded cursor-pointer list-none text-cyan-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </summary>
                          <div className="absolute left-0 top-6 z-30 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-3 w-56 shadow-2xl">
                            <form action={updateUserPassword} className="space-y-2">
                              <input type="hidden" name="userId" value={s.userId} />
                              <input name="newPassword" placeholder="New Password" minLength="6" className="w-full bg-[#16192b] border border-[#2b3052] rounded px-2 py-1.5 text-xs text-white" required />
                              <button type="submit" className="w-full py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Update</button>
                            </form>
                          </div>
                        </details>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${statusColors[s.user?.status] || statusColors.ACTIVE}`}>
                        {s.user?.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <details className="relative">
                          <summary className="px-2 py-1 bg-[#1e233d] rounded text-cyan-400 text-[10px] hover:bg-cyan-950/30 cursor-pointer list-none">Edit</summary>
                          <div className="absolute right-0 top-8 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 w-68 shadow-2xl">
                            <h3 className="text-xs font-bold text-white mb-3">Edit Student</h3>
                            <form action={updateStudent} className="space-y-2">
                              <input type="hidden" name="id" value={s.id} />
                              <input name="name" defaultValue={s.name} className={`${inputCls} text-xs`} required />
                              <input name="fatherName" defaultValue={s.fatherName} className={`${inputCls} text-xs`} required />
                              <select name="classId" defaultValue={s.classId} className={`${inputCls} text-xs`} required>
                                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <select name="status" defaultValue={s.user?.status || 'ACTIVE'} className={`${inputCls} text-xs`}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                              </select>
                              <button type="submit" className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                                Save Changes
                              </button>
                            </form>
                          </div>
                        </details>
                        <details className="relative">
                          <summary className="px-2 py-1 bg-[#1e233d] rounded text-indigo-400 text-[10px] hover:bg-indigo-950/30 cursor-pointer list-none">Transfer</summary>
                          <div className="absolute right-0 top-8 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 w-60 shadow-2xl">
                            <h3 className="text-xs font-bold text-white mb-3">Transfer Student</h3>
                            <form action={transferStudent} className="space-y-2">
                              <input type="hidden" name="studentId" value={s.id} />
                              <select name="classId" defaultValue={s.classId} className={`${inputCls} text-xs`} required>
                                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <button type="submit" className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                                Transfer Class
                              </button>
                            </form>
                          </div>
                        </details>
                        <form action={deleteStudent}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="px-2 py-1 bg-[#1e233d] rounded text-red-400 text-[10px] hover:bg-red-950/30 transition-colors cursor-pointer">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-5">
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/students" />
          </div>
        </div>
      )}
    </div>
  );
}
