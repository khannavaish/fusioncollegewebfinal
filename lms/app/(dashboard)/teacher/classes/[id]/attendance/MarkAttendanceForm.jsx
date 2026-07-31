'use client';

import { useState, useTransition } from 'react';
import { markAttendanceOnly } from '@/app/actions/teacher';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', active: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40', hover: 'hover:bg-emerald-950/30 hover:border-emerald-500/30' },
  LATE:    { label: 'Late',    active: 'bg-orange-950/60 text-orange-400 border-orange-500/40',   hover: 'hover:bg-orange-950/30 hover:border-orange-500/30' },
  ABSENT:  { label: 'Absent',  active: 'bg-red-950/60 text-red-400 border-red-500/40',             hover: 'hover:bg-red-950/30 hover:border-red-500/30' },
  LEAVE:   { label: 'Leave',   active: 'bg-amber-950/60 text-amber-400 border-amber-500/40',       hover: 'hover:bg-amber-950/30 hover:border-amber-500/30' },
};

export default function MarkAttendanceForm({ classSubjectId, students }) {
  const [attendance, setAttendance] = useState(
    students.reduce((acc, s) => ({ ...acc, [s.id]: 'PRESENT' }), {})
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState(null);
  const [isPending, startTransition] = useTransition();

  const markAll = (status) => {
    setAttendance(students.reduce((acc, s) => ({ ...acc, [s.id]: status }), {}));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null); setSuccess(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('classSubjectId', classSubjectId);
      fd.append('date', date);
      Object.entries(attendance).forEach(([sid, status]) => fd.append(`attendance_${sid}`, status));
      const res = await markAttendanceOnly(fd);
      if (res?.error) setError(res.error);
      else { setSuccess(true); setTimeout(() => setSuccess(false), 6000); }
    });
  };

  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const lateCount    = Object.values(attendance).filter(s => s === 'LATE').length;
  const absentCount  = Object.values(attendance).filter(s => s === 'ABSENT').length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" />
          Attendance marked successfully. WhatsApp arrival notifications sent to parents of present students (if configured).
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400">
          <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Date + Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#16192b]/50 border border-[#1e233d] rounded-xl px-5 py-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Class Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            required />
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-400 font-bold">{presentCount} Present</span>
          <span className="text-orange-400 font-bold">{lateCount} Late</span>
          <span className="text-red-400 font-bold">{absentCount} Absent</span>
        </div>
        <div className="flex gap-2">
          {['PRESENT', 'ABSENT'].map(s => (
            <button key={s} type="button" onClick={() => markAll(s)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border cursor-pointer transition-all ${STATUS_CONFIG[s].active}`}>
              Mark All {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Student list */}
      <div className="border border-[#1e233d] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e233d] bg-[#16192b]/50">
          <h3 className="text-sm font-bold text-white">Student Roll Call - {students.length} Students</h3>
        </div>
        {students.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500 text-center">No students enrolled in this class.</p>
        ) : (
          <div className="divide-y divide-[#1e233d]">
            {students.map((student, idx) => {
              const currentStatus = attendance[student.id] || 'PRESENT';
              return (
                <div key={student.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[#16192b]/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600 w-5 text-right">{idx + 1}</span>
                    <div>
                      <div className="font-semibold text-sm text-white">{student.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{student.rollNumber}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                      <button key={status} type="button" onClick={() => setAttendance(prev => ({ ...prev, [student.id]: status }))}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          currentStatus === status ? cfg.active : `bg-transparent border-[#1e233d] text-zinc-500 ${cfg.hover}`
                        }`}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button type="submit" disabled={isPending}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition-colors cursor-pointer">
        {isPending ? 'Marking Attendance...' : 'Submit Attendance'}
      </button>
    </form>
  );
}
