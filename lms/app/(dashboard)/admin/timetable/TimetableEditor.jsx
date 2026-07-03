'use client';

import { useState, useTransition, useRef } from 'react';
import { saveTimetableSlots } from '@/app/actions/timetable';
import { createClass } from '@/app/actions/admin';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';

export default function TimetableEditor({ initialSlots, dbClasses, initialTimeSlots }) {
  const [slots, setSlots] = useState(initialSlots);
  const [timeSlots, setTimeSlots] = useState(initialTimeSlots);
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const [newClassSection, setNewClassSection] = useState('BOYS');
  const [newClassName, setNewClassName] = useState('');
  const [exporting, setExporting] = useState(false);

  const timetableRef = useRef(null);

  const getSlot = (section, className, timeSlot) => {
    return slots.find(
      (s) =>
        s.section === section &&
        s.className === className &&
        s.timeSlot === timeSlot
    );
  };

  const getSlotKey = (section, className, timeSlot) => {
    return `${section}|${className}|${timeSlot}`;
  };

  // Swapping logic
  const handleTileClick = (section, className, timeSlot) => {
    const clickedKey = getSlotKey(section, className, timeSlot);

    if (selectedSlotKey === null) {
      setSelectedSlotKey(clickedKey);
    } else {
      if (selectedSlotKey === clickedKey) {
        setSelectedSlotKey(null);
        return;
      }

      const [selSection, selClassName, selTimeSlot] = selectedSlotKey.split('|');

      const newSlots = [...slots];
      const slotAIdx = newSlots.findIndex(
        (s) =>
          s.section === selSection &&
          s.className === selClassName &&
          s.timeSlot === selTimeSlot
      );
      const slotBIdx = newSlots.findIndex(
        (s) =>
          s.section === section &&
          s.className === className &&
          s.timeSlot === timeSlot
      );

      const slotA = slotAIdx !== -1 ? newSlots[slotAIdx] : null;
      const slotB = slotBIdx !== -1 ? newSlots[slotBIdx] : null;

      const subjA = slotA ? slotA.subject : '';
      const teachA = slotA ? slotA.teacher : '';
      const subjB = slotB ? slotB.subject : '';
      const teachB = slotB ? slotB.teacher : '';

      if (slotAIdx !== -1) {
        newSlots[slotAIdx] = { ...newSlots[slotAIdx], subject: subjB, teacher: teachB };
      } else {
        newSlots.push({ section: selSection, className: selClassName, timeSlot: selTimeSlot, subject: subjB, teacher: teachB });
      }

      if (slotBIdx !== -1) {
        newSlots[slotBIdx] = { ...newSlots[slotBIdx], subject: subjA, teacher: teachA };
      } else {
        newSlots.push({ section, className, timeSlot, subject: subjA, teacher: teachA });
      }

      setSlots(newSlots);
      setSelectedSlotKey(null);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, section, className, timeSlot) => {
    const key = getSlotKey(section, className, timeSlot);
    e.dataTransfer.setData('text/plain', key);
  };

  const handleDrop = (e, section, className, timeSlot) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/plain');
    if (!sourceKey) return;

    const clickedKey = getSlotKey(section, className, timeSlot);
    if (sourceKey === clickedKey) return;

    const [selSection, selClassName, selTimeSlot] = sourceKey.split('|');

    const newSlots = [...slots];
    const slotAIdx = newSlots.findIndex(
      (s) =>
        s.section === selSection &&
        s.className === selClassName &&
        s.timeSlot === selTimeSlot
    );
    const slotBIdx = newSlots.findIndex(
      (s) =>
        s.section === section &&
        s.className === className &&
        s.timeSlot === timeSlot
    );

    const slotA = slotAIdx !== -1 ? newSlots[slotAIdx] : null;
    const slotB = slotBIdx !== -1 ? newSlots[slotBIdx] : null;

    const subjA = slotA ? slotA.subject : '';
    const teachA = slotA ? slotA.teacher : '';
    const subjB = slotB ? slotB.subject : '';
    const teachB = slotB ? slotB.teacher : '';

    if (slotAIdx !== -1) {
      newSlots[slotAIdx] = { ...newSlots[slotAIdx], subject: subjB, teacher: teachB };
    } else {
      newSlots.push({ section: selSection, className: selClassName, timeSlot: selTimeSlot, subject: subjB, teacher: teachB });
    }

    if (slotBIdx !== -1) {
      newSlots[slotBIdx] = { ...newSlots[slotBIdx], subject: subjA, teacher: teachA };
    } else {
      newSlots.push({ section, className, timeSlot, subject: subjA, teacher: teachA });
    }

    setSlots(newSlots);
  };

  // Add Dynamic Time Column
  const addTimeColumn = () => {
    const ts = prompt("Enter time range (e.g. 11:50-12:30):");
    if (ts) {
      if (timeSlots.includes(ts)) {
        alert("This time slot already exists!");
        return;
      }
      setTimeSlots([...timeSlots, ts]);
    }
  };

  // Delete Dynamic Time Column
  const deleteTimeColumn = (ts) => {
    if (confirm(`Delete the column for "${ts}"? All entries in this time slot will be removed.`)) {
      setTimeSlots(timeSlots.filter((t) => t !== ts));
      setSlots(slots.filter((s) => s.timeSlot !== ts));
    }
  };

  // Edit Dynamic Time Column
  const editTimeColumn = (oldTs) => {
    const newTs = prompt("Edit time slot:", oldTs);
    if (newTs && newTs !== oldTs) {
      if (timeSlots.includes(newTs)) {
        alert("This time slot already exists!");
        return;
      }
      setTimeSlots(timeSlots.map((t) => (t === oldTs ? newTs : t)));
      setSlots(slots.map((s) => (s.timeSlot === oldTs ? { ...s, timeSlot: newTs } : s)));
    }
  };

  // Inline Class Row Creation
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
        alert(`Class "${fullName}" created successfully! A new row has been added below.`);
        // Note: page.js will automatically revalidate classes and push down updated dbClasses.
      }
    });
  };

  // Export timetable grid to image
  const exportAsImage = async () => {
    if (!timetableRef.current) return;
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200)); // Smooth wait for browser paint
      const dataUrl = await toPng(timetableRef.current, {
        backgroundColor: '#07080f',
        style: {
          padding: '24px',
          borderRadius: '12px',
        }
      });
      const link = document.createElement('a');
      link.download = `Fusion_College_Timetable_Editor_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setExporting(false);
    }
  };

  // Save config slots
  const handleSave = () => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await saveTimetableSlots(slots, timeSlots);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    });
  };

  const openEditModal = (e, section, className, timeSlot) => {
    e.stopPropagation();
    const slot = getSlot(section, className, timeSlot) || {
      section,
      className,
      timeSlot,
      subject: '',
      teacher: '',
    };
    setEditingSlot(slot);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!editingSlot) return;

    const newSlots = [...slots];
    const idx = newSlots.findIndex(
      (s) =>
        s.section === editingSlot.section &&
        s.className === editingSlot.className &&
        s.timeSlot === editingSlot.timeSlot
    );

    if (idx !== -1) {
      newSlots[idx] = { ...editingSlot };
    } else {
      newSlots.push({ ...editingSlot });
    }

    setSlots(newSlots);
    setEditingSlot(null);
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
                  <th key={ts} className="px-3 py-3 w-40 border-r border-[#1e233d] last:border-r-0 relative group">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{ts}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button
                          type="button"
                          onClick={() => editTimeColumn(ts)}
                          className="p-0.5 hover:bg-[#2b3052] rounded text-cyan-400 cursor-pointer"
                          title="Edit slot time"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTimeColumn(ts)}
                          className="p-0.5 hover:bg-red-950 rounded text-red-400 cursor-pointer"
                          title="Delete column"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e233d]">
              {classesList.map((cls) => (
                <tr key={cls.id} className="hover:bg-[#16192b]/10 transition-colors">
                  <td className="px-4 py-4 text-xs font-bold text-white text-left bg-[#16192b]/20 border-r border-[#1e233d]">
                    {cls.displayName}
                  </td>
                  {timeSlots.map((ts) => {
                    const slot = getSlot(sectionCode, cls.displayName, ts);
                    const isSelected = selectedSlotKey === getSlotKey(sectionCode, cls.displayName, ts);

                    // Dynamic colors based on subject
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
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, sectionCode, cls.displayName, ts)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, sectionCode, cls.displayName, ts)}
                        onClick={() => handleTileClick(sectionCode, cls.displayName, ts)}
                        className={`p-1.5 border-r border-[#1e233d] last:border-r-0 cursor-grab relative transition-all group ${
                          isSelected
                            ? 'bg-cyan-950/40 ring-2 ring-cyan-500 shadow-lg shadow-cyan-900/30 scale-95'
                            : 'hover:bg-[#16192b]/30'
                        }`}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 350, damping: 15 }}
                          className={`min-h-12 flex flex-col justify-center items-center rounded-lg p-1.5 border bg-gradient-to-br transition-all relative ${
                            isSelected ? 'border-cyan-400' : 'border-[#1e233d]'
                          } ${colorClass}`}
                        >
                          <span className="text-[11px] font-bold select-none">{slot?.subject || '—'}</span>
                          <span className="text-[9px] opacity-75 mt-0.5 select-none">{slot?.teacher || '—'}</span>

                          <button
                            type="button"
                            onClick={(e) => openEditModal(e, sectionCode, cls.displayName, ts)}
                            className="absolute right-1 top-1 p-0.5 bg-[#16192b] border border-[#2b3052] rounded opacity-0 group-hover:opacity-100 transition-opacity hover:border-cyan-500 cursor-pointer"
                          >
                            <svg className="w-2.5 h-2.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4Z" />
                            </svg>
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
    );
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" />
          College Timetable and config columns updated successfully!
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-400">
          <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Editor controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
        <div className="text-xs text-zinc-400 max-w-sm">
          🎮 <span className="font-bold text-white">Interactive Editor Mode:</span> 
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Sequentially click two tiles to swap subjects and teachers.</li>
            <li>Drag & drop tiles directly to reschedule.</li>
            <li>Use the header tools to add/edit/delete dynamic time columns.</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={addTimeColumn}
            className="px-4 py-2 border border-cyan-800 hover:border-cyan-500 bg-cyan-950/20 text-cyan-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            ➕ Add Time Column
          </button>
          <button
            onClick={exportAsImage}
            disabled={exporting}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            {exporting ? 'Creating Image...' : '📸 Export PNG'}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isPending ? 'Publishing Changes...' : 'Save & Publish Live'}
          </button>
        </div>
      </div>

      {/* Dynamic Class Creator (Rows) */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Add Dynamic Row (Create Class)</h4>
        <form onSubmit={handleCreateClass} className="flex flex-wrap items-center gap-3">
          <select 
            value={newClassSection} 
            onChange={(e) => setNewClassSection(e.target.value)}
            className="bg-[#06080f] border border-[#1e233d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="BOYS">Boys Section</option>
            <option value="GIRLS">Girls Section</option>
            <option value="OTHER">Other/General</option>
          </select>
          <input 
            type="text" 
            placeholder="e.g. I.C.S III or Medical II" 
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="flex-1 min-w-[200px] bg-[#06080f] border border-[#1e233d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-600"
            required
          />
          <button 
            type="submit" 
            disabled={isPending}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isPending ? 'Creating...' : '➕ Add Class Row'}
          </button>
        </form>
      </div>

      {/* Main Grid View */}
      <div ref={timetableRef} className="space-y-8 bg-[#07080f]/50 p-2 rounded-2xl">
        <div className="hidden exporting-header mb-4 text-center">
          <h2 className="text-xl font-bold text-white">Fusion College LMS Portal</h2>
          <p className="text-xs text-zinc-400 mt-1">Official Master Timetable Editor</p>
        </div>

        {renderSection('Boys Section', 'BOYS', boysClasses)}
        {renderSection('Girls Section', 'GIRLS', girlsClasses)}
        {renderSection('Other Classes', 'OTHER', otherClasses)}
      </div>

      {/* Edit Dialog Popover */}
      <AnimatePresence>
        {editingSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white mb-1">Edit Timetable Slot</h3>
              <p className="text-[10px] text-zinc-500 mb-4 uppercase tracking-wider">
                {editingSlot.section} / {editingSlot.className} — {editingSlot.timeSlot}
              </p>

              <form onSubmit={saveEdit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Subject Name</label>
                  <input
                    type="text"
                    value={editingSlot.subject}
                    onChange={(e) => setEditingSlot({ ...editingSlot, subject: e.target.value })}
                    placeholder="e.g. Physics"
                    className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Teacher Name</label>
                  <input
                    type="text"
                    value={editingSlot.teacher}
                    onChange={(e) => setEditingSlot({ ...editingSlot, teacher: e.target.value })}
                    placeholder="e.g. Sir Asif"
                    className="w-full bg-[#0a0c14] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 py-2 border border-[#1e233d] hover:bg-zinc-950 text-zinc-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Apply changes
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
