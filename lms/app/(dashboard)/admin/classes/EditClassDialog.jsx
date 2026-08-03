'use client';

import { useRef } from 'react';
import { updateClass } from '@/app/actions/admin';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { IconX } from '@/app/components/icons';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  );
}

export default function EditClassDialog({ cls }) {
  const dialogRef = useRef(null);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  const handleAction = async (formData) => {
    await updateClass(formData);
    closeDialog();
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <>
      <button 
        type="button" 
        onClick={openDialog}
        className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-xs font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer"
      >
        Edit
      </button>

      <dialog 
        ref={dialogRef} 
        className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-md"
      >
        <div className="bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
            <h2 className="text-base font-black text-white tracking-wide">Edit Class</h2>
            <button 
              type="button" 
              onClick={closeDialog}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div className="p-6">
            <form action={handleAction} className="space-y-4">
              <input type="hidden" name="id" value={cls.id} />
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Class Name</label>
                <input name="name" defaultValue={cls.name} placeholder="e.g. F.Sc Pre-Medical Part I" className={inputCls} required />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Academic Year</label>
                <input name="academicYr" defaultValue={cls.academicYr} placeholder="e.g. 2026-2027" className={inputCls} required />
              </div>

              <div className="pt-2">
                <SubmitBtn />
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
