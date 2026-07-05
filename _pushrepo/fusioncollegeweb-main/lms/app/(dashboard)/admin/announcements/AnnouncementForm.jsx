'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createAnnouncement } from '@/app/actions/announcements';
import { IconAlertTriangle, IconCheckCircle, IconChatBubble, IconLoader, IconSparkles } from '@/app/components/icons';

const inputCls = 'w-full rounded-lg border border-[#1e233d] bg-[#0a0c14] px-3 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors focus:border-cyan-500 focus:outline-none';

export default function AnnouncementForm({ classes, teachers }) {
  const [state, action, pending] = useActionState(createAnnouncement, null);
  const [audience, setAudience] = useState('ALL');
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const showClasses = audience === 'ALL' || audience === 'CLASSES';
  const showTeachers = audience === 'ALL' || audience === 'TEACHERS';

  return (
    <div className="rounded-xl border border-[#1e233d] bg-[#0d0f1a] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/30">
          <IconSparkles className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Create Announcement</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">Publish internally and optionally send it through WhatsApp.</p>
        </div>
      </div>

      {state?.success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          <IconCheckCircle className="h-4 w-4" />
          Announcement published. WhatsApp sent: {state.sent || 0}, skipped: {state.skipped || 0}.
        </div>
      )}
      {state?.error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          <IconAlertTriangle className="h-4 w-4" />
          {state.error}
        </div>
      )}

      <form ref={formRef} action={action} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <input name="title" className={inputCls} placeholder="Announcement title" required />
            <textarea name="message" className={`${inputCls} min-h-36 resize-y`} placeholder="Write the announcement..." required />
          </div>
          <div className="space-y-3 rounded-xl border border-[#1e233d] bg-[#090b11] p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Audience</label>
            <select name="audience" value={audience} onChange={e => setAudience(e.target.value)} className={inputCls}>
              <option value="ALL">Classes and Teachers</option>
              <option value="CLASSES">Selected Classes</option>
              <option value="TEACHERS">Selected Teachers</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-300">
              <input name="shareOnWhatsapp" type="checkbox" className="h-4 w-4 accent-emerald-500" />
              <IconChatBubble className="h-4 w-4" />
              Share on WhatsApp
            </label>
            <textarea
              name="whatsappGroups"
              className={`${inputCls} min-h-24 text-xs`}
              placeholder="Optional WhatsApp group IDs, one per line, e.g. 120363...@g.us"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showClasses && (
            <div className="rounded-xl border border-[#1e233d] bg-[#090b11] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Classes</div>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {classes.map(cls => (
                  <label key={cls.id} className="flex items-center gap-2 rounded-lg border border-[#1e233d] bg-[#0d0f1a] px-3 py-2 text-xs text-zinc-300">
                    <input type="checkbox" name="classIds" value={cls.id} className="h-4 w-4 accent-cyan-500" />
                    {cls.name}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">Leave unchecked to include every class.</p>
            </div>
          )}

          {showTeachers && (
            <div className="rounded-xl border border-[#1e233d] bg-[#090b11] p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-violet-400">Teachers</div>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {teachers.map(teacher => (
                  <label key={teacher.id} className="flex items-center gap-2 rounded-lg border border-[#1e233d] bg-[#0d0f1a] px-3 py-2 text-xs text-zinc-300">
                    <input type="checkbox" name="teacherIds" value={teacher.id} className="h-4 w-4 accent-violet-500" />
                    <span>{teacher.name}</span>
                    {!teacher.phone && <span className="ml-auto text-[10px] text-amber-400">No phone</span>}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">Leave unchecked to include every teacher.</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {pending && <IconLoader className="h-4 w-4" />}
          Publish Announcement
        </button>
      </form>
    </div>
  );
}
