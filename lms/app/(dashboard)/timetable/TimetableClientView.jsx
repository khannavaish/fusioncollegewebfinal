'use client';

import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';

export default function TimetableClientView({ initialSlots, dbClasses, initialTimeSlots, role, studentClassName, teacherName }) {
  const [slots] = useState(initialSlots);
  const [timeSlots] = useState(initialTimeSlots);
  const timetableRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const getSlot = (section, className, timeSlot) => {
    return slots.find(
      (s) =>
        s.section === section &&
        s.className === className &&
        s.timeSlot === timeSlot
    );
  };

  const shouldHighlightClass = (clsName) => {
    if (role !== 'STUDENT') return false;
    const cleanStudentClass = studentClassName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanClsName = clsName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return cleanStudentClass.includes(cleanClsName) || cleanClsName.includes(cleanStudentClass);
  };

  const shouldHighlightSlot = (slot) => {
    if (!slot || role !== 'TEACHER') return false;
    return slot.teacher.toLowerCase().includes(teacherName.toLowerCase());
  };

  // Group classes dynamically
  const boysClasses = dbClasses
    .filter((c) => c.name.toUpperCase().startsWith('BOYS'))
    .map((c) => ({ id: c.id, displayName: c.name.replace(/^boys\s+/i, ''), rawName: c.name }));

  const girlsClasses = dbClasses
    .filter((c) => c.name.toUpperCase().startsWith('GIRLS'))
    .map((c) => ({ id: c.id, displayName: c.name.replace(/^girls\s+/i, ''), rawName: c.name }));

  const otherClasses = dbClasses
    .filter((c) => !c.name.toUpperCase().startsWith('BOYS') && !c.name.toUpperCase().startsWith('GIRLS'))
    .map((c) => ({ id: c.id, displayName: c.name, rawName: c.name }));

  const exportAsImage = async () => {
    if (!timetableRef.current) return;
    setExporting(true);
    try {
      // Small delay to ensure state updates
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dataUrl = await toPng(timetableRef.current, {
        backgroundColor: '#07080f',
        style: {
          padding: '24px',
          borderRadius: '12px',
        }
      });
      const link = document.createElement('a');
      link.download = `Fusion_College_Timetable_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setExporting(false);
    }
  };

  const renderSection = (sectionTitle, sectionCode, classesList) => {
    if (classesList.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase border-b border-[#1e233d] pb-2">
          {sectionTitle} Section
        </h3>

        <div className="overflow-x-auto border border-[#1e233d] rounded-xl bg-[#0d0f1a]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-[#1e233d] bg-[#16192b]/50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-28">Class</th>
                {timeSlots.map((ts) => (
                  <th key={ts} className="px-3 py-3 w-36 border-r border-[#1e233d] last:border-r-0">
                    {ts}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e233d]">
              {classesList.map((cls) => {
                const isStudentClass = shouldHighlightClass(cls.rawName);
                return (
                  <tr
                    key={cls.id}
                    className={`transition-colors ${
                      isStudentClass
                        ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                        : 'hover:bg-[#16192b]/10'
                    }`}
                  >
                    <td className={`px-4 py-4 text-xs font-bold text-left border-r border-[#1e233d] ${isStudentClass ? 'text-indigo-400 font-extrabold' : 'text-white'}`}>
                      {cls.displayName} {isStudentClass && '★'}
                    </td>
                    {timeSlots.map((ts) => {
                      const slot = getSlot(sectionCode, cls.displayName, ts);
                      const isTeacherSlot = shouldHighlightSlot(slot);

                      // Extract subject colors dynamically
                      const subjectColors = {
                        Physics: 'from-orange-500/10 to-red-500/10 border-orange-500/30 text-orange-400',
                        Chemistry: 'from-purple-500/10 to-indigo-500/10 border-purple-500/30 text-purple-400',
                        Biology: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-400',
                        Math: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-400',
                        Computer: 'from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-400',
                        English: 'from-amber-500/10 to-yellow-500/10 border-amber-500/30 text-amber-400',
                        Urdu: 'from-violet-500/10 to-purple-500/10 border-violet-500/30 text-violet-400',
                        Islamiat: 'from-lime-500/10 to-green-500/10 border-lime-500/30 text-lime-400',
                      };
                      const colorClass = subjectColors[slot?.subject] || 'from-zinc-500/10 to-slate-500/10 border-zinc-700/30 text-zinc-300';

                      return (
                        <td
                          key={ts}
                          className={`p-1.5 border-r border-[#1e233d] last:border-r-0 relative transition-all ${
                            isTeacherSlot ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`min-h-12 flex flex-col justify-center items-center rounded-lg p-1.5 border bg-gradient-to-br ${
                              isTeacherSlot
                                ? 'border-cyan-500 from-cyan-950/50 to-cyan-900/30 shadow shadow-cyan-900/30 text-cyan-300 font-extrabold'
                                : colorClass
                            }`}
                          >
                            <span className="text-[11px] font-bold">
                              {slot?.subject || '—'}
                            </span>
                            <span className="text-[9px] opacity-75 mt-0.5">
                              {slot?.teacher || '—'}
                            </span>
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Alerts */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4">
        <div className="text-xs text-zinc-400">
          ✨ View and export the live college schedule. Custom classes and times are instantly reflected.
        </div>
        <button
          onClick={exportAsImage}
          disabled={exporting}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-indigo-950 cursor-pointer"
        >
          {exporting ? 'Generating Image...' : '📸 Export as Picture'}
        </button>
      </div>

      {(role === 'STUDENT' && studentClassName) && (
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300">
          ⭐️ Your class (<span className="font-bold text-white">{studentClassName}</span>) rows are highlighted below to help you find your schedule easily.
        </div>
      )}

      {(role === 'TEACHER' && teacherName) && (
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 text-xs text-cyan-300">
          ⭐️ Slots assigned to you (<span className="font-bold text-white">{teacherName}</span>) are highlighted with a cyan border.
        </div>
      )}

      <div ref={timetableRef} className="space-y-8 bg-[#07080f]/50 p-2 rounded-2xl">
        <div className="hidden exporting-header mb-4 text-center">
          <h2 className="text-xl font-bold text-white">Fusion College LMS Portal</h2>
          <p className="text-xs text-zinc-400 mt-1">Official Master Timetable Schedule</p>
        </div>

        {renderSection('Boys', 'BOYS', boysClasses)}
        {renderSection('Girls', 'GIRLS', girlsClasses)}
        {renderSection('Other Classes', 'OTHER', otherClasses)}
      </div>
    </div>
  );
}
