'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateTeacher, deleteTeacher, updateUserPassword } from '@/app/actions/admin';
import PasswordShowHide from '@/app/components/PasswordShowHide';
import Pagination from '@/app/components/Pagination';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

const STATUS_COLORS = {
  ACTIVE:   'bg-emerald-950/50 text-emerald-400 border-emerald-500/30',
  INACTIVE: 'bg-red-950/50 text-red-400 border-red-500/30',
};

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-[#0d0f1a] border border-[#1e233d] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e233d]">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1e233d] text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
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
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-950/40 border border-red-700/40 text-red-300 text-xs">{msg}</div>
          )}

          {/* ── EDIT ── */}
          {modal.type === 'edit' && (
            <form
              action={async (fd) => { await handleAction(updateTeacher, fd); }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={modal.teacher.id} />

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Full Name</label>
                <input name="name" defaultValue={modal.teacher.name} className={inputCls} required />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Phone</label>
                <input name="phone" defaultValue={modal.teacher.phone || ''} placeholder="+92 300 0000000" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Department</label>
                  <input name="department" defaultValue={modal.teacher.department || ''} placeholder="e.g. Science" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Qualification</label>
                  <input name="qualification" defaultValue={modal.teacher.qualification || ''} placeholder="e.g. M.Sc Physics" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Base Monthly Salary (₨)</label>
                <input name="baseSalary" defaultValue={modal.teacher.baseSalary || ''} type="number" placeholder="e.g. 25000" className={inputCls} />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Account Status</label>
                <select name="status" defaultValue={modal.teacher.user?.status || 'ACTIVE'} className={inputCls}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-white hover:bg-[#1e233d] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── PASSWORD ── */}
          {modal.type === 'password' && (
            <form
              action={async (fd) => { await handleAction(updateUserPassword, fd); }}
              className="space-y-4"
            >
              <input type="hidden" name="userId" value={modal.teacher.userId} />
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">New Password</label>
                <input name="newPassword" type="text" placeholder="Enter new password" minLength={6} className={inputCls} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-white hover:bg-[#1e233d] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* ── DELETE ── */}
          {modal.type === 'delete' && (
            <form
              action={async (fd) => { await handleAction(deleteTeacher, fd); }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={modal.teacher.id} />
              <p className="text-zinc-300 text-sm">
                Are you sure you want to delete <span className="font-bold text-white">{modal.teacher.name}</span>?
                This will remove their account, subjects, and all related records. This action cannot be undone.
              </p>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-white hover:bg-[#1e233d] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {isPending ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Table */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e233d] bg-[#16192b]/50">
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">#</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Login Email</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Password</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dept / Qual</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Base Salary</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subjects</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.id} className={`border-b border-[#1e233d] hover:bg-[#16192b]/30 transition-colors ${i % 2 === 1 ? 'bg-[#16192b]/10' : ''}`}>
                  <td className="px-5 py-4 text-xs text-zinc-600">{i + 1 + (page - 1) * pageSize}</td>

                  {/* Name → links to teacher profile */}
                  <td className="px-5 py-4">
                    <Link href={`/admin/teachers/${t.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-xs text-cyan-400 font-bold border border-cyan-900/50 flex-shrink-0">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-cyan-400 hover:text-cyan-300 whitespace-nowrap transition-colors">{t.name}</span>
                    </Link>
                  </td>

                  <td className="px-5 py-4 text-xs text-zinc-500 font-mono">{t.user?.email}</td>

                  {/* Password */}
                  <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                    <div className="flex items-center gap-2">
                      <PasswordShowHide password={t.user?.plainPassword} />
                      <button
                        onClick={() => setModal({ type: 'password', teacher: t })}
                        className="p-1 hover:bg-[#1e233d] rounded text-cyan-400 transition-colors"
                        title="Change Password"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>

                  {/* Dept / Qualification */}
                  <td className="px-5 py-4 text-xs text-zinc-400">
                    <div className="font-semibold text-cyan-400">{t.department || '-'}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{t.qualification || '-'}</div>
                  </td>

                  <td className="px-5 py-4 text-xs text-zinc-400 font-mono">{t.phone || '-'}</td>

                  <td className="px-5 py-4 text-xs text-emerald-400 font-mono">
                    {t.baseSalary ? `₨ ${Number(t.baseSalary).toLocaleString()}` : '-'}
                  </td>

                  <td className="px-5 py-4 text-xs text-zinc-400">
                    <span className="bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded">
                      {t._count.subjects} assigned
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${STATUS_COLORS[t.user?.status] || STATUS_COLORS.ACTIVE}`}>
                      {t.user?.status || 'ACTIVE'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      <Link
                        href={`/admin/teachers/${t.id}`}
                        className="px-2.5 py-1 bg-[#1e233d] rounded text-violet-400 text-[10px] font-semibold hover:bg-violet-950/30 hover:text-violet-300 transition-colors"
                      >Profile</Link>
                      <button
                        onClick={() => setModal({ type: 'edit', teacher: t })}
                        className="px-2.5 py-1 bg-[#1e233d] rounded text-cyan-400 text-[10px] font-semibold hover:bg-cyan-950/30 hover:text-cyan-300 transition-colors"
                      >Edit</button>
                      <button
                        onClick={() => setModal({ type: 'delete', teacher: t })}
                        className="px-2.5 py-1 bg-[#1e233d] rounded text-red-400 text-[10px] font-semibold hover:bg-red-950/30 hover:text-red-300 transition-colors"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-5">
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/admin/teachers" />
        </div>
      </div>
    </>
  );
}
