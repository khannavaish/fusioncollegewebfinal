import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { deleteAnnouncement, editAnnouncement } from '@/app/actions/announcements';
import { IconChatBubble, IconChevronLeft } from '@/app/components/icons';

export const metadata = {
  title: 'Notifications — Fusion College LMS',
};

export const dynamic = 'force-dynamic';

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let announcements = [];
  try {
    announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('Error loading notifications:', err);
  }

  const audienceBadge = {
    ALL: 'bg-cyan-950/50 text-cyan-400 border-cyan-500/20',
    CLASSES: 'bg-blue-950/50 text-blue-400 border-blue-500/20',
    TEACHERS: 'bg-violet-950/50 text-violet-400 border-violet-500/20',
    STUDENTS: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20',
  };

  const inputCls = 'w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Notification History</h1>
          <p className="text-zinc-400 text-sm mt-1">{announcements.length} announcements published</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/announcements" className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors">
            + New Announcement
          </Link>
          <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
            <IconChevronLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-12 text-center text-zinc-500 text-sm">
          No announcements published yet.{' '}
          <Link href="/admin/announcements" className="text-cyan-400 hover:underline">Create one now</Link>.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div key={item.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-white">{item.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${audienceBadge[item.audience] || audienceBadge.ALL}`}>
                      {item.audience}
                    </span>
                    {item.shareOnWhatsapp && (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <IconChatBubble className="h-3 w-3" /> {item.whatsappSent} sent
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-zinc-400 whitespace-pre-line leading-5">{item.message}</p>
                  <div className="mt-3 text-[10px] text-zinc-600">
                    {new Date(item.createdAt).toLocaleString('en-PK', { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Edit */}
                  <details className="relative">
                    <summary className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-xs font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer list-none">
                      Edit
                    </summary>
                    <div className="absolute right-0 top-9 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 w-80 shadow-2xl">
                      <h3 className="text-xs font-bold text-white mb-3">Edit Announcement</h3>
                      <form action={editAnnouncement} className="space-y-2">
                        <input type="hidden" name="id" value={item.id} />
                        <input name="title" defaultValue={item.title} className={inputCls} required />
                        <textarea
                          name="message"
                          rows={4}
                          defaultValue={item.message}
                          className={`${inputCls} resize-none`}
                          required
                        />
                        <button type="submit" className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
                          Save Changes
                        </button>
                      </form>
                    </div>
                  </details>

                  {/* Delete */}
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-red-400 text-xs font-medium hover:bg-red-950/20 transition-colors cursor-pointer"
                    >
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
