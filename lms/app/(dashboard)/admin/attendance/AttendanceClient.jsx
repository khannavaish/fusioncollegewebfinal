'use client';

import { useState, useRef, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell } from '@/app/components/Brand';
import { IconUsers, IconDownload, IconClock } from '@/app/components/icons';
import { getDailyAttendance } from '@/app/actions/attendance';
import { toPng } from 'html-to-image';

export default function AttendanceClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPending, startTransition] = useTransition();

  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
    startTransition(async () => {
      const res = await getDailyAttendance(newDate);
      if (res.success) {
        setData(res);
      }
    });
  };

  const handleExportPNG = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#070514', // Match the dark theme base
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = `Attendance_Report_${date}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell
      title="Daily Attendance"
      description="View and export daily attendance reports across all active classes."
      icon={<IconUsers />}
      rightContent={
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleExportPNG}
            disabled={exporting || !data || data.lectures.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#1e233d] text-white hover:bg-[#2a3152] transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <IconDownload className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Report'}
          </button>
        </div>
      }
    >
      {/* Export Container */}
      <div ref={exportRef} className="rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-3xl p-6 lg:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Attendance Overview</h2>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">{new Date(date).toDateString()}</p>
          </div>
          
          {data?.summary && (
            <div className="flex gap-4">
              <div className="text-center px-4 py-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">Present</div>
                <div className="text-xl font-black text-white">{data.summary.totalPresent}</div>
              </div>
              <div className="text-center px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <div className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mb-1">Absent</div>
                <div className="text-xl font-black text-white">{data.summary.totalAbsent}</div>
              </div>
            </div>
          )}
        </div>

        {isPending ? (
          <div className="py-20 text-center text-zinc-500 animate-pulse font-bold tracking-widest uppercase">
            Loading...
          </div>
        ) : !data || data.lectures.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            No lectures recorded for this date.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {data.lectures.map((lecture, i) => {
                const percentage = lecture.stats.total > 0 
                  ? Math.round((lecture.stats.present / lecture.stats.total) * 100) 
                  : 0;

                return (
                  <motion.div
                    key={lecture.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0c0e1a]/80 p-5 group hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        <h3 className="text-sm font-black text-white truncate max-w-[180px]">{lecture.subject}</h3>
                        <p className="text-xs text-cyan-400 font-bold mt-0.5">{lecture.class}</p>
                      </div>
                      <div className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 shrink-0">
                        <span className="text-sm font-black text-white">{percentage}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                        <IconClock className="w-3.5 h-3.5" />
                        {new Date(lecture.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(lecture.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div className="text-xs text-zinc-400">
                        <span className="font-bold text-white/70">Teacher:</span> {lecture.teacher}
                      </div>

                      <div className="flex items-center gap-3 pt-3 border-t border-white/5 mt-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          {lecture.stats.present}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          {lecture.stats.absent}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 ml-auto">
                          Total: <span className="text-white">{lecture.stats.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subtle Hover Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageShell>
  );
}
