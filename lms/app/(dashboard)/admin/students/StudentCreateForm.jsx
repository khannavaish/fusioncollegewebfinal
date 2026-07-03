'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createStudent } from '@/app/actions/admin';
import { IconCheckCircle, IconAlertTriangle, IconIdCard, IconMail, IconKey } from '@/app/components/icons';

const inputCls = "w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

export default function StudentCreateForm({ classes }) {
  const [state, action, pending] = useActionState(createStudent, null);
  const formRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (state?.success && state?.credentials) {
      formRef.current?.reset();
      dialogRef.current?.showModal();
    }
  }, [state]);

  const creds = state?.credentials;

  return (
    <>
      {/* Credential Modal */}
      <dialog
        ref={dialogRef}
        className="bg-[#0d0f1a] border border-emerald-500/30 rounded-2xl p-0 shadow-2xl shadow-emerald-900/20 w-full max-w-md backdrop:bg-black/70"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-emerald-500/40 flex items-center justify-center">
              <IconCheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Student Enrolled!</h2>
              <p className="text-[11px] text-zinc-400">Share these login credentials with the student</p>
            </div>
          </div>

          <div className="bg-[#0a0c14] border border-[#1e233d] rounded-xl p-5 space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Student Name</span>
              <span className="text-sm font-bold text-white">{creds?.name}</span>
            </div>
            <div className="border-t border-[#1e233d]" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                <IconIdCard className="w-3.5 h-3.5" /> Roll Number
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400">{creds?.rollNumber}</span>
            </div>
            <div className="border-t border-[#1e233d]" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                <IconMail className="w-3.5 h-3.5" /> Login Email
              </span>
              <span className="text-xs font-mono text-zinc-300">{creds?.email}</span>
            </div>
            <div className="border-t border-[#1e233d]" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
                <IconKey className="w-3.5 h-3.5" /> Password
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-widest">
                {creds?.password}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <IconAlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Save these credentials now — the password cannot be recovered later.
          </p>

          <button
            onClick={() => dialogRef.current?.close()}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </dialog>

      {/* Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div>
            <h2 className="text-sm font-bold text-white">Enroll New Student</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Roll number, login email & password are auto-generated</p>
          </div>
        </div>

        {classes.length === 0 ? (
          <p className="text-sm text-amber-400">Please <a href="/admin/classes" className="underline">create at least one class</a> before enrolling students.</p>
        ) : (
          <form ref={formRef} action={action}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input name="name" placeholder="Full Name *" className={inputCls} required />
              <input name="fatherName" placeholder="Father's Name *" className={inputCls} required />
              <select name="classId" className={inputCls} required>
                <option value="">Select Class *</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.academicYr})</option>
                ))}
              </select>
            </div>

            {state?.error && (
              <div className="mb-3 px-3 py-2 bg-red-950/40 border border-red-500/30 rounded-lg text-xs text-red-400">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {pending ? 'Enrolling…' : 'Enroll Student & Generate Credentials'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
