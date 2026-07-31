import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft, IconChevronRight, IconEdit } from '@/app/components/icons';
import { createSubject, updateSubject, deleteSubject } from '@/app/actions/admin';

export default async function AdminSubjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let subjects = [];
  try {
    subjects = await prisma.subject.findMany({
      include: { _count: { select: { classSubjects: true } } },
      orderBy: { name: 'asc' },
    });
  } catch {}

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";

  return (
    <div className="space-y-8 font-sans">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Manage Subjects</h1>
            <p className="text-zinc-400 text-sm mt-1">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
            <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      {/* Add Subject */}
      <AnimatedSection delay={0.2}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Add New Subject</h2>
          <form action={createSubject} className="flex gap-3">
            <input name="name" placeholder="Subject name (e.g. Physics, Mathematics, Urdu)" className={`${inputCls} flex-1`} required />
            <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap">
              Add Subject
            </button>
          </form>
        </div>
      </AnimatedSection>

      {/* Subjects Grid */}
      <AnimatedSection delay={0.3}>
        {subjects.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
            No subjects yet. Add your first subject above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <div key={sub.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
                <div className="p-5">
                  <div className="font-bold text-white text-base">{sub.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">{sub._count.classSubjects} class assignment{sub._count.classSubjects !== 1 ? 's' : ''}</div>
                </div>
  
                <div className="border-t border-[#1e233d] bg-[#16192b]/30 p-3">
                  <details className="relative group">
                    <summary className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer list-none font-medium inline-flex items-center gap-1">
                      <IconEdit className="w-3 h-3" /> Edit Name
                    </summary>
                    <form action={updateSubject} className="flex gap-2 mt-2">
                      <input type="hidden" name="id" value={sub.id} />
                      <input name="name" defaultValue={sub.name} className={`${inputCls} flex-1 text-xs py-1`} required />
                      <button type="submit" className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg transition-colors cursor-pointer">Save</button>
                    </form>
                  </details>
                </div>
  
                <div className="border-t border-[#1e233d] p-3">
                  <form action={deleteSubject}>
                    <input type="hidden" name="id" value={sub.id} />
                    <button type="submit" className="w-full text-xs text-red-400 hover:text-red-300 transition-colors py-1 cursor-pointer">
                      Delete Subject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
