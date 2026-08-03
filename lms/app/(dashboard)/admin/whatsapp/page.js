import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import WhatsAppSettingsClient from './WhatsAppSettingsClient';
import { PageShell } from '@/app/components/Brand';
import { Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'WhatsApp Settings | Fusion College LMS',
  description: 'Configure WhatsApp parent notification system',
};

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let config = null;
  let classes = [];
  let loggingStatus = [];
  try {
    config = await prisma.whatsAppConfig.findUnique({ where: { id: 'default' } });
    classes = await prisma.class.findMany({ orderBy: { name: 'asc' } });

    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);

    const allClassSubjects = await prisma.classSubject.findMany({
      include: {
        class: true,
        subject: true,
        teacher: true,
        lectures: {
          where: { date: { gte: startOfDay, lte: endOfDay } },
          take: 1,
        },
      },
      orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
    });

    const classMap = {};
    for (const cs of allClassSubjects) {
      if (!classMap[cs.class.id]) {
        classMap[cs.class.id] = { className: cs.class.name, subjects: [] };
      }
      const lecture = cs.lectures[0];
      const topicLogged = lecture && lecture.topic && !lecture.topic.startsWith('Pending');
      classMap[cs.class.id].subjects.push({
        subjectName: cs.subject.name,
        teacherName: cs.teacher?.name || 'Unassigned',
        logged: topicLogged,
        topic: topicLogged ? lecture.topic : null,
      });
    }
    loggingStatus = Object.values(classMap);
  } catch {}
 
  return (
    <PageShell
      title="WhatsApp Notifications"
      icon={<Phone />}
      description="Configure parent notification settings and send reports"
      rightContent={
        <div className="flex items-center gap-2">
          {config?.isEnabled ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-700/30 text-gray-600 dark:text-zinc-500 text-xs font-bold rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-600" />
              Inactive
            </span>
          )}
          <Link href="/admin" className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 uppercase tracking-widest bg-cyan-50 dark:bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-200 dark:border-cyan-500/20 transition-all">
            Back to Admin
          </Link>
        </div>
      }
    >
      <div className="space-y-8 font-sans mt-4">

      {/* Today's Logging Status Panel */}
      <AnimatedSection delay={0.15}>
        <div className="bg-white dark:bg-[#0d0f1a] border border-gray-200 dark:border-[#1e233d] rounded-xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="px-6 py-4 bg-gray-50 dark:bg-[#16192b]/40 border-b border-gray-200 dark:border-[#1e233d] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Today&apos;s Topic Logging Status</h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Logged</span>
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
            </div>
          </div>
          <div className="p-4">
            {loggingStatus.length === 0 ? (
              <p className="text-gray-500 dark:text-zinc-500 text-sm text-center py-4">No classes with assigned subjects found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loggingStatus.map((cls) => {
                  const loggedCount = cls.subjects.filter(s => s.logged).length;
                  const total = cls.subjects.length;
                  const allDone = loggedCount === total;
                  return (
                    <div key={cls.className} className={`rounded-xl border p-4 ${allDone ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/10' : 'border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/10'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{cls.className}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${allDone ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'}`}>
                          {loggedCount}/{total} Logged
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {cls.subjects.map((s) => (
                          <div key={s.subjectName} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${s.logged ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <div className="min-w-0 flex items-baseline gap-1">
                                <span className="text-xs text-gray-700 dark:text-zinc-300 font-semibold truncate">{s.subjectName}</span>
                                <span className="text-[10px] text-gray-500 dark:text-zinc-500 truncate">({s.teacherName})</span>
                              </div>
                            </div>
                            {s.topic && <p className="text-[10px] text-gray-500 dark:text-zinc-500 truncate ml-4">{s.topic}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <WhatsAppSettingsClient config={config} classes={classes} />
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
