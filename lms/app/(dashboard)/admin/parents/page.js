import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { createParent, updateParent, deleteParent } from '@/app/actions/admin';

export default async function AdminParentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let parents = [], students = [];
  try {
    parents = await prisma.parent.findMany({
      include: {
        user: true,
        children: { include: { student: { include: { class: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    students = await prisma.student.findMany({
      include: { class: true },
      orderBy: { name: 'asc' },
    });
  } catch {}

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";
  const checkboxCls = "accent-cyan-500 w-3.5 h-3.5 rounded cursor-pointer";
  const statusColors = { ACTIVE: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30', INACTIVE: 'bg-red-950/50 text-red-400 border-red-500/30' };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manage Parents</h1>
          <p className="text-zinc-400 text-sm mt-1">{parents.length} parent{parents.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300">← Back to Dashboard</Link>
      </div>

      {/* Add Parent Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">Register New Parent</h2>
        <form action={createParent}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input name="name" placeholder="Full Name *" className={inputCls} required />
            <input name="phone" placeholder="Phone Number *" className={inputCls} required />
            <input name="email" type="email" placeholder="Email Address *" className={inputCls} required />
            <input name="password" type="password" placeholder="Password (min 6 chars) *" className={inputCls} required />
          </div>
          {students.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-zinc-400 mb-2">Link to Children (optional)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 bg-[#16192b]/50 border border-[#1e233d] rounded-lg px-3 py-2 cursor-pointer hover:border-[#2b3052] transition-colors">
                    <input type="checkbox" name="studentIds" value={s.id} className={checkboxCls} />
                    <div>
                      <div className="text-xs font-medium text-white">{s.name}</div>
                      <div className="text-[10px] text-zinc-500">{s.rollNumber} · {s.class?.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
            Register Parent
          </button>
        </form>
      </div>

      {/* Parents Table */}
      {parents.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
          No parents registered yet. Add your first parent above.
        </div>
      ) : (
        <div className="space-y-4">
          {parents.map((p) => (
            <div key={p.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-violet-900/50 border border-violet-500/30 rounded-full flex items-center justify-center text-base flex-shrink-0">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{p.name}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{p.user?.email} · {p.phone}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.children.length === 0 ? (
                        <span className="text-[10px] text-zinc-600">No children linked</span>
                      ) : p.children.map((ch) => (
                        <span key={ch.studentId} className="text-[10px] px-2 py-0.5 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 rounded-full">
                          {ch.student.name} ({ch.student.class?.name})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${statusColors[p.user?.status] || statusColors.ACTIVE}`}>
                    {p.user?.status || 'ACTIVE'}
                  </span>
                  <details className="relative">
                    <summary className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-xs font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer list-none">
                      Edit
                    </summary>
                    <div className="absolute right-0 top-9 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 w-80 shadow-2xl">
                      <h3 className="text-xs font-bold text-white mb-3">Edit Parent</h3>
                      <form action={updateParent} className="space-y-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="name" defaultValue={p.name} className={`${inputCls} text-xs`} required />
                        <input name="phone" defaultValue={p.phone} className={`${inputCls} text-xs`} required />
                        <select name="status" defaultValue={p.user?.status || 'ACTIVE'} className={`${inputCls} text-xs`}>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                        {students.length > 0 && (
                          <div>
                            <div className="text-[10px] text-zinc-400 mb-1">Children</div>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                              {students.map((s) => (
                                <label key={s.id} className="flex items-center gap-2 text-[10px] text-zinc-300 cursor-pointer">
                                  <input type="checkbox" name="studentIds" value={s.id} className={checkboxCls}
                                    defaultChecked={p.children.some((ch) => ch.studentId === s.id)} />
                                  {s.name} ({s.rollNumber})
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <button type="submit" className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                          Save Changes
                        </button>
                      </form>
                    </div>
                  </details>
                  <form action={deleteParent}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-red-400 text-xs font-medium hover:bg-red-950/20 transition-colors cursor-pointer">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
