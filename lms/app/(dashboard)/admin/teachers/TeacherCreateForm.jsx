'use client';

import ClientPortal from '@/app/components/ClientPortal';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createTeacher } from '@/app/actions/admin';
import { IconSparkles, IconAlertTriangle, IconMail, IconKey } from '@/app/components/icons';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner";

export default function TeacherCreateForm() {
  const [state, action, pending] = useActionState(createTeacher, null);
  const formRef = useRef(null);
  const dialogRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state?.success && state?.credentials) {
      formRef.current?.reset();
      setIsOpen(false);
      dialogRef.current?.showModal();
    }
  }, [state]);

  const creds = state?.credentials;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        New Teacher
      </button>

      {isOpen && (
        <ClientPortal>
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 pb-28 px-4 md:pt-0 md:pb-0 md:items-center md:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[calc(100dvh-11rem)] md:max-h-[90vh] bg-[#0c0e1a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/5 bg-white/5">
              <div>
                <h2 className="text-base font-black text-white tracking-wide">Register New Teacher</h2>
                <p className="text-[11px] text-zinc-400 mt-1">A secure password is auto-generated - no need to set one manually</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
              <form ref={formRef} action={action} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input name="name" placeholder="Full Name *" className={inputCls} required />
                  <input name="email" type="email" placeholder="Email Address *" className={inputCls} required />
                  <input name="phone" placeholder="Phone Number" className={inputCls} />
                  <input name="qualification" placeholder="Qualification (e.g. M.Sc Physics)" className={inputCls} />
                  <input name="department" placeholder="Department (e.g. Science)" className={inputCls} />
                  <input name="baseSalary" type="number" placeholder="Base Salary (e.g. 50000)" className={inputCls} />
                </div>

                {state?.error && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 flex items-center gap-2">
                    <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {state.error}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] w-full md:w-auto"
                  >
                    {pending ? 'Registering…' : 'Register & Generate Credentials'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </ClientPortal>
      )}

      {/* Credential Modal */}
      <dialog
        ref={dialogRef}
        className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-md max-h-[calc(100dvh-11rem)] md:max-h-[90vh] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-emerald-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500/40 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div className="bg-[#0c0e1a]/90 backdrop-blur-3xl border border-emerald-500/30 rounded-3xl p-6 shadow-[0_8px_32px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <IconSparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">Teacher Registered!</h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">Share these login credentials with the teacher.</p>
            </div>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-2xl p-5 mb-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Name</span>
              <span className="text-sm font-bold text-white tracking-wider">{creds?.name}</span>
            </div>
            <div className="border-t border-white/5" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                <IconMail className="w-4 h-4 text-blue-400" /> Login Email
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400">{creds?.email}</span>
            </div>
            <div className="border-t border-white/5" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                <IconKey className="w-4 h-4 text-emerald-400" /> Password
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 tracking-widest">
                {creds?.password}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 font-medium">
            <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
            Save these credentials now - the password cannot be recovered later.
          </p>

          <button
            onClick={() => dialogRef.current?.close()}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}
