'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTeacher, deleteTeacher, updateUserPassword } from '@/app/actions/admin';
import { IconEdit, IconTrash, IconKey } from '@/app/components/icons';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 pb-28 px-4 md:pt-0 md:pb-0 md:items-center md:p-6 bg-black/70 backdrop-blur-md"
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
        <div className="px-6 py-6 overflow-y-auto max-h-full md:max-h-[90vh] md:max-h-[75vh] scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function TeacherProfileActions({ teacher }) {
  const router = useRouter();
  const [modal, setModal] = useState({ type: null }); // 'edit' | 'password' | 'delete'
  const [isPending, startTransition] = useTransition();

  const closeModal = () => setModal({ type: null });

  async function handleAction(actionFn, formData) {
    startTransition(async () => {
      const result = await actionFn(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        closeModal();
        if (modal.type === 'delete') {
          router.push('/admin/teachers');
        } else {
          router.refresh();
        }
      }
    });
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setModal({ type: 'edit' })}
          className="flex items-center gap-2 px-3 py-2 bg-[#0d0f1a] hover:bg-[#16192b] border border-[#1e233d] text-cyan-400 text-sm font-semibold rounded-xl transition-colors"
        >
          <IconEdit className="w-4 h-4" /> Edit
        </button>
        <button
          onClick={() => setModal({ type: 'password' })}
          className="flex items-center gap-2 px-3 py-2 bg-[#0d0f1a] hover:bg-[#16192b] border border-[#1e233d] text-indigo-400 text-sm font-semibold rounded-xl transition-colors"
        >
          <IconKey className="w-4 h-4" /> Password
        </button>
        <button
          onClick={() => setModal({ type: 'delete' })}
          className="flex items-center gap-2 px-3 py-2 bg-[#0d0f1a] hover:bg-red-950/30 border border-[#1e233d] hover:border-red-500/30 text-red-400 text-sm font-semibold rounded-xl transition-colors"
        >
          <IconTrash className="w-4 h-4" /> Delete
        </button>
      </div>

      {/* Modals */}
      {modal.type && (
        <Modal
          title={
            modal.type === 'edit'     ? 'Edit Teacher Info' :
            modal.type === 'password' ? 'Change Password' :
                                        'Delete Teacher'
          }
          onClose={closeModal}
        >
          {/* ── EDIT ── */}
          {modal.type === 'edit' && (
            <form
              action={async (fd) => { await handleAction(updateTeacher, fd); }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={teacher.id} />

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Full Name</label>
                <input name="name" defaultValue={teacher.name} className={inputCls} required />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Phone</label>
                <input name="phone" defaultValue={teacher.phone || ''} placeholder="+92 300 0000000" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Department</label>
                  <input name="department" defaultValue={teacher.department || ''} placeholder="e.g. Science" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Qualification</label>
                  <input name="qualification" defaultValue={teacher.qualification || ''} placeholder="e.g. M.Sc Physics" className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Base Monthly Salary (₨)</label>
                <input
                  name="baseSalary"
                  defaultValue={teacher.baseSalary || ''}
                  type="number"
                  placeholder="e.g. 25000"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Account Status</label>
                <select name="status" defaultValue={teacher.user?.status || 'ACTIVE'} className={inputCls}>
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
              <input type="hidden" name="userId" value={teacher.userId} />
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 font-medium">New Password</label>
                <input
                  name="newPassword"
                  type="text"
                  placeholder="Enter new password"
                  minLength={6}
                  className={inputCls}
                  required
                />
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
              <input type="hidden" name="id" value={teacher.id} />
              <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl">
                <p className="text-zinc-300 text-sm">
                  Are you sure you want to remove{' '}
                  <span className="font-bold text-white">{teacher.name}</span>?
                </p>
                <p className="text-zinc-500 text-xs mt-2">
                  This will deactivate their account, remove all subject assignments, and clear timetable slots.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-[#1e233d] text-zinc-400 text-sm hover:text-white hover:bg-[#1e233d] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {isPending ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
