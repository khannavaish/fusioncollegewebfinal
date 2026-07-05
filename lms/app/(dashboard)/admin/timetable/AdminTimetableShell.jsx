'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TimetableClientView from '../../timetable/TimetableClientView';
import TimetableEditor from './TimetableEditor';
import { IconEdit, IconXCircle } from '@/app/components/icons';

export default function AdminTimetableShell({ initialSlots, dbClasses, initialTimeSlots, dbTeachers }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-[#1e233d] bg-[#0d0f1a] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">Locked View</div>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            The published timetable is read-only here. Use edit mode when you need to change periods, teachers, or classes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-cyan-500"
        >
          <IconEdit className="h-4 w-4" />
          Edit Timetable
        </button>
      </div>

      <TimetableClientView
        initialSlots={initialSlots}
        dbClasses={dbClasses}
        initialTimeSlots={initialTimeSlots}
        role="ADMIN"
        studentClassName=""
        teacherName=""
      />

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 bg-black/80 p-3 backdrop-blur-sm md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#090b11] shadow-2xl shadow-cyan-950/30"
            >
              <div className="flex items-center justify-between border-b border-[#1e233d] bg-[#0d0f1a] px-5 py-4">
                <div>
                  <h2 className="text-base font-black tracking-tight text-white">Edit Published Timetable</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Changes stay inside this window until you save and publish.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-[#2b3052] bg-[#16192b] p-2 text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-300"
                  aria-label="Close editor"
                >
                  <IconXCircle className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-5">
                <TimetableEditor
                  initialSlots={initialSlots}
                  dbClasses={dbClasses}
                  initialTimeSlots={initialTimeSlots}
                  dbTeachers={dbTeachers}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
