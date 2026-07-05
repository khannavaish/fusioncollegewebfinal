'use client';

import { useState, useRef, useTransition } from 'react';
import { submitAttendanceAndLecture } from '@/app/actions/teacher';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';

const statusCls = {
  PRESENT: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20',
  ABSENT: 'bg-red-950/40 text-red-400 border-red-500/20',
  LEAVE: 'bg-amber-950/40 text-amber-400 border-amber-500/20',
  LATE: 'bg-orange-950/40 text-orange-400 border-orange-500/20',
};

const hoverStatusCls = {
  PRESENT: 'hover:bg-emerald-900/30 hover:border-emerald-500/40',
  ABSENT: 'hover:bg-red-900/30 hover:border-red-500/40',
  LEAVE: 'hover:bg-amber-900/30 hover:border-amber-500/40',
  LATE: 'hover:bg-orange-900/30 hover:border-orange-500/40',
};

export default function AttendanceForm({ classSubjectId, students }) {
  const [attendance, setAttendance] = useState(
    students.reduce((acc, s) => ({ ...acc, [s.id]: 'PRESENT' }), {})
  );
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pictureBase64, setPictureBase64] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef(null);

  const handleStatusChange = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Compress and convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress and encode
        const base64 = canvas.toDataURL('image/jpeg', 0.75);
        setPictureBase64(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!topic.trim()) {
      setError('Please record what you taught in this class.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('classSubjectId', classSubjectId);
      formData.append('date', date);
      formData.append('topic', topic.trim());
      formData.append('pictureBase64', pictureBase64);

      // Append all student attendances
      Object.entries(attendance).forEach(([sid, status]) => {
        formData.append(`attendance_${sid}`, status);
      });

      const res = await submitAttendanceAndLecture(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTopic('');
        setPictureBase64('');
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Set success message timer
        setTimeout(() => setSuccess(false), 5000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" />
          Attendance and lecture log saved successfully!
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-400">
          <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Class Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            required
          />
        </div>

        {/* Optional Picture Upload */}
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Whiteboard / Lecture Picture <span className="text-[10px] text-zinc-500 font-normal">(Optional)</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-950/50 file:text-cyan-400 hover:file:bg-cyan-900/50 cursor-pointer"
          />
          {previewUrl && (
            <div className="mt-2 relative inline-block">
              <img src={previewUrl} alt="Preview" className="h-14 w-auto rounded border border-[#1e233d] object-cover" />
              <button
                type="button"
                onClick={() => { setPreviewUrl(''); setPictureBase64(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full text-white text-[8px] flex items-center justify-center font-black shadow-lg"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* What was taught input */}
      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">What was taught (Lecture Summary)</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topics, chapters discussed, homework given, or concepts taught..."
          rows="3"
          className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600 resize-y transition-colors"
          required
        ></textarea>
      </div>

      {/* Attendance Listing */}
      <div className="border border-[#1e233d] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e233d] bg-[#16192b]/50">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Student Attendance List</h3>
        </div>
        
        {students.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500 text-center">No students are currently enrolled in this class.</p>
        ) : (
          <div className="divide-y divide-[#1e233d]">
            {students.map((student) => {
              const currentStatus = attendance[student.id] || 'PRESENT';
              return (
                <div key={student.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[#16192b]/10 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-white">{student.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{student.rollNumber}</div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {['PRESENT', 'ABSENT', 'LEAVE', 'LATE'].map((status) => {
                      const isActive = currentStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(student.id, status)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isActive
                              ? statusCls[status]
                              : 'bg-transparent border-[#1e233d] text-zinc-500 ' + hoverStatusCls[status]
                          }`}
                        >
                          {status.toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
      >
        {isPending ? 'Saving logs & attendance...' : 'Submit Attendance & Log Lecture'}
      </button>
    </form>
  );
}
