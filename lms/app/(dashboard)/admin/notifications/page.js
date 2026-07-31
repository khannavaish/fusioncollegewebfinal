import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { deleteAnnouncement, editAnnouncement } from '@/app/actions/announcements';
import { resolvePasswordResetAction } from '@/app/actions/passwordReset';
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
  let resetRequests = [];
  try {
    [announcements, resetRequests] = await Promise.all([
      prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.passwordResetRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);
  } catch (err) {
    console.error('Error loading notifications:', err);
  }

  const pendingResets = resetRequests.filter(r => r.status === 'PENDING');
  const resolvedResets = resetRequests.filter(r => r.status === 'RESOLVED');

  const audienceBadge = {
    ALL: 'bg-cyan-950/50 text-cyan-400 border-cyan-500/20',
    CLASSES: 'bg-blue-950/50 text-blue-400 border-blue-500/20',
    TEACHERS: 'bg-violet-950/50 text-violet-400 border-violet-500/20',
    STUDENTS: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20',
  };

  const inputCls = 'w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-10 font-sans">
      {/* Header */}
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Notifications</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {pendingResets.length > 0 && (
                <span className="text-amber-400 font-semibold">{pendingResets.length} password reset request{pendingResets.length > 1 ? 's' : ''} pending · </span>
              )}
              {announcements.length} announcements published
            </p>
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
      </AnimatedSection>

      {/* ─── Password Reset Requests ─── */}
      <AnimatedSection delay={0.2}>
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Password Reset Requests</h2>
            {pendingResets.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold rounded-full">
                {pendingResets.length} Pending
              </span>
            )}
          </div>
  
          {resetRequests.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
              No password reset requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending first */}
              {pendingResets.map((req) => (
                <div key={req.id} className="bg-[#0d0f1a] border border-amber-500/25 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{req.email}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Requested {new Date(req.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
  
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-full uppercase">
                        Pending
                      </span>
                      {/* Resolve button — generates password + sends WhatsApp */}
                      <form action={resolvePasswordResetAction}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Reset & Send via WhatsApp
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
  
              {/* Resolved (collapsed/dimmed) */}
              {resolvedResets.length > 0 && (
                <details className="group">
                  <summary className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer py-2 list-none">
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Show {resolvedResets.length} resolved request{resolvedResets.length > 1 ? 's' : ''}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {resolvedResets.map((req) => {
                      const needsManual = req.resolvedNote && req.resolvedNote.startsWith('⚠️');
                      return (
                        <div
                          key={req.id}
                          className={`bg-[#0d0f1a] border rounded-xl overflow-hidden ${needsManual ? 'border-amber-500/30' : 'border-[#1e233d] opacity-60'}`}
                        >
                          <div className="flex items-center justify-between gap-4 px-5 py-3">
                            <div className="min-w-0">
                              <p className={`text-sm truncate ${needsManual ? 'text-white font-medium' : 'text-zinc-400'}`}>{req.email}</p>
                              <p className="text-xs text-zinc-600 mt-0.5">
                                {new Date(req.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full uppercase flex-shrink-0 ${
                              needsManual
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-500'
                            }`}>
                              {needsManual ? 'Action Needed' : 'Resolved'}
                            </span>
                          </div>
  
                          {/* Show manual password note if WhatsApp failed */}
                          {needsManual && req.resolvedNote && (
                            <div className="mx-4 mb-4 p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                              <p className="text-xs text-amber-300 font-semibold mb-1.5">Manual Delivery Required</p>
                              <pre className="text-xs text-amber-200/80 whitespace-pre-wrap font-mono leading-relaxed select-all">
                                {req.resolvedNote.replace('⚠️ ', '')}
                              </pre>
                              <p className="text-[10px] text-amber-500/60 mt-2">Select all text above to copy credentials.</p>
                            </div>
                          )}
  
                          {/* WhatsApp success note */}
                          {!needsManual && req.resolvedNote && (
                            <div className="px-5 pb-3">
                              <p className="text-[11px] text-emerald-600">{req.resolvedNote}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>
      </AnimatedSection>

      {/* ─── Announcement History ─── */}
      <AnimatedSection delay={0.3}>
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white border-t border-[#1e233d] pt-6">Announcement History</h2>
  
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
        </section>
      </AnimatedSection>
    </div>
  );
}
