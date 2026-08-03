import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconChevronLeft, IconChevronRight } from '@/app/components/icons';
import DeleteClassForm from './DeleteClassForm';
import EditClassDialog from './EditClassDialog';
import { createClass, updateClass, assignTeacherToSubject, removeClassSubject } from '@/app/actions/admin';
import Pagination from '@/app/components/Pagination';
import { PageShell } from '@/app/components/Brand';
import { Layers } from 'lucide-react';

const PAGE_SIZE = 12;

export default async function AdminClassesPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let dbUser = null;
  try { dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } }); } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  let classes = [], subjects = [], teachers = [], total = 0;
  try {
    [classes, total, subjects, teachers] = await Promise.all([
      prisma.class.findMany({
        include: {
          _count: { select: { students: true } },
          subjects: { include: { subject: true, teacher: true } },
        },
        orderBy: { academicYr: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.class.count(),
      prisma.subject.findMany({ orderBy: { name: 'asc' } }),
      prisma.teacher.findMany({ orderBy: { name: 'asc' } }),
    ]);
  } catch {}

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";

  const btnPrimary = "px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer";

  return (
    <PageShell
      title="Manage Classes"
      icon={<Layers />}
      description={`${classes.length} class${classes.length !== 1 ? 'es' : ''} total`}
      rightContent={
        <Link href="/admin" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 uppercase tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 transition-all hover:bg-cyan-500/20">
          <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      }
    >
      <div className="space-y-8 font-sans mt-4">

      {/* Create Class Form */}
      <AnimatedSection delay={0.2}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-4">Add New Class</h2>
          <form action={createClass} className="flex flex-col md:flex-row gap-3">
            <input name="name" placeholder="Class name (e.g. F.Sc Pre-Medical Part I)" className={`${inputCls} flex-1`} required />
            <input name="academicYr" placeholder="Academic Year (e.g. 2026-2027)" className={`${inputCls} md:w-48`} required />
            <button type="submit" className={btnPrimary}>Add Class</button>
          </form>
        </div>
      </AnimatedSection>

      {/* Classes Table */}
      <AnimatedSection delay={0.3}>
        {classes.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
            No classes yet. Add your first class above.
          </div>
        ) : (
          <div className="space-y-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl">
                {/* Class Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 border-b border-[#1e233d] bg-[#16192b]/30 rounded-t-xl">
                  <div>
                    <div className="font-bold text-white">{cls.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{cls.academicYr} · {cls._count.students} students</div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {/* Edit form (inline, using details/summary trick) */}
                    <EditClassDialog cls={cls} />
                    <DeleteClassForm id={cls.id} />
                  </div>
                </div>

                {/* Class Subjects */}
                <div className="p-5">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Subject Assignments</div>
                  {cls.subjects.length === 0 ? (
                    <p className="text-xs text-zinc-600 mb-3">No subjects assigned yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {cls.subjects.map((cs) => (
                        <div key={cs.id} className="flex items-center justify-between bg-[#16192b]/50 border border-[#1e233d] rounded-lg px-3 py-2">
                          <div>
                            <span className="text-xs font-semibold text-white">{cs.subject.name}</span>
                            <span className="text-[10px] text-zinc-500 ml-2 inline-flex items-center gap-0.5">
                              <IconChevronRight className="w-2.5 h-2.5" /> {cs.teacher?.name || 'No teacher'}
                            </span>
                          </div>
                          <form action={removeClassSubject}>
                            <input type="hidden" name="id" value={cs.id} />
                            <button type="submit" className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer">Remove</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assign Subject */}
                  {subjects.length > 0 && teachers.length > 0 && (
                    <form action={assignTeacherToSubject} className="flex flex-col md:flex-row gap-2">
                      <input type="hidden" name="classId" value={cls.id} />
                      <select name="subjectId" className={`${inputCls} flex-1`} required>
                        <option value="">Select Subject</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select name="teacherId" className={`${inputCls} flex-1`} required>
                        <option value="">Select Teacher</option>
                        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap">
                        Assign
                      </button>
                    </form>
                  )}
                  {subjects.length === 0 && <p className="text-xs text-amber-400">Add subjects first from <Link href="/admin/subjects" className="underline">Manage Subjects</Link>.</p>}
                  {teachers.length === 0 && <p className="text-xs text-amber-400">Add teachers first from <Link href="/admin/teachers" className="underline">Manage Teachers</Link>.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/classes" />
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
