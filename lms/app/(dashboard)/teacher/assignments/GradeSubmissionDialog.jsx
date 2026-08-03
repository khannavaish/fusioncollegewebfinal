'use client';

import { useRef } from 'react';
import { gradeSubmission } from '@/app/actions/teacher';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
    >
      {pending && <Loader2 className="w-3 h-3 animate-spin" />}
      {pending ? 'Saving...' : 'Save Grade'}
    </button>
  );
}

export default function GradeSubmissionDialog({ submission }) {
  const dialogRef = useRef(null);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  const handleAction = async (formData) => {
    await gradeSubmission(formData);
    closeDialog();
  };

  const inputCls = "w-full bg-[#16192b] border border-[#2b3052] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors";

  return (
    <>
      <button 
        type="button" 
        onClick={openDialog}
        className="px-3 py-1.5 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 text-xs font-medium hover:bg-cyan-950/20 transition-colors cursor-pointer list-none"
      >
        {submission.grade ? 'Re-grade' : 'Grade'}
      </button>

      <dialog 
        ref={dialogRef} 
        className="bg-transparent m-auto backdrop:bg-black/60 backdrop:backdrop-blur-md p-4 w-full max-w-sm max-h-full md:max-h-[90vh] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div className="bg-[#0c0e1a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/5">
            <h2 className="text-sm font-black text-white tracking-wide">Grade Submission</h2>
            <button 
              type="button" 
              onClick={closeDialog}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div className="p-5">
            <form action={handleAction} className="space-y-3 text-left">
              <input type="hidden" name="submissionId" value={submission.id} />
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Grade</label>
                <input
                  name="grade"
                  placeholder="e.g. 85/100 or A+"
                  defaultValue={submission.grade || ''}
                  className={inputCls}
                  required
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Remarks (optional)</label>
                <textarea
                  name="remarks"
                  rows={3}
                  placeholder="Feedback for student..."
                  defaultValue={submission.remarks || ''}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <SubmitBtn />
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
