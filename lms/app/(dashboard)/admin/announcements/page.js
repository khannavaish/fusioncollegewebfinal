import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import AnnouncementForm from './AnnouncementForm';
import { IconChevronLeft, IconChatBubble } from '@/app/components/icons';
import { deleteAnnouncement, editAnnouncement } from '@/app/actions/announcements';


export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let classes = [], teachers = [], announcements = [];
  try {
    classes = await prisma.class.findMany({ orderBy: { name: 'asc' } });
    teachers = await prisma.teacher.findMany({ orderBy: { name: 'asc' } });
    announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 12 });
  } catch (err) {
    console.error('Announcement page load error:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 border-b border-[#1e233d] pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Announcements</h1>
          <p className="mt-1 text-sm text-zinc-400">Share notices with classes, teachers, and WhatsApp groups.</p>
        </div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
          <IconChevronLeft className="h-3 w-3" /> Back to Dashboard
        </Link>
      </div>

      <AnnouncementForm classes={classes} teachers={teachers} />

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Recent Announcements</h2>
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-[#1e233d] bg-[#0d0f1a] p-8 text-center text-sm text-zinc-500">
            No announcements published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {announcements.map(item => (
              <div key={item.id} className="rounded-xl border border-[#1e233d] bg-[#0d0f1a] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-white">{item.title}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">{item.audience}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.shareOnWhatsapp && (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        <IconChatBubble className="h-3 w-3" /> {item.whatsappSent} sent
                      </span>
                    )}
                    <details className="relative">
                      <summary className="px-2 py-1 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-[10px] font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer list-none">Edit</summary>
                      <div className="absolute right-0 top-8 z-20 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-3 w-72 shadow-2xl">
                        <form action={editAnnouncement} className="space-y-2">
                          <input type="hidden" name="id" value={item.id} />
                          <input name="title" defaultValue={item.title} className="w-full bg-[#16192b] border border-[#2b3052] rounded px-2 py-1.5 text-xs text-white" required />
                          <textarea name="message" rows={3} defaultValue={item.message} className="w-full bg-[#16192b] border border-[#2b3052] rounded px-2 py-1.5 text-xs text-white resize-none" required />
                          <button type="submit" className="w-full py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded uppercase tracking-wider cursor-pointer">Save</button>
                        </form>
                      </div>
                    </details>
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="px-2 py-1 bg-[#1e233d] border border-[#2b3052] rounded text-red-400 text-[10px] font-medium hover:bg-red-950/20 transition-colors cursor-pointer">Del</button>
                    </form>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-xs leading-5 text-zinc-400">{item.message}</p>
                <div className="mt-4 border-t border-[#1e233d] pt-3 text-[10px] text-zinc-600">
                  {new Date(item.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>

        )}
      </div>
    </div>
  );
}
