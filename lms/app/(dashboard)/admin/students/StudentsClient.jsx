'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateStudent, deleteStudent, transferStudent, updateUserPassword } from '@/app/actions/admin';
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Panel */}
      <div className="relative w-full max-w-lg flex flex-col bg-[#0c0e1a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
          <h2 className="text-base font-black text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto max-h-[75vh]">{children}</div>
      </div>
    </div>
  );
}

export default function StudentsClient({ students, classes, page, total, pageSize }) {
  const [modal, setModal] = useState(null); // { type: 'edit'|'transfer'|'password', student }
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
            modal.type === 'edit'     ? `Edit — ${modal.student.name}` :
            modal.type === 'transfer' ? `Transfer — ${modal.student?.name}` :
            modal.type === 'delete'   ? `Delete — ${modal.student?.name}` :
                                        `Change Password — ${modal.student?.name}`
          }
          onClose={closeModal}
        >
          {msg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">{msg}</div>
          )}

          {modal.type === 'edit' && (
            <form
              action={async (fd) => { await handleAction(updateStudent, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="id" value={modal.student.id} />
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                <input name="name" defaultValue={modal.student.name} className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Father&apos;s Name</label>
                <input name="fatherName" defaultValue={modal.student.fatherName} className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Class</label>
                <select name="classId" defaultValue={modal.student.classId} className={inputCls} required>
                  {classes.map((c) => <option key={c.id} value={c.id} className="bg-[#0c0e1a]">{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">CNIC</label>
                  <input name="cnic" defaultValue={modal.student.cnic} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Father&apos;s CNIC</label>
                  <input name="fatherCnic" defaultValue={modal.student.fatherCnic} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">WhatsApp</label>
                  <input name="whatsappNumber" defaultValue={modal.student.whatsappNumber} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Telephone</label>
                  <input name="telephone" defaultValue={modal.student.telephone} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Gender</label>
                  <select name="gender" defaultValue={modal.student.gender} className={inputCls}>
                    <option value="" className="bg-[#0c0e1a]">Select</option>
                    <option value="Male" className="bg-[#0c0e1a]">Male</option>
                    <option value="Female" className="bg-[#0c0e1a]">Female</option>
                    <option value="Other" className="bg-[#0c0e1a]">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Status</label>
                  <select name="status" defaultValue={modal.student.user?.status || 'ACTIVE'} className={inputCls}>
                    <option value="ACTIVE" className="bg-[#0c0e1a]">Active</option>
                    <option value="INACTIVE" className="bg-[#0c0e1a]">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Address</label>
                <input name="address" defaultValue={modal.student.address} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Update Photo <span className="normal-case font-normal text-zinc-500">(Leave empty to keep current)</span></label>
                <input name="photo" type="file" accept="image/*" className={`${inputCls} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 cursor-pointer p-2`} />
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

          {modal.type === 'transfer' && (
            <form
              action={async (fd) => { await handleAction(transferStudent, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="studentId" value={modal.student.id} />
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-zinc-400 text-sm">
                  Currently in <span className="text-cyan-400 font-bold">{modal.student.class?.name || 'No Class'}</span>.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Transfer to Class</label>
                <select name="classId" defaultValue={modal.student.classId} className={inputCls} required>
                  {classes.map((c) => <option key={c.id} value={c.id} className="bg-[#0c0e1a]">{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-sm font-black shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50">
                  {isPending ? 'Transferring...' : 'Transfer Student'}
                </button>
              </div>
            </form>
          )}

          {modal.type === 'password' && (
            <form
              action={async (fd) => { await handleAction(updateUserPassword, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="userId" value={modal.student.userId} />
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

          {modal.type === 'delete' && (
            <form
              action={async (fd) => { await handleAction(deleteStudent, fd); }}
              className="space-y-5"
            >
              <input type="hidden" name="id" value={modal.student.id} />
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-200 text-sm">
                  Are you sure you want to delete <span className="font-bold text-white">{modal.student.name}</span>? This action is permanent and cannot be undone.
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
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Student</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Roll No</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Class</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Father's Name</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Login</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map((s, i) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-xs font-bold text-zinc-600">{i + 1 + (page - 1) * pageSize}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/students/${s.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.name} className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-sm text-cyan-400 font-black shadow-inner border border-white/5">
                          {s.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">{s.name}</div>
                        <div className="text-[10px] text-zinc-500 font-medium">{s.cnic || 'No CNIC'}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-lg border border-cyan-400/20">
                      {s.rollNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-zinc-300">{s.class?.name || '-'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-zinc-400">{s.fatherName}</td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-400 font-mono mb-1">{s.user?.email}</div>
                    <div className="flex items-center gap-2">
                      <PasswordShowHide password={s.user?.plainPassword} />
                      <button
                        onClick={() => setModal({ type: 'password', student: s })}
                        className="p-1 hover:bg-white/10 rounded-md text-amber-400 transition-colors"
                        title="Change Password"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] px-2.5 py-1 rounded-full border font-black uppercase tracking-widest ${STATUS_COLORS[s.user?.status] || STATUS_COLORS.ACTIVE}`}>
                      {s.user?.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/students/${s.id}/ledger`}
                        className="px-3 py-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                      >Ledger</Link>
                      <button
                        onClick={() => setModal({ type: 'edit', student: s })}
                        className="px-3 py-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
                      >Edit</button>
                      <button
                        onClick={() => setModal({ type: 'transfer', student: s })}
                        className="px-3 py-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-colors"
                      >Transfer</button>
                      <button
                        onClick={() => setModal({ type: 'delete', student: s })}
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
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/admin/students" />
        </div>
      </div>
    </>
  );
}
