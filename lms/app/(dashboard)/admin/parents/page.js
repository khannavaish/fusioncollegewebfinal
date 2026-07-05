import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft } from '@/app/components/icons';
import { createParent } from '@/app/actions/admin';
import ParentsClient from './ParentsClient';

export const dynamic = 'force-dynamic';

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
        user: { select: { email: true, status: true, plainPassword: true } },
        children: { include: { student: { include: { class: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    students = await prisma.student.findMany({
      include: { class: true },
      orderBy: { name: 'asc' },
    });
  } catch {}

  // Flatten to plain serialisable objects for the client component
  const serialisedParents = parents.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    phone: p.phone,
    email: p.user?.email || '',
    plainPassword: p.user?.plainPassword || null,
    status: p.user?.status || 'ACTIVE',
    children: p.children.map((ch) => ({
      studentId: ch.studentId,
      student: {
        name: ch.student.name,
        rollNumber: ch.student.rollNumber,
        class: ch.student.class ? { name: ch.student.class.name } : null,
      },
    })),
  }));

  const serialisedStudents = students.map((s) => ({
    id: s.id,
    name: s.name,
    rollNumber: s.rollNumber,
    class: s.class ? { name: s.class.name } : null,
  }));

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";
  const checkboxCls = "accent-cyan-500 w-3.5 h-3.5 rounded cursor-pointer";

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Manage Parents</h1>
          <p className="text-zinc-400 text-sm mt-1">{parents.length} parent{parents.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
          <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
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
          {serialisedStudents.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-zinc-400 mb-2">Link to Children (optional)</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {serialisedStudents.map((s) => (
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

      {/* Parents List */}
      {serialisedParents.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
          No parents registered yet. Add your first parent above.
        </div>
      ) : (
        <ParentsClient parents={serialisedParents} students={serialisedStudents} />
      )}
    </div>
  );
}
