'use client';

import { useState, useRef, useTransition } from 'react';
import { saveLectureNotes } from '@/app/actions/teacher';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';

export default function LectureNotesForm({ lecture }) {
  const [topic, setTopic]   = useState(lecture.topic && lecture.topic !== 'Pending — lecture notes to be added after class.' ? lecture.topic : '');
  const [pictureBase64, setPictureBase64] = useState('');
  const [previewUrl, setPreviewUrl]       = useState(lecture.pictureUrl || '');
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let w = img.width, h = img.height;
        if (w > MAX_WIDTH) { h = Math.round((h * MAX_WIDTH) / w); w = MAX_WIDTH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setPictureBase64(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) { setError('Please enter what was taught in this lecture.'); return; }
    setError(null); setSuccess(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('lectureId', lecture.id);
      fd.append('topic', topic.trim());
      fd.append('pictureBase64', pictureBase64);
      const res = await saveLectureNotes(fd);
      if (res?.error) setError(res.error);
      else { setSuccess(true); setTimeout(() => setSuccess(false), 5000); }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" />
          Lecture notes saved successfully.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400">
          <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Topics / Concepts Taught</label>
        <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={4}
          placeholder="Enter chapters covered, concepts explained, homework assigned, exercises done..."
          className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600 resize-y"
          required />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Board / Lecture Photo <span className="text-zinc-600 font-normal">(Optional)</span>
        </label>
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*"
          className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-950/50 file:text-cyan-400 hover:file:bg-cyan-900/50 cursor-pointer" />
        {previewUrl && (
          <div className="mt-2 relative inline-block">
            <img src={previewUrl} alt="Preview" className="h-24 w-auto rounded border border-[#1e233d] object-cover" />
            <button type="button"
              onClick={() => { setPreviewUrl(''); setPictureBase64(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-[10px] flex items-center justify-center font-black shadow-lg">
              x
            </button>
          </div>
        )}
      </div>

      <button type="submit" disabled={isPending}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-colors cursor-pointer">
        {isPending ? 'Saving Lecture Notes...' : 'Save Lecture Notes'}
      </button>
    </form>
  );
}
