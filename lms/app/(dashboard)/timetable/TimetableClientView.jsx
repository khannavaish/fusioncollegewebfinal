'use client';

import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';
import { IconDownload, IconStar, IconSparkles } from '@/app/components/icons';

const SUBJECT_COLORS = {
  Physics:   { bg: 'from-orange-950/60 to-red-950/60',   border: 'border-orange-600/40',   text: 'text-orange-300' },
  Chemistry: { bg: 'from-purple-950/60 to-indigo-950/60', border: 'border-purple-600/40',   text: 'text-purple-300' },
  Biology:   { bg: 'from-emerald-950/60 to-teal-950/60',  border: 'border-emerald-600/40',  text: 'text-emerald-300' },
  Math:      { bg: 'from-blue-950/60 to-cyan-950/60',     border: 'border-blue-600/40',     text: 'text-blue-300' },
  Computer:  { bg: 'from-rose-950/60 to-pink-950/60',     border: 'border-rose-600/40',     text: 'text-rose-300' },
  English:   { bg: 'from-amber-950/60 to-yellow-950/60',  border: 'border-amber-600/40',    text: 'text-amber-300' },
  Urdu:      { bg: 'from-violet-950/60 to-purple-950/60', border: 'border-violet-600/40',   text: 'text-violet-300' },
  Islamiat:  { bg: 'from-lime-950/60 to-green-950/60',    border: 'border-lime-600/40',     text: 'text-lime-300' },
};
const DEFAULT_COLOR = { bg: 'from-zinc-900/80 to-slate-900/80', border: 'border-zinc-700/40', text: 'text-zinc-200' };

