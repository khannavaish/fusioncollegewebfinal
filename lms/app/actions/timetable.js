'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import { sortSlotsByTime } from '@/utils/timetable';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('Forbidden');
  return user;
}

export async function saveTimetableSlots(slots, timeSlots) {
  try {
    await verifyAdmin();

    if (!Array.isArray(slots)) {
      return { error: 'Invalid slots format.' };
    }

    // Fetch all teachers to map names to IDs
    const teachers = await prisma.teacher.findMany({
      select: { id: true, name: true },
    });

    const teacherNameToId = new Map();
    teachers.forEach((teacher) => {
      teacherNameToId.set(teacher.name.toLowerCase(), teacher.id);
    });

    const cleanSlots = slots.map((slot) => {
      const teacherName = slot.teacher?.toString() || '';
      // Prefer explicit teacherId passed from client, fallback to name-lookup
      const teacherId = slot.teacherId || (teacherName ? teacherNameToId.get(teacherName.toLowerCase()) : null) || null;
      
      return {
        section: slot.section?.toString() || 'BOYS',
        className: slot.className?.toString() || '',
        timeSlot: slot.timeSlot?.toString() || '',
        subject: slot.subject?.toString() || '',
        teacher: teacherName,
        teacherId: teacherId,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.timetableSlot.deleteMany();

      if (cleanSlots.length > 0) {
        await tx.timetableSlot.createMany({
          data: cleanSlots,
        });
      }

      if (Array.isArray(timeSlots)) {
        await tx.timetableConfig.upsert({
          where: { id: 'default' },
          update: { slots: timeSlots },
          create: { id: 'default', slots: timeSlots },
        });
      }

      // ── Auto-assign Class Incharge ────────────────────────────────────────
      // For each class, find the first non-empty period and assign its teacher
      // as the Class Incharge so they can take attendance.
      const allClasses = await tx.class.findMany({ select: { id: true, name: true } });
      
      for (const cls of allClasses) {
        // Filter slots for this specific class
        const thisClassSlots = cleanSlots.filter(s => {
          if (!s.teacherId || !s.subject?.trim()) return false;
          const sectionStr = (s.section || '').trim().toUpperCase();
          const constructedName = sectionStr === 'OTHER' || !sectionStr 
            ? s.className.trim() 
            : `${sectionStr} ${s.className.trim()}`;
          return constructedName.toUpperCase() === cls.name.toUpperCase();
        });

        // Sort them chronologically by time so we get the true first period of the day
        const sortedClassSlots = sortSlotsByTime(thisClassSlots, timeSlots);
        const firstSlotWithTeacher = sortedClassSlots[0];
        
        await tx.class.update({
          where: { id: cls.id },
          data: { inchargeTeacherId: firstSlotWithTeacher?.teacherId || null },
        });
      }

      // ── Auto-sync ClassSubject (Teacher Management) ───────────────────────
      const allSubjects = await tx.subject.findMany();
      const subjectNameToId = new Map(allSubjects.map(s => [s.name.toLowerCase(), s.id]));

      for (const slot of cleanSlots) {
        if (!slot.className || !slot.subject?.trim() || !slot.teacherId) continue;
        
        // TimetableSlot stores section ("BOYS") and className ("Medical") separately.
        // Class table stores name as "BOYS Medical". We need to reconstruct it to match.
        const sectionStr = (slot.section || '').trim().toUpperCase();
        const constructedName = sectionStr === 'OTHER' || !sectionStr 
          ? slot.className.trim() 
          : `${sectionStr} ${slot.className.trim()}`;
          
        const cls = allClasses.find(c => c.name.toUpperCase() === constructedName.toUpperCase());
        if (!cls) continue;

        let subjId = subjectNameToId.get(slot.subject.trim().toLowerCase());
        if (!subjId) {
          const newSubj = await tx.subject.create({ data: { name: slot.subject.trim() } });
          subjId = newSubj.id;
          subjectNameToId.set(newSubj.name.toLowerCase(), subjId);
        }

        await tx.classSubject.upsert({
          where: { classId_subjectId: { classId: cls.id, subjectId: subjId } },
          update: { teacherId: slot.teacherId },
          create: { classId: cls.id, subjectId: subjId, teacherId: slot.teacherId },
        });
      }
    });

    revalidatePath('/admin/timetable');
    revalidatePath('/admin/classes');
    revalidatePath('/timetable');
    revalidatePath('/teacher');
    revalidatePath('/teacher/classes');
    revalidatePath('/teacher/attendance');

    return { success: true };
  } catch (e) {
    console.error('Error saving timetable:', e);
    return { error: e.message || 'Failed to save timetable.' };
  }
}
