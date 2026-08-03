'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveTimetableSlots } from '@/app/actions/timetable';
import { createClass } from '@/app/actions/admin';
import { IconCheckCircle, IconAlertTriangle, IconDownload, IconPlus, IconHelpCircle, IconDocumentText, IconSchool, IconSettings, IconLoader } from '@/app/components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { isBreakTimeSlot, BREAK_COLOR } from '@/utils/timetable';

const SUBJECT_COLORS = {
  Physics:   { bg: 'from-orange-950/60 to-red-950/60',   border: 'border-orange-600/40',   text: 'text-orange-300',   badge: 'bg-orange-500/20' },
  Chemistry: { bg: 'from-purple-950/60 to-indigo-950/60', border: 'border-purple-600/40',   text: 'text-purple-300',   badge: 'bg-purple-500/20' },
  Biology:   { bg: 'from-emerald-950/60 to-teal-950/60',  border: 'border-emerald-600/40',  text: 'text-emerald-300',  badge: 'bg-emerald-500/20' },
  Math:      { bg: 'from-blue-950/60 to-cyan-950/60',     border: 'border-blue-600/40',     text: 'text-blue-300',     badge: 'bg-blue-500/20' },
  Computer:  { bg: 'from-rose-950/60 to-pink-950/60',     border: 'border-rose-600/40',     text: 'text-rose-300',     badge: 'bg-rose-500/20' },
  English:   { bg: 'from-amber-950/60 to-yellow-950/60',  border: 'border-amber-600/40',    text: 'text-amber-300',    badge: 'bg-amber-500/20' },
  Urdu:      { bg: 'from-violet-950/60 to-purple-950/60', border: 'border-violet-600/40',   text: 'text-violet-300',   badge: 'bg-violet-500/20' },
  Islamiat:  { bg: 'from-lime-950/60 to-green-950/60',    border: 'border-lime-600/40',     text: 'text-lime-300',     badge: 'bg-lime-500/20' },
};

const DEFAULT_COLOR = { bg: 'from-zinc-900/80 to-slate-900/80', border: 'border-zinc-700/40', text: 'text-zinc-200', badge: 'bg-zinc-700/30' };

