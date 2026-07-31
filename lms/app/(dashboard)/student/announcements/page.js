import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';

export const metadata = {
  title: 'Announcements — Fusion College LMS',
};

export const dynamic = 'force-dynamic';

export default async function StudentAnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { student: { include: { class: true } } },
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'STUDENT') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const classId = dbUser.student?.classId;
  let announcements = [];

  try {
    // Fetch announcements for ALL audience or for this student's class
    const all = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });

    announcements = all.filter((a) => {
      if (a.audience === 'ALL' || a.audience === 'STUDENTS') return true;
      if (a.audience === 'CLASSES') {
        const classIds = Array.isArray(a.classIds) ? a.classIds : [];
        return classId && (classIds.length === 0 || classIds.includes(classId));
      }
      return false;
    });
  } catch (err) {
    console.error('Error fetching announcements:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Announcements</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} for you
            </p>
          </div>
          <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        {announcements.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-12 text-center text-zinc-500 text-sm">
            No announcements for your class yet.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <div key={item.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 hover:border-[#2b3052] transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-base font-bold text-white">{item.title}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mt-0.5">{item.audience}</div>
                  </div>
                  <div className="text-[10px] text-zinc-600 flex-shrink-0">
                    {new Date(item.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-300 whitespace-pre-line leading-6">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
