import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { createTeacher, updateTeacher, deleteTeacher } from '@/app/actions/admin';

export default async function AdminTeachersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let teachers = [];
  try {
    teachers = await prisma.teacher.findMany({
      include: {
        user: true,
        _count: { select: { subjects: true } },
      },
      orderBy: { name: 'asc' },
    });
  } catch {}

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";
  const statusColors = { ACTIVE: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30', INACTIVE: 'bg-red-950/50 text-red-400 border-red-500/30' };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manage Teachers</h1>
          <p className="text-zinc-400 text-sm mt-1">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300">← Back to Dashboard</Link>
      </div>

      {/* Add Teacher Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">Register New Teacher</h2>
        <form action={createTeacher}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <input name="name" placeholder="Full Name *" className={inputCls} required />
            <input name="email" type="email" placeholder="Email Address *" className={inputCls} required />
            <input name="password" type="password" placeholder="Password (min 6 chars) *" className={inputCls} required />
            <input name="phone" placeholder="Phone Number" className={inputCls} />
            <input name="qualification" placeholder="Qualification (e.g. M.Sc Physics)" className={inputCls} />
          </div>
          <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
            Register Teacher
          </button>
        </form>
      </div>

      {/* Teachers Table */}
      {teachers.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
          No teachers yet. Add your first teacher above.
        </div>
      ) : (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Qualification</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subjects</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, i) => (
                  <tr key={t.id} className={`border-b border-[#1e233d] hover:bg-[#16192b]/30 transition-colors ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-white">{t.name}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{t.user?.email}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{t.qualification || '—'}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{t.phone || '—'}</td>
                    <td className="px-5 py-4 text-xs text-zinc-400">{t._count.subjects} assigned</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${statusColors[t.user?.status] || statusColors.ACTIVE}`}>
                        {t.user?.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <details className="relative">
                          <summary className="px-2 py-1 bg-[#1e233d] rounded text-cyan-400 text-[10px] hover:bg-cyan-950/30 cursor-pointer list-none">Edit</summary>
                          <div className="absolute right-0 top-8 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 w-72 shadow-2xl">
                            <h3 className="text-xs font-bold text-white mb-3">Edit Teacher</h3>
                            <form action={updateTeacher} className="space-y-2">
                              <input type="hidden" name="id" value={t.id} />
                              <input name="name" defaultValue={t.name} className={`${inputCls} text-xs`} required />
                              <input name="phone" defaultValue={t.phone || ''} placeholder="Phone" className={`${inputCls} text-xs`} />
                              <input name="qualification" defaultValue={t.qualification || ''} placeholder="Qualification" className={`${inputCls} text-xs`} />
                              <select name="status" defaultValue={t.user?.status || 'ACTIVE'} className={`${inputCls} text-xs`}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                              </select>
                              <button type="submit" className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                                Save Changes
                              </button>
                            </form>
                          </div>
                        </details>
                        <form action={deleteTeacher}>
                          <input type="hidden" name="id" value={t.id} />
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
        </div>
      )}
    </div>
  );
}
