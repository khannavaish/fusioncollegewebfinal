'use client';

import { useState, useTransition } from 'react';
import { saveTimetableSlots } from '@/app/actions/timetable';
import { IconCheckCircle, IconAlertTriangle } from '@/app/components/icons';

const timeSlots = [
  '7:30-8:10',
  '8:10-8:50',
  '8:50-9:30',
  '9:30-9:50', // Break
  '9:50-10:30',
  '10:30-11:10',
  '11:10-11:50',
];

const defaultSeed = [
  // Boys Medical
  { section: 'BOYS', className: 'Medical', timeSlot: '7:30-8:10', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'BOYS', className: 'Medical', timeSlot: '8:10-8:50', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'Medical', timeSlot: '8:50-9:30', subject: 'Biology', teacher: 'Sir Abrar' },
  { section: 'BOYS', className: 'Medical', timeSlot: '9:50-10:30', subject: 'Chemistry', teacher: 'Sir Tahir' },
  { section: 'BOYS', className: 'Medical', timeSlot: '10:30-11:10', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'BOYS', className: 'Medical', timeSlot: '11:10-11:50', subject: 'Islamiat', teacher: 'Sir Akhtar' },

  // Boys I.C.S I
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '7:30-8:10', subject: 'Computer', teacher: 'Sir Faizan' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '8:10-8:50', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '8:50-9:30', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '9:50-10:30', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '10:30-11:10', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '11:10-11:50', subject: 'Urdu', teacher: 'Sir Naeem' },

  // Boys I.C.S II
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '7:30-8:10', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '8:10-8:50', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '8:50-9:30', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '9:50-10:30', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '10:30-11:10', subject: 'Computer', teacher: 'Sir Nawaish' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '11:10-11:50', subject: 'Physics', teacher: 'Sir Shafique' },

  // Girls Medical
  { section: 'GIRLS', className: 'Medical', timeSlot: '7:30-8:10', subject: 'Biology', teacher: 'Sir Abrar' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '8:10-8:50', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '8:50-9:30', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '9:50-10:30', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '10:30-11:10', subject: 'English', teacher: 'Sir Shams' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '11:10-11:50', subject: 'Chemistry', teacher: 'Sir Tahir' },

  // Girls I.C.S
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '7:30-8:10', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '8:10-8:50', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '8:50-9:30', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '9:50-10:30', subject: 'Computer', teacher: 'Mam Sania' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '10:30-11:10', subject: 'Physics', teacher: 'Sir Shafique' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '11:10-11:50', subject: 'English', teacher: 'Sir Shams' },
];

export default function TimetableEditor({ initialSlots }) {
  const [slots, setSlots] = useState(
    initialSlots.length > 0 ? initialSlots : defaultSeed
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

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

  // Click-to-swap logic
  const handleTileClick = (section, className, timeSlot) => {
    const clickedKey = getSlotKey(section, className, timeSlot);

    if (selectedSlotKey === null) {
      setSelectedSlotKey(clickedKey);
    } else {
      if (selectedSlotKey === clickedKey) {
        setSelectedSlotKey(null);
        return;
      }

      // Perform SWAP
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

      // Extract details
      const slotA = slotAIdx !== -1 ? newSlots[slotAIdx] : null;
      const slotB = slotBIdx !== -1 ? newSlots[slotBIdx] : null;

      // Swap subject/teacher contents
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

  // Open edit modal/dialog
  const openEditModal = (e, section, className, timeSlot) => {
    e.stopPropagation(); // Avoid triggering click swap
    const slot = getSlot(section, className, timeSlot) || {
      section,
      className,
      timeSlot,
      subject: '',
      teacher: '',
    };
    setEditingSlot(slot);
  };

  // Apply inline edit
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

  // Save timetable state to PostgreSQL
  const handleSave = () => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await saveTimetableSlots(slots);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    });
  };

  // Reset to default attachment seeds
  const handleReset = () => {
    if (confirm('Are you sure you want to reset the timetable to the default college configuration?')) {
      setSlots(defaultSeed);
    }
  };

  const renderSection = (sectionTitle, sectionCode, classes) => {
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
                    {ts === '9:30-9:50' ? 'Break Time' : ts}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e233d]">
              {classes.map((clsName) => (
                <tr key={clsName} className="hover:bg-[#16192b]/10 transition-colors">
                  <td className="px-4 py-4 text-xs font-bold text-white text-left bg-[#16192b]/20">
                    {clsName}
                  </td>
                  {timeSlots.map((ts) => {
                    if (ts === '9:30-9:50') {
                      return (
                        <td key={ts} className="px-2 py-4 bg-[#16192b]/30 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-r border-[#1e233d] select-none">
                          B R E A K
                        </td>
                      );
                    }

                    const slot = getSlot(sectionCode, clsName, ts);
                    const isSelected = selectedSlotKey === getSlotKey(sectionCode, clsName, ts);

                    return (
                      <td
                        key={ts}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, sectionCode, clsName, ts)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, sectionCode, clsName, ts)}
                        onClick={() => handleTileClick(sectionCode, clsName, ts)}
                        className={`p-1.5 border-r border-[#1e233d] last:border-r-0 cursor-grab relative transition-all group ${
                          isSelected
                            ? 'bg-cyan-950/40 ring-2 ring-cyan-500 shadow-lg shadow-cyan-900/30'
                            : 'hover:bg-[#16192b]/30'
                        }`}
                      >
                        <div className="min-h-12 flex flex-col justify-center items-center rounded-lg p-1.5 border border-[#1e233d] bg-black/30 group-hover:border-[#2b3052] transition-colors relative">
                          <span className="text-[11px] font-bold text-zinc-100">{slot?.subject || '—'}</span>
                          <span className="text-[9px] text-zinc-400 mt-0.5">{slot?.teacher || '—'}</span>
                          
                          {/* Inline Edit Trigger */}
                          <button
                            type="button"
                            onClick={(e) => openEditModal(e, sectionCode, clsName, ts)}
                            className="absolute right-1 top-1 p-0.5 bg-[#16192b] border border-[#2b3052] rounded opacity-0 group-hover:opacity-100 transition-opacity hover:border-cyan-500"
                          >
                            <svg className="w-2.5 h-2.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        </div>
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
      {/* Alert states */}
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
          <IconCheckCircle className="w-4 h-4 flex-shrink-0" />
          College Timetable updated successfully! Changes are now live.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-400">
          <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-3 bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4">
        <div className="text-xs text-zinc-400 max-w-md">
          💡 <span className="font-bold text-white">How to Adjust:</span> Click any two tiles sequentially to swap their slots, or drag and drop a tile over another. Click the edit icon to change subject/teacher name.
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-950 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Reset to Default Seed
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isPending ? 'Saving timetable...' : 'Save & Publish Live'}
          </button>
        </div>
      </div>

      {renderSection('Boys', 'BOYS', ['Medical', 'I.C.S I', 'I.C.S II'])}
      {renderSection('Girls', 'GIRLS', ['Medical', 'I.C.S'])}

      {/* Edit Popover Dialog */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 w-full max-w-sm shadow-2xl">
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
          </div>
        </div>
      )}
    </div>
  );
}
