'use client';

import { useRef } from 'react';
import { updateSubject } from '@/app/actions/admin';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { IconEdit } from '@/app/components/icons';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {pending && <Loader2 className="w-3 h-3 animate-spin" />}
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

export default function EditSubjectDialog({ sub }) {
  const dialogRef = useRef(null);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  const handleAction = async (formData) => {
    await updateSubject(formData);
    closeDialog();
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <>
      <button 
        type="button" 
        onClick={openDialog}
        className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium inline-flex items-center gap-1"
      >
        <IconEdit className="w-3 h-3" /> Edit Name
      </button>

      <dialog 
        ref={dialogRef} 
        className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-md"
      >
        <div className="bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
            <h2 className="text-base font-black text-white tracking-wide">Edit Subject</h2>
            <button 
              type="button" 
              onClick={closeDialog}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div className="p-6">
            <form action={handleAction} className="flex gap-2 items-end">
              <input type="hidden" name="id" value={sub.id} />
              
              <div className="flex-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Subject Name</label>
                <input name="name" defaultValue={sub.name} className={inputCls} required />
              </div>
              
              <div className="mb-0.5">
                <SubmitBtn />
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
