'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateTeacher, deleteTeacher, updateUserPassword } from '@/app/actions/admin';
import PasswordShowHide from '@/app/components/PasswordShowHide';
import Pagination from '@/app/components/Pagination';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner";

const STATUS_COLORS = {
  ACTIVE:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
  INACTIVE: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
};

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 top-16 md:top-0 z-[9999] flex items-start md:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative w-full max-w-lg flex flex-col bg-[#0c0e1a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 rounded-t-3xl">
          <h2 className="text-base font-black text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(100vh-6rem)] md:max-h-[75vh] scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">{children}</div>
      </div>
    </div>
  );
}

export default function TeachersClient({ teachers, page, total, pageSize }) {
  const [modal, setModal] = useState(null); // { type: 'edit'|'delete'|'password', teacher }
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');

  function closeModal() { setModal(null); setMsg(''); }

  async function handleAction(action, formData) {
    startTransition(async () => {
      const res = await action(formData);
      if (res?.error) { setMsg(res.error); }
      else { closeModal(); }
    });
  }

  return (
    <>
      {/* Modal */}
      {modal && (
        <Modal
          title={
            modal.type === 'edit'     ? `Edit — ${modal.teacher.name}` :
            modal.type === 'delete'   ? `Delete — ${modal.teacher.name}` :
                                        `Change Password — ${modal.teacher.name}`
          }
          onClose={closeModal}
        >
          {msg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">{msg}</div>
          )}

          {/* ── EDIT ── */}
          {modal.type === 'edit' && (
            <form
              action={async (fd) => { await handleAction(updateTeacher, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="id" value={modal.teacher.id} />

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                <input name="name" defaultValue={modal.teacher.name} className={inputCls} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Phone</label>
                <input name="phone" defaultValue={modal.teacher.phone || ''} placeholder="+92 300 0000000" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Department</label>
                  <input name="department" defaultValue={modal.teacher.department || ''} placeholder="e.g. Science" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Qualification</label>
                  <input name="qualification" defaultValue={modal.teacher.qualification || ''} placeholder="e.g. M.Sc Physics" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Base Monthly Salary (₨)</label>
                <input name="baseSalary" defaultValue={modal.teacher.baseSalary || ''} type="number" placeholder="e.g. 25000" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Account Status</label>
                <select name="status" defaultValue={modal.teacher.user?.status || 'ACTIVE'} className={inputCls}>
                  <option value="ACTIVE" className="bg-[#0c0e1a]">Active</option>
                  <option value="INACTIVE" className="bg-[#0c0e1a]">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── PASSWORD ── */}
          {modal.type === 'password' && (
            <form
              action={async (fd) => { await handleAction(updateUserPassword, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="userId" value={modal.teacher.userId} />
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">New Password</label>
                <input name="newPassword" type="text" placeholder="Enter new password" minLength={6} className={inputCls} required />
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50">
                  {isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* ── DELETE ── */}
          {modal.type === 'delete' && (
            <form
              action={async (fd) => { await handleAction(deleteTeacher, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="id" value={modal.teacher.id} />
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-200 text-sm">
                  Are you sure you want to delete <span className="font-bold text-white">{modal.teacher.name}</span>?
                  This will remove their account, subjects, and all related records. This action is permanent.
                </p>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-black shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all disabled:opacity-50">
                  {isPending ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Table */}
      <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">#</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Name</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Login Email</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Password</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dept / Qual</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Phone</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Base Salary</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subjects</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {teachers.map((t, i) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-zinc-600">{i + 1 + (page - 1) * pageSize}</td>

                  {/* Name → links to teacher profile */}
                  <td className="px-6 py-4">
                    <Link href={`/admin/teachers/${t.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-sm text-indigo-400 font-black shadow-inner border border-white/5">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">{t.name}</span>
                    </Link>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-400 font-mono mb-1">{t.user?.email}</div>
                  </td>

                  {/* Password */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <PasswordShowHide password={t.user?.plainPassword} />
                      <button
                        onClick={() => setModal({ type: 'password', teacher: t })}
                        className="p-1 hover:bg-white/10 rounded-md text-amber-400 transition-colors"
                        title="Change Password"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>

                  {/* Dept / Qualification */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-xs text-indigo-400">{t.department || '-'}</div>
                    <div className="text-[10px] font-medium text-zinc-500 mt-0.5">{t.qualification || '-'}</div>
                  </td>

                  <td className="px-6 py-4 text-xs font-semibold text-zinc-400 font-mono">{t.phone || '-'}</td>

                  <td className="px-6 py-4 text-xs font-bold text-emerald-400 font-mono">
                    {t.baseSalary ? `₨ ${Number(t.baseSalary).toLocaleString()}` : '-'}
                  </td>

                  <td className="px-6 py-4 text-xs text-zinc-400">
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black px-2.5 py-1 rounded-lg">
                      {t._count.subjects} assigned
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`text-[9px] px-2.5 py-1 rounded-full border font-black uppercase tracking-widest ${STATUS_COLORS[t.user?.status] || STATUS_COLORS.ACTIVE}`}>
                      {t.user?.status || 'ACTIVE'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/teachers/${t.id}`}
                        className="px-3 py-1.5 bg-violet-500/10 rounded-lg text-violet-400 text-[10px] font-black uppercase tracking-wider hover:bg-violet-500/20 transition-colors"
                      >Profile</Link>
                      <button
                        onClick={() => setModal({ type: 'edit', teacher: t })}
                        className="px-3 py-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
                      >Edit</button>
                      <button
                        onClick={() => setModal({ type: 'delete', teacher: t })}
                        className="px-3 py-1.5 bg-rose-500/10 rounded-lg text-rose-400 text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-colors"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-5 border-t border-white/5 bg-black/20">
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/admin/teachers" />
        </div>
      </div>
    </>
  );
}