export default function TimetableClientView({ initialSlots, dbClasses, initialTimeSlots, role, studentClassName, teacherName }) {
  const [slots]     = useState(initialSlots);
  const [timeSlots] = useState(initialTimeSlots);
  const [exporting, setExporting] = useState('');

  const boysRef  = useRef(null);
  const girlsRef = useRef(null);
  const otherRef = useRef(null);

  const getSlot = (section, className, timeSlot) =>
    slots.find(s => s.section === section && s.className === className && s.timeSlot === timeSlot);

  const shouldHighlightClass = (clsName) => {
    if (role !== 'STUDENT' || !studentClassName) return false;
    const a = studentClassName.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
    const b = clsName.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
    return a.includes(b) || b.includes(a);
  };

  const shouldHighlightSlot = (slot) => {
    if (!slot || role !== 'TEACHER' || !teacherName) return false;
    return slot.teacher.toLowerCase().includes(teacherName.toLowerCase());
  };

  const boysClasses  = dbClasses.filter(c =>  c.name.toUpperCase().startsWith('BOYS')).map(c => ({ id: c.id, display: c.name.replace(/^boys\s+/i,''),  raw: c.name }));
  const girlsClasses = dbClasses.filter(c =>  c.name.toUpperCase().startsWith('GIRLS')).map(c => ({ id: c.id, display: c.name.replace(/^girls\s+/i,''), raw: c.name }));
  const otherClasses = dbClasses.filter(c => !c.name.toUpperCase().startsWith('BOYS') && !c.name.toUpperCase().startsWith('GIRLS')).map(c => ({ id: c.id, display: c.name, raw: c.name }));

  const exportEl = async (element, filename) => {
    if (!element) return;
    try {
      const dataUrl = await toPng(element, { backgroundColor: '#070810', pixelRatio: 2, style: { padding: '20px', borderRadius: '12px' } });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleExport = async (type, ref, name) => {
    setExporting(type);
    await new Promise(r => setTimeout(r, 150));
    await exportEl(ref.current, name);
    setExporting('');
  };

  const ExportHeader = ({ subtitle }) => (
    <div className="flex items-center gap-4 pb-4 mb-4 border-b border-[#1e233d]">
      <img src="/logo.png" alt="Fusion College" className="h-14 w-auto object-contain" />
      <div>
        <div className="text-xl font-black text-white">Fusion College Narowal</div>
        <div className="text-sm text-cyan-400 font-semibold mt-0.5">{subtitle}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{new Date().toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' })}</div>
      </div>
    </div>
  );

  const renderSection = (sectionTitle, sectionCode, classesList, sectionRef, exportKey) => {
    if (classesList.length === 0) return null;

    // A time slot is a "break" if no class has any subject assigned to it
    const isBreakSlot = (ts) =>
      classesList.every(cls => !getSlot(sectionCode, cls.display, ts)?.subject);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e233d] pb-3">
          <h3 className="text-base font-bold text-cyan-400 tracking-wider uppercase">{sectionTitle}</h3>
          <button
            disabled={exporting === exportKey}
            onClick={() => handleExport(exportKey, sectionRef, `Fusion_${sectionTitle.replace(/\s+/g,'_')}_Timetable.png`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
          >
            {exporting === exportKey ? '⏳' : <IconDownload className="w-3.5 h-3.5" />} Export PNG
          </button>
        </div>

        {/* Outer scroll container wrapper, inner ref element at min-w-max ensures export captures the full unclipped width */}
        <div className="overflow-x-auto border border-[#1e233d] rounded-xl scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div ref={sectionRef} className="bg-[#070810] p-5 min-w-max">
            <ExportHeader subtitle={`${sectionTitle} — Master Timetable`} />
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] bg-[#16192b]/60 text-[13px] font-bold text-zinc-300 uppercase tracking-wider">
                  <th className="px-5 py-4 text-left w-36 border-r border-[#1e233d]">Class</th>
                  {timeSlots.map(ts => (
                    <th key={ts} className={`px-4 py-4 min-w-[160px] border-r border-[#1e233d] last:border-r-0 ${
                      isBreakSlot(ts) ? 'text-amber-400 bg-amber-950/20' : ''
                    }`}>
                      {isBreakSlot(ts) ? <span className="flex items-center justify-center gap-1">☕ <span>{ts}</span></span> : ts}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e233d]">
                {classesList.map(cls => {
                  const isStudentCls = shouldHighlightClass(cls.raw);
                  return (
                    <tr key={cls.id} className={`transition-colors ${isStudentCls ? 'bg-indigo-950/20' : 'hover:bg-[#16192b]/10'}`}>
                      <td className={`px-5 py-4 text-sm font-extrabold text-left border-r border-[#1e233d] flex items-center gap-1.5 ${isStudentCls ? 'text-indigo-400' : 'text-white'}`}>
                        {cls.display} {isStudentCls && <IconStar className="w-3.5 h-3.5 text-indigo-400" />}
                      </td>
                      {timeSlots.map(ts => {
                        const slot      = getSlot(sectionCode, cls.display, ts);
                        const isTeacher = shouldHighlightSlot(slot);
                        // Show amber break style only when break slot AND no subject assigned
                        const showBreak = isBreakSlot(ts) && !slot?.subject;
                        const color     = showBreak
                          ? { bg: 'from-amber-950/40 to-orange-950/30', border: 'border-amber-600/40', text: 'text-amber-400' }
                          : (SUBJECT_COLORS[slot?.subject] || DEFAULT_COLOR);

                        return (
                          <td key={ts} className="p-2 border-r border-[#1e233d] last:border-r-0">
                            <motion.div
                              whileHover={{ scale: 1.04, y: -2 }}
                              transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                              className={`min-h-[68px] flex flex-col justify-center items-center rounded-xl px-2 py-2 border bg-gradient-to-br transition-all ${
                                isTeacher ? 'border-cyan-500 from-cyan-950/50 to-cyan-900/30 shadow shadow-cyan-900/30' : `${color.border} ${color.bg}`
                              }`}
                            >
                              {showBreak ? (
                                <>
                                  <span className="text-xl leading-none">☕</span>
                                  <span className="text-[11px] font-bold text-amber-400 mt-1 uppercase tracking-wider">Break</span>
                                </>
                              ) : (
                                <>
                                  <span className={`text-[15px] font-extrabold leading-tight ${isTeacher ? 'text-cyan-300' : color.text}`}>
                                    {slot?.subject || '—'}
                                  </span>
                                  <span className="text-[11px] text-zinc-400 mt-1 leading-tight">
                                    {slot?.teacher || '—'}
                                  </span>
                                </>
                              )}
                            </motion.div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          <IconSparkles className="w-4 h-4 text-cyan-400" />
          <span>Live college schedule. Hover tiles for interactions. Export each section as a PNG below.</span>
        </div>
      </div>

      {role === 'STUDENT' && studentClassName && (
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300 flex items-center gap-2">
          <IconStar className="w-4 h-4 text-indigo-400" />
          <span>Your class (<span className="font-bold text-white">{studentClassName}</span>) rows are highlighted.</span>
        </div>
      )}
      {role === 'TEACHER' && teacherName && (
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-300 flex items-center gap-2">
          <IconStar className="w-4 h-4 text-cyan-400" />
          <span>Your slots (<span className="font-bold text-white">{teacherName}</span>) are highlighted in cyan.</span>
        </div>
      )}

      <div className="space-y-10">
        {renderSection('Boys Section',  'BOYS',  boysClasses,  boysRef,  'boys')}
        {renderSection('Girls Section', 'GIRLS', girlsClasses, girlsRef, 'girls')}
        {renderSection('Other Classes', 'OTHER', otherClasses, otherRef, 'other')}
      </div>
    </div>
  );
}
