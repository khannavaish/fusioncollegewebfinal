import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { updateEnquiryStatus, resetSchoolData } from '@/app/actions/admin';
import { IconGraduationCap, IconUserTie, IconBuilding, IconBookOpen, IconUsers, IconChevronRight, IconChatBubble, IconTrash } from '@/app/components/icons';
import AnimatedSection from '@/app/components/AnimatedSection';
import WebsiteSettingsCard from '@/app/components/WebsiteSettingsCard';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  let admin = null, studentCount = 0, teacherCount = 0, classCount = 0, subjectCount = 0, userCount = 0;
  let recentStudents = [], recentTeachers = [], enquiries = [];

  try {
    const full = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { admin: true },
    });
    admin = full?.admin;
    studentCount = await prisma.student.count();
    teacherCount = await prisma.teacher.count();
    classCount = await prisma.class.count();
    subjectCount = await prisma.subject.count();
    userCount = await prisma.user.count();
    recentStudents = await prisma.student.findMany({ include: { class: true, user: true }, orderBy: { name: 'asc' }, take: 5 });
    recentTeachers = await prisma.teacher.findMany({ include: { user: true }, orderBy: { name: 'asc' }, take: 5 });
    enquiries = await prisma.contactEnquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  } catch {}

  const adminName = admin?.name || user.email;
  const statusColors = {
    UNREAD: 'bg-amber-950/50 text-amber-400 border-amber-500/30',
    REVIEWED: 'bg-blue-950/50 text-blue-400 border-blue-500/30',
    ARCHIVED: 'bg-zinc-800/50 text-zinc-500 border-zinc-600/30',
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <AnimatedSection delay={0.05}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {adminName}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin/teachers" className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors">+ Add Teacher</Link>
          <Link href="/admin/students" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">+ Add Student</Link>
          <Link href="/admin/classes" className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors">+ Add Class</Link>
        </div>
      </div>
    </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-400">Danger Zone</div>
            <h2 className="mt-1 text-base font-bold text-white">Reset Teachers and Students</h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Removes all teacher, student, and parent accounts linked to them, plus class assignments, lectures, attendance, submissions, exams, and related logs. Admin data, classes, subjects, timetable, and enquiries stay in place.
            </p>
          </div>
          <details className="relative">
            <summary className="list-none rounded-lg border border-red-500/30 bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-500 cursor-pointer">
              Reset Data
            </summary>
            <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-red-500/20 bg-[#0d0f1a] p-4 shadow-2xl shadow-black/40">
              <form action={resetSchoolData} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Type RESET to confirm</label>
                  <input
                    name="confirmText"
                    placeholder="RESET"
                    className="w-full rounded-lg border border-[#1e233d] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[10px] leading-4 text-zinc-500">
                  This clears the academic roster and its linked records. It does not remove the admin account or timetable setup.
                </p>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-500">
                  <IconTrash className="h-4 w-4" /> Permanently Reset
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </AnimatedSection>

      {/* Stats */}
      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Students', value: studentCount, color: 'text-cyan-400', href: '/admin/students' },
          { label: 'Teachers', value: teacherCount, color: 'text-violet-400', href: '/admin/teachers' },
          { label: 'Classes', value: classCount, color: 'text-blue-400', href: '/admin/classes' },
          { label: 'Subjects', value: subjectCount, color: 'text-emerald-400', href: '/admin/subjects' },
          { label: 'Total Users', value: userCount, color: 'text-amber-400', href: '/admin/parents' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-5 hover:border-[#2b3052] transition-colors group">
            <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{stat.label}</div>
            <div className={`text-3xl font-black mt-2 ${stat.color}`}>{stat.value}</div>
          </Link>
        ))}
        </div>
      </AnimatedSection>

      {/* Quick Nav */}
      <AnimatedSection delay={0.2}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'Students', href: '/admin/students', Icon: IconGraduationCap, color: 'text-indigo-400', bg: 'bg-indigo-950/30 border-indigo-500/20' },
            { label: 'Teachers', href: '/admin/teachers', Icon: IconUserTie, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-500/20' },
            { label: 'Classes', href: '/admin/classes', Icon: IconBuilding, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-500/20' },
            { label: 'Subjects', href: '/admin/subjects', Icon: IconBookOpen, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-500/20' },
            { label: 'Announcements', href: '/admin/announcements', Icon: IconChatBubble, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-500/20' },
            { label: 'Parents', href: '/admin/parents', Icon: IconUsers, color: 'text-violet-400', bg: 'bg-violet-950/30 border-violet-500/20' },
          ].map(({ label, href, Icon, color, bg }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-[#13162b] hover:border-[#2b3052] transition-all group">
              <span className={`w-7 h-7 rounded-lg ${bg} border flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </span>
              <span>Manage {label}</span>
            </Link>
          ))}
        </div>
      </AnimatedSection>

      {/* Website Settings Integration */}
      <AnimatedSection delay={0.25}>
        <WebsiteSettingsCard />
      </AnimatedSection>

      {/* Recent Data */}
      <AnimatedSection delay={0.3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Students */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white">Recent Students</h2>
            <Link href="/admin/students" className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
              View All <IconChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentStudents.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-sm">No students yet</div>
            ) : recentStudents.map((s) => (
              <div key={s.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-white">{s.name}</div>
                  <div className="text-[10px] text-zinc-500">{s.rollNumber} · {s.class?.name || 'No class'}</div>
                </div>
                <div className="text-[10px] text-zinc-500">{s.user?.createdAt ? new Date(s.user.createdAt).toLocaleDateString() : '-'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Teachers */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-white">Recent Teachers</h2>
            <Link href="/admin/teachers" className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
              View All <IconChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTeachers.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-sm">No teachers yet</div>
            ) : recentTeachers.map((t) => (
              <div key={t.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm text-white">{t.name}</div>
                  <div className="text-[10px] text-zinc-500">{t.qualification || 'No qualification'} · {t.user?.email}</div>
                </div>
                <div className="text-[10px] text-zinc-500">{t.user?.createdAt ? new Date(t.user.createdAt).toLocaleDateString() : '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>

      {/* Enquiries */}
      <AnimatedSection delay={0.3}>
        <div>
        <h2 className="text-base font-bold text-white mb-4">Contact Enquiries</h2>
        <div className="space-y-3">
          {enquiries.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">No enquiries yet.</div>
          ) : enquiries.map((enq) => (
            <div key={enq.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-sm text-white">{enq.name}</div>
                  <div className="text-[10px] text-zinc-400">{enq.email} · {enq.phone}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${statusColors[enq.status] || statusColors.UNREAD}`}>
                    {enq.status}
                  </span>
                  {/* Status actions */}
                  {enq.status !== 'REVIEWED' && (
                    <form action={updateEnquiryStatus}>
                      <input type="hidden" name="id" value={enq.id} />
                      <input type="hidden" name="status" value="REVIEWED" />
                      <button type="submit" className="text-[10px] px-2 py-0.5 rounded bg-blue-950/50 border border-blue-500/30 text-blue-400 hover:bg-blue-900/40 transition-colors cursor-pointer">
                        Mark Reviewed
                      </button>
                    </form>
                  )}
                  {enq.status !== 'ARCHIVED' && (
                    <form action={updateEnquiryStatus}>
                      <input type="hidden" name="id" value={enq.id} />
                      <input type="hidden" name="status" value="ARCHIVED" />
                      <button type="submit" className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/50 border border-zinc-600/30 text-zinc-400 hover:bg-zinc-700/40 transition-colors cursor-pointer">
                        Archive
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div className="text-xs text-zinc-400 border-t border-[#1e233d] pt-2 mt-3">{enq.message}</div>
              <div className="text-[10px] text-zinc-600 mt-1">{new Date(enq.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
        </div>
      </AnimatedSection>
    </div>
  );
}



