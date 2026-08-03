'use client';

import { useState, useTransition } from 'react';
import { createParent, updateParent, deleteParent, updateUserPassword } from '@/app/actions/admin';
import { IconUsers } from '@/app/components/icons';
import PasswordShowHide from '@/app/components/PasswordShowHide';

const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500";
const checkboxCls = "accent-cyan-500 w-3.5 h-3.5 rounded cursor-pointer";
const statusColors = {
  ACTIVE: 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
  INACTIVE: 'bg-red-950/50 text-red-400 border-red-500/30'
};

function ParentCard({ p, students }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit(e) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    startTransition(async () => {
      const res = await updateParent(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setEditOpen(false);
      }
    });
  }

  function handlePwChange(e) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);
    startTransition(async () => {
      const res = await updateUserPassword(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setPwOpen(false);
        e.target.reset();
      }
    });
  }

  function handleDelete(e) {
    e.preventDefault();
    if (!confirm(`Delete parent "${p.name}"? This cannot be undone.`)) return;
    const fd = new FormData(e.target);
    startTransition(async () => {
      await deleteParent(fd);
    });
  }

  return (
    <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
      {/* Main Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-violet-900/50 border border-violet-500/30 rounded-full flex items-center justify-center flex-shrink-0">
            <IconUsers className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">{p.name}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{p.email} · {p.phone}</div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-1">
              <span>Password: <PasswordShowHide password={p.plainPassword} /></span>
              <button
                type="button"
                onClick={() => { setPwOpen(!pwOpen); setEditOpen(false); setError(null); }}
                className="p-0.5 hover:bg-[#1e233d] rounded cursor-pointer text-cyan-400 inline-block"
                title="Change password"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {p.children.length === 0 ? (
                <span className="text-[10px] text-zinc-600">No children linked</span>
              ) : p.children.map((ch) => (
                <span key={ch.studentId} className="text-[10px] px-2 py-0.5 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 rounded-full">
                  {ch.student.name} ({ch.student.class?.name})
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${statusColors[p.status] || statusColors.ACTIVE}`}>
            {p.status || 'ACTIVE'}
          </span>
          <button
            type="button"
            onClick={() => { setEditOpen(!editOpen); setPwOpen(false); setError(null); }}
            className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-xs font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer"
          >
            {editOpen ? 'Close' : 'Edit'}
          </button>
          <form onSubmit={handleDelete}>
            <input type="hidden" name="id" value={p.id} />
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-red-400 text-xs font-medium hover:bg-red-950/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-5 mb-3 p-3 bg-red-950/40 border border-red-500/30 rounded-lg text-red-400 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Change Password Modal */}
      {pwOpen && (
        <div className="fixed inset-0 top-16 pb-24 md:pb-4 md:top-0 z-[99999] flex items-start md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setPwOpen(false)} />
          <div className="relative w-full max-w-sm max-h-[calc(100dvh-11rem)] md:max-h-[90vh] flex flex-col bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 rounded-t-3xl">
              <h2 className="text-sm font-black text-white tracking-wide">Change Password</h2>
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
              <form onSubmit={handlePwChange} className="space-y-4">
                <input type="hidden" name="userId" value={p.userId} />
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">New Password</label>
                  <input
                    name="newPassword"
                    placeholder="Min 6 characters"
                    minLength="6"
                    className={inputCls}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Saving…' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Parent Modal */}
      {editOpen && (
        <div className="fixed inset-0 top-16 pb-24 md:pb-4 md:top-0 z-[99999] flex items-start md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[calc(100dvh-11rem)] md:max-h-[90vh] flex flex-col bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 rounded-t-3xl">
              <h2 className="text-base font-black text-white tracking-wide">Edit Parent</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
              <form onSubmit={handleEdit} className="space-y-4">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-2 font-semibold uppercase tracking-wider">Full Name</label>
                    <input name="name" defaultValue={p.name} className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-2 font-semibold uppercase tracking-wider">Phone Number</label>
                    <input name="phone" defaultValue={p.phone} className={inputCls} required />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-2 font-semibold uppercase tracking-wider">Account Status</label>
                  <select name="status" defaultValue={p.status || 'ACTIVE'} className={inputCls}>
                    <option value="ACTIVE" className="bg-[#0c0e1a]">Active</option>
                    <option value="INACTIVE" className="bg-[#0c0e1a]">Inactive</option>
                  </select>
                </div>
                {students.length > 0 && (
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-3 font-semibold uppercase tracking-wider">Linked Children</label>
                    <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 scroll-smooth [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
                      {students.map((s) => (
                        <label key={s.id} className="flex items-center gap-3 bg-[#16192b]/50 border border-[#1e233d] rounded-xl px-3 py-2 cursor-pointer hover:border-[#2b3052] transition-colors">
                          <input
                            type="checkbox"
                            name="studentIds"
                            value={s.id}
                            className={checkboxCls}
                            defaultChecked={p.children.some((ch) => ch.studentId === s.id)}
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{s.name}</div>
                            <div className="text-[10px] text-cyan-400">{s.rollNumber}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-black rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ParentsClientPage({ parents, students }) {
  return (
    <div className="space-y-4">
      {parents.map((p) => (
        <ParentCard key={p.id} p={p} students={students} />
      ))}
    </div>
  );
}