export default function TimetableEditor({ initialSlots, dbClasses, initialTimeSlots, dbTeachers = [] }) {
  const [slots, setSlots]           = useState(initialSlots);
  const [timeSlots, setTimeSlots]   = useState(initialTimeSlots);
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);
  const [editingSlot, setEditingSlot]         = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState(null);
  const [isPending, startTransition] = useTransition();
  const [newClassSection, setNewClassSection] = useState('BOYS');
  const [newClassName, setNewClassName]       = useState('');
  const [exporting, setExporting] = useState('');
  const router = useRouter();

  // When the server re-renders (after router.refresh()), sync fresh props into local state
  useEffect(() => { setSlots(initialSlots); },     [initialSlots]);
  useEffect(() => { setTimeSlots(initialTimeSlots); }, [initialTimeSlots]);

  const boysRef   = useRef(null);
  const girlsRef  = useRef(null);
  const otherRef  = useRef(null);
  const classRefs = useRef({});

  // ─── helpers ───────────────────────────────────────────────────────────────
  const getSlot = (section, className, timeSlot) =>
    slots.find(s => s.section === section && s.className === className && s.timeSlot === timeSlot);

  const getSlotKey = (section, className, timeSlot) => `${section}|${className}|${timeSlot}`;

  // ─── swap (click) ──────────────────────────────────────────────────────────
  const handleTileClick = (section, className, timeSlot) => {
    const clickedKey = getSlotKey(section, className, timeSlot);
    const slot = getSlot(section, className, timeSlot);

    // If the slot has a subject but is missing a teacher, open the modal directly
    // to let the admin assign one, instead of entering swap mode.
    if (slot?.subject?.trim() && !slot?.teacher?.trim() && !selectedSlotKey) {
      setEditingSlot(slot);
      return;
    }

    if (!selectedSlotKey) { setSelectedSlotKey(clickedKey); return; }
    if (selectedSlotKey === clickedKey) { setSelectedSlotKey(null); return; };

    const [selSection, selClassName, selTimeSlot] = selectedSlotKey.split('|');
    const ns = [...slots];
    const ai = ns.findIndex(s => s.section === selSection && s.className === selClassName && s.timeSlot === selTimeSlot);
    const bi = ns.findIndex(s => s.section === section    && s.className === className    && s.timeSlot === timeSlot);
    const a  = ai !== -1 ? ns[ai] : null;
    const b  = bi !== -1 ? ns[bi] : null;
    const [sa, ta, tai] = [a?.subject || '', a?.teacher || '', a?.teacherId || null];
    const [sb, tb, tbi] = [b?.subject || '', b?.teacher || '', b?.teacherId || null];
    if (ai !== -1) ns[ai] = { ...ns[ai], subject: sb, teacher: tb, teacherId: tbi };
    else ns.push({ section: selSection, className: selClassName, timeSlot: selTimeSlot, subject: sb, teacher: tb, teacherId: tbi });
    if (bi !== -1) ns[bi] = { ...ns[bi], subject: sa, teacher: ta, teacherId: tai };
    else ns.push({ section, className, timeSlot, subject: sa, teacher: ta, teacherId: tai });
    setSlots(ns);
    setSelectedSlotKey(null);
  };

  // ─── drag & drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e, section, className, timeSlot) =>
    e.dataTransfer.setData('text/plain', getSlotKey(section, className, timeSlot));

  const handleDrop = (e, section, className, timeSlot) => {
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain');
    if (!src || src === getSlotKey(section, className, timeSlot)) return;
    const [ss, sc, st] = src.split('|');
    const ns = [...slots];
    const ai = ns.findIndex(s => s.section === ss && s.className === sc && s.timeSlot === st);
    const bi = ns.findIndex(s => s.section === section && s.className === className && s.timeSlot === timeSlot);
    const a  = ai !== -1 ? ns[ai] : null;
    const b  = bi !== -1 ? ns[bi] : null;
    const [sa, ta, tai] = [a?.subject || '', a?.teacher || '', a?.teacherId || null];
    const [sb, tb, tbi] = [b?.subject || '', b?.teacher || '', b?.teacherId || null];
    if (ai !== -1) ns[ai] = { ...ns[ai], subject: sb, teacher: tb, teacherId: tbi };
    else ns.push({ section: ss, className: sc, timeSlot: st, subject: sb, teacher: tb, teacherId: tbi });
    if (bi !== -1) ns[bi] = { ...ns[bi], subject: sa, teacher: ta, teacherId: tai };
    else ns.push({ section, className, timeSlot, subject: sa, teacher: ta, teacherId: tai });
    setSlots(ns);
  };

  // ─── time column management ────────────────────────────────────────────────
  const addTimeColumn = () => {
    const ts = prompt('Enter new time range (e.g. 11:50-12:30):');
    if (!ts) return;
    if (timeSlots.includes(ts)) { alert('This time slot already exists!'); return; }
    setTimeSlots([...timeSlots, ts]);
  };

  const deleteTimeColumn = (ts) => {
    if (!confirm(`Delete column "${ts}"? All entries in this time slot will be removed.`)) return;
    setTimeSlots(timeSlots.filter(t => t !== ts));
    setSlots(slots.filter(s => s.timeSlot !== ts));
  };

  const editTimeColumn = (oldTs) => {
    const newTs = prompt('Edit time slot:', oldTs);
    if (!newTs || newTs === oldTs) return;
    if (timeSlots.includes(newTs)) { alert('This time slot already exists!'); return; }
    setTimeSlots(timeSlots.map(t => t === oldTs ? newTs : t));
    setSlots(slots.map(s => s.timeSlot === oldTs ? { ...s, timeSlot: newTs } : s));
  };

  // ─── class row creator ─────────────────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const fullName = `${newClassSection} ${newClassName.trim()}`;
    const formData = new FormData();
    formData.append('name', fullName);
    formData.append('academicYr', new Date().getFullYear().toString());
    startTransition(async () => {
      const res = await createClass(formData);
      if (res?.error) {
        alert(res.error);
      } else {
        setNewClassName('');
        // Reload the page so the new class row appears in the timetable grid.
        // The first slot assigned to this class will automatically be picked up
        // as the class incharge when the timetable is next saved.
        window.location.reload();
      }
    });
  };

  // ─── edit modal ────────────────────────────────────────────────────────────
  const openEditModal = (e, section, className, timeSlot) => {
    e.stopPropagation();
    setEditingSlot(getSlot(section, className, timeSlot) || { section, className, timeSlot, subject: '', teacher: '', teacherId: null });
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editingSlot) return;
    const ns = [...slots];
    const idx = ns.findIndex(s => s.section === editingSlot.section && s.className === editingSlot.className && s.timeSlot === editingSlot.timeSlot);
    if (idx !== -1) ns[idx] = { ...editingSlot };
    else ns.push({ ...editingSlot });
    setSlots(ns);
    setEditingSlot(null);
  };

  // ─── save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    setError(null); setSuccess(false);
    startTransition(async () => {
      const res = await saveTimetableSlots(slots, timeSlots);
      if (res?.error) setError(res.error);
      else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
        // Refresh the page data so the timetable reflects the latest DB state
        // (this also picks up any teacher assignments done via Manage Classes)
        router.refresh();
      }
    });
  };

  // ─── export helpers ────────────────────────────────────────────────────────
  const exportElement = async (element, filename) => {
    if (!element) return;
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#070810',
        pixelRatio: 2,
        style: { padding: '20px', borderRadius: '12px' },
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  const handleExport = async (type, id) => {
    setExporting(type + (id || ''));
    await new Promise(r => setTimeout(r, 150));
    let element = null, filename = '';
    if (type === 'boys')   { element = boysRef.current;         filename = 'Fusion_Boys_Timetable.png'; }
    if (type === 'girls')  { element = girlsRef.current;        filename = 'Fusion_Girls_Timetable.png'; }
    if (type === 'other')  { element = otherRef.current;        filename = 'Fusion_Other_Timetable.png'; }
    if (type === 'class')  { element = classRefs.current[id];   filename = `Fusion_${id.replace(/\s+/g,'_')}_Timetable.png`; }
    await exportElement(element, filename);
    setExporting('');
  };

  // ─── group classes ─────────────────────────────────────────────────────────
  const boysClasses  = dbClasses.filter(c =>  c.name.toUpperCase().startsWith('BOYS')).map(c => ({ id: c.id, display: c.name.replace(/^boys\s+/i, ''), raw: c.name }));
  const girlsClasses = dbClasses.filter(c =>  c.name.toUpperCase().startsWith('GIRLS')).map(c => ({ id: c.id, display: c.name.replace(/^girls\s+/i,''), raw: c.name }));
  const otherClasses = dbClasses.filter(c => !c.name.toUpperCase().startsWith('BOYS') && !c.name.toUpperCase().startsWith('GIRLS')).map(c => ({ id: c.id, display: c.name, raw: c.name }));

  // ─── header (for each exported section) ───────────────────────────────────
  const ExportHeader = ({ subtitle }) => (
    <div className="flex items-center gap-4 pb-4 mb-4 border-b border-[#1e233d]">
      <img src="/logo.png" alt="Fusion College Logo" className="h-14 w-auto object-contain" />
      <div>
        <div className="text-xl font-black text-white tracking-tight">Fusion College Narowal</div>
        <div className="text-sm text-cyan-400 font-semibold mt-0.5">{subtitle}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{new Date().toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' })}</div>
      </div>
    </div>
  );

  // ─── single class row for class-level ref export ───────────────────────────
  const renderClassCard = (cls, sectionCode) => (
    <div
      key={cls.id}
      ref={el => classRefs.current[cls.raw] = el}
      className="bg-[#070810] p-4 rounded-xl border border-[#1e233d] space-y-3"
    >
      <ExportHeader subtitle={`${sectionCode === 'BOYS' ? 'Boys' : sectionCode === 'GIRLS' ? 'Girls' : 'General'} – ${cls.display}`} />
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-[#16192b]/60 text-[13px] font-bold text-zinc-300 uppercase tracking-wider">
              <th className="px-4 py-3 text-left border-r border-[#1e233d] w-36">Time Slot</th>
              <th className="px-4 py-3 border-r border-[#1e233d]">Subject</th>
              <th className="px-4 py-3">Teacher</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e233d]">
            {timeSlots.map(ts => {
              const slot = getSlot(sectionCode, cls.display, ts);
              const showBreak = isBreakTimeSlot(ts) && !slot?.subject?.trim();
              const color = showBreak ? BREAK_COLOR : (SUBJECT_COLORS[slot?.subject] || DEFAULT_COLOR);
              return (
                <tr key={ts} className={`bg-gradient-to-r ${color.bg}`}>
                  <td className="px-4 py-3 text-sm font-bold text-zinc-300 border-r border-[#1e233d] text-left">{ts}</td>
                  <td className={`px-4 py-3 text-base font-extrabold border-r border-[#1e233d] ${color.text}`}>
                    {showBreak ? 'Break' : (slot?.subject || '-')}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{showBreak ? '-' : (slot?.teacher || '-')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── full section renderer (grid view + export container) ─────────────────
  const renderSection = (sectionTitle, sectionCode, classesList, sectionRef, exportKey) => {
    if (classesList.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e233d] pb-3">
          <h3 className="text-base font-bold text-cyan-400 tracking-wider uppercase">{sectionTitle}</h3>
          <button
            type="button"
            disabled={exporting === exportKey}
            onClick={() => handleExport(exportKey)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
          >
            {exporting === exportKey ? <IconLoader className="w-3.5 h-3.5" /> : <IconDownload className="w-3.5 h-3.5" />} Export {sectionTitle} PNG
          </button>
        </div>

        {/* Outer scroll container wrapper, inner ref element at min-w-max ensures export captures the full unclipped width */}
        <div className="overflow-x-auto overflow-y-visible border border-[#1e233d] rounded-xl">
          <div ref={sectionRef} className="bg-[#070810] p-5 min-w-max">
            <ExportHeader subtitle={`${sectionTitle} - Master Timetable`} />
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] bg-[#16192b]/60 text-[13px] font-bold text-zinc-300 uppercase tracking-wider">
                  <th className="px-5 py-4 text-left w-36 border-r border-[#1e233d]">Class</th>
                  {timeSlots.map(ts => {
                    const isBreak = isBreakTimeSlot(ts);
                    return (
                      <th key={ts} className={`px-4 py-4 min-w-[160px] border-r border-[#1e233d] last:border-r-0 relative group ${
                        isBreak ? 'text-zinc-400 bg-zinc-900/40' : ''
                      }`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{ts}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            <button type="button" onClick={() => editTimeColumn(ts)} className="p-0.5 hover:bg-[#2b3052] rounded text-cyan-400 cursor-pointer" title="Edit">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                            <button type="button" onClick={() => deleteTimeColumn(ts)} className="p-0.5 hover:bg-red-950 rounded text-red-400 cursor-pointer" title="Delete">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e233d]">
                {classesList.map(cls => (
                  <tr key={cls.id} className="hover:bg-[#16192b]/20 transition-colors">
                    <td className="px-5 py-4 text-sm font-extrabold text-white text-left bg-[#16192b]/30 border-r border-[#1e233d]">
                      {cls.display}
                    </td>
                    {timeSlots.map(ts => {
                      const slot       = getSlot(sectionCode, cls.display, ts);
                      const isSelected = selectedSlotKey === getSlotKey(sectionCode, cls.display, ts);
                      const showBreak  = isBreakTimeSlot(ts) && !slot?.subject?.trim();
                      const color      = showBreak
                        ? BREAK_COLOR
                        : (SUBJECT_COLORS[slot?.subject] || DEFAULT_COLOR);

                      return (
                        <td
                          key={ts}
                          draggable
                          onDragStart={e => handleDragStart(e, sectionCode, cls.display, ts)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleDrop(e, sectionCode, cls.display, ts)}
                          onClick={() => handleTileClick(sectionCode, cls.display, ts)}
                          className={`p-2 border-r border-[#1e233d] last:border-r-0 cursor-grab transition-all group relative ${isSelected ? 'ring-2 ring-inset ring-cyan-400' : ''}`}
                        >
                          <motion.div
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                            className={`min-h-[68px] flex flex-col justify-center items-center rounded-xl px-2 py-2 border bg-gradient-to-br transition-all ${color.border} ${color.bg}`}
                          >
                            {showBreak ? (
                              <>
                                <span className={`text-[15px] font-extrabold select-none leading-tight ${color.text}`}>Break</span>
                                <span className="text-[11px] text-zinc-500 mt-1 select-none leading-tight">-</span>
                              </>
                            ) : (
                              <>
                                <span className={`text-[15px] font-extrabold select-none leading-tight ${color.text}`}>{slot?.subject || '-'}</span>
                                <span className={`text-[11px] mt-1 select-none leading-tight ${slot?.subject && !slot?.teacher ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                                  {slot?.subject && !slot?.teacher?.trim() ? '⚠ No teacher' : (slot?.teacher || '-')}
                                </span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={e => openEditModal(e, sectionCode, cls.display, ts)}
                              className="absolute right-1.5 top-1.5 p-1 bg-[#16192b] border border-[#2b3052] rounded opacity-0 group-hover:opacity-100 transition-opacity hover:border-cyan-500 cursor-pointer"
                            >
                              <IconSettings className="w-3 h-3 text-cyan-400" />
                            </button>
                          </motion.div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-class export cards (hidden visually but captured for export) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <IconDocumentText className="w-3.5 h-3.5" /> Export Individual Class:
          </h4>
          <div className="flex flex-wrap gap-2">
            {classesList.map(cls => (
              <button
                key={cls.id}
                type="button"
                disabled={exporting === 'class' + cls.raw}
                onClick={() => handleExport('class', cls.raw)}
                className="px-3 py-1.5 bg-[#16192b] border border-[#2b3052] hover:border-cyan-600 text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {exporting === 'class' + cls.raw ? <IconLoader className="w-3.5 h-3.5" /> : <IconDocumentText className="w-3.5 h-3.5" />} {cls.display}
              </button>
            ))}
          </div>
        </div>

        {/* Per-class hidden export containers - fixed so off-screen refs don't widen the page */}
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" aria-hidden="true">
          <div className="space-y-4 w-[900px]">
            {classesList.map(cls => renderClassCard(cls, sectionCode))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alert states */}
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" />
          Timetable saved and published successfully! Class incharges have been auto-assigned based on the first slot of each class.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400">
          <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap justify-between items-start gap-4 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
        <div className="text-sm text-zinc-400 max-w-sm">
          <div className="flex items-center gap-1.5 font-bold text-white mb-1.5">
            <IconHelpCircle className="w-4 h-4 text-cyan-400" /> Editor Mode Rules:
          </div>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>Click two tiles sequentially to swap them.</li>
            <li>Drag & drop to reschedule.</li>
            <li>Hover column headers to edit or remove time slots.</li>
            <li className="text-amber-400 font-semibold">Click a <span className="font-bold">⚠ No teacher</span> slot to instantly assign one.</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button onClick={addTimeColumn} className="px-4 py-2 border border-cyan-800 hover:border-cyan-500 bg-cyan-950/20 text-cyan-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1">
            <IconPlus className="w-3.5 h-3.5" /> Add Time Column
          </button>
          <button onClick={handleSave} disabled={isPending} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
            {isPending ? 'Publishing...' : 'Save & Publish Live'}
          </button>
        </div>
      </div>

      {/* Inline class row creator */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <IconSchool className="w-3.5 h-3.5 text-cyan-400" /> Add New Class Row
        </h4>
        <form onSubmit={handleCreateClass} className="flex flex-wrap items-center gap-3">
          <select value={newClassSection} onChange={e => setNewClassSection(e.target.value)}
            className="bg-[#06080f] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            <option value="BOYS">Boys Section</option>
            <option value="GIRLS">Girls Section</option>
            <option value="OTHER">Other / General</option>
          </select>
          <input type="text" placeholder="Class name e.g. I.C.S III" value={newClassName}
            onChange={e => setNewClassName(e.target.value)}
            className="flex-1 min-w-[200px] bg-[#06080f] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600"
            required />
          <button type="submit" disabled={isPending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1">
            <IconPlus className="w-3.5 h-3.5" /> Add Class
          </button>
        </form>
      </div>

      {/* Timetable sections */}
      <div className="space-y-10">
        {renderSection('Boys Section',   'BOYS',  boysClasses,  boysRef,  'boys')}
        {renderSection('Girls Section',  'GIRLS', girlsClasses, girlsRef, 'girls')}
        {renderSection('Other Classes',  'OTHER', otherClasses, otherRef, 'other')}
      </div>

      {/* Edit Slot Modal */}
      <AnimatePresence>
        {editingSlot && (
          <div className="fixed inset-0 top-16 pb-24 md:pb-4 md:top-0 z-[99999] flex items-start md:items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1,   opacity: 1, y: 0  }}
              exit={{    scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 w-full max-w-sm max-h-full md:max-h-[90vh] overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/20 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/40 [&::-webkit-scrollbar-thumb]:rounded-full shadow-2xl"
            >
              <h3 className="text-base font-bold text-white mb-1">
                {editingSlot.subject && !editingSlot.teacher?.trim() ? '⚠ Assign Missing Teacher' : 'Edit Timetable Slot'}
              </h3>
              <p className="text-xs text-zinc-500 mb-5 uppercase tracking-wider">
                {editingSlot.section} / {editingSlot.className} - {editingSlot.timeSlot}
              </p>
              <form onSubmit={saveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Subject Name</label>
                  <input type="text" value={editingSlot.subject}
                    onChange={e => setEditingSlot({ ...editingSlot, subject: e.target.value })}
                    placeholder="e.g. Physics"
                    className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Teacher Name</label>
                  <select
                    value={editingSlot.teacher || 'No Teacher assigned yet'}
                    onChange={e => {
                      const selectedTeacher = dbTeachers.find(t => t.name === e.target.value);
                      setEditingSlot({ 
                        ...editingSlot, 
                        teacher: e.target.value, 
                        teacherId: selectedTeacher ? selectedTeacher.id : null 
                      });
                    }}
                    className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer animate-none"
                  >
                    <option value="No Teacher assigned yet">No Teacher assigned yet</option>
                    <optgroup label="Available Active Teachers">
                      {dbTeachers.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Options">
                      <option value="ADD_NEW">Add Teacher first...</option>
                    </optgroup>
                  </select>
                  {editingSlot.teacher === 'ADD_NEW' && (
                    <p className="text-xs text-cyan-400 mt-2 leading-relaxed">
                      To add a new teacher, please go to the{' '}
                      <a href="/admin/teachers" target="_blank" className="underline font-bold hover:text-cyan-300">
                        Manage Teachers
                      </a>{' '}
                      page, add the teacher, then refresh this page to update the list.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditingSlot(null)}
                    className="flex-1 py-2.5 border border-[#1e233d] hover:bg-zinc-900 text-zinc-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit"
                    disabled={editingSlot.teacher === 'ADD_NEW'}
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                    Apply Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
