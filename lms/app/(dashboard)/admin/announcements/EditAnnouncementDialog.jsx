'use client';

import { useRef } from 'react';
import { editAnnouncement } from '@/app/actions/admin';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  );
}

export default function EditAnnouncementDialog({ item }) {
  const dialogRef = useRef(null);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  const handleAction = async (formData) => {
    await editAnnouncement(formData);
    closeDialog();
  };

  const inputCls = "w-full bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <>
      <button 
        type="button" 
        onClick={openDialog}
        className="px-2 py-1 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-[10px] font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer list-none"
      >
        Edit
      </button>

      <dialog 
        ref={dialogRef} 
        className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-md"
      >
        <div className="bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
            <h2 className="text-base font-black text-white tracking-wide">Edit Announcement</h2>
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
              <input type="hidden" name="id" value={item.id} />
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Title</label>
                <input name="title" defaultValue={item.title} className={inputCls} required />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Message</label>
                <textarea name="message" rows={4} defaultValue={item.message} className={`${inputCls} resize-none`} required />
              </div>

              <SubmitBtn />
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
