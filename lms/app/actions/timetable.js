'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

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

    // Clean data map
    const cleanSlots = slots.map((s) => ({
      section: s.section?.toString() || 'BOYS',
      className: s.className?.toString() || '',
      timeSlot: s.timeSlot?.toString() || '',
      subject: s.subject?.toString() || '',
      teacher: s.teacher?.toString() || '',
    }));

    await prisma.$transaction(async (tx) => {
      // 1. Wipe out existing timetable configuration
      await tx.timetableSlot.deleteMany();

      // 2. Insert new slots configuration
      if (cleanSlots.length > 0) {
        await tx.timetableSlot.createMany({
          data: cleanSlots,
        });
      }

      // 3. Save columns config
      if (Array.isArray(timeSlots)) {
        await tx.timetableConfig.upsert({
          where: { id: 'default' },
          update: { slots: timeSlots },
          create: { id: 'default', slots: timeSlots },
        });
      }
    });

    // ── Auto-assign class incharge based on first timetable slot ──────────────
    // Compute the first slot for each (section, className) group and update
    // ClassSubject.teacherId so the first-slot teacher becomes class incharge.
    try {
      await syncClassInchargeFromTimetable(
        cleanSlots,
        Array.isArray(timeSlots) ? timeSlots : []
      );
    } catch (syncErr) {
      // Non-fatal: incharge sync failure should never block the save
      console.error('Auto-incharge sync error (non-fatal):', syncErr);
    }

    revalidatePath('/admin/timetable');
    revalidatePath('/admin/classes');
    revalidatePath('/timetable');
    revalidatePath('/teacher');
    return { success: true };
  } catch (e) {
    console.error('Error saving timetable:', e);
    return { error: e.message || 'Failed to save timetable.' };
  }
}

/**
 * Normalise a name for loose matching:
 *   - trim, lowercase, collapse whitespace
 *   - strip common honorifics: sir / mr / mrs / ms / dr
 */
function normalizeName(name = '') {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(sir|mr|mrs|ms|dr)\s+/, '');
}

/**
 * After saving the timetable, look at the FIRST non-break slot for each class
 * (ordered by the saved timeSlots column order) and update that class's
 * ClassSubject record so its teacherId points to the first-slot teacher.
 *
 * This ensures:
 *   1. When the admin changes who teaches the first lecture → incharge updates.
 *   2. For newly added classes, as soon as a slot is assigned the incharge is set.
 */
async function syncClassInchargeFromTimetable(cleanSlots, timeSlots) {
  if (!cleanSlots.length) return;

  // Build rank map from the ordered timeSlots array so we can find "first" slot
  const rankMap = new Map(
    timeSlots.map((ts, idx) => [ts.trim().toLowerCase(), idx])
  );
  const rank = (ts) => {
    const key = (ts || '').trim().toLowerCase();
    return rankMap.has(key) ? rankMap.get(key) : Number.MAX_SAFE_INTEGER;
  };

  // Group slots by (section|className)
  const classGroups = new Map();
  for (const slot of cleanSlots) {
    if (!slot.className || !slot.timeSlot) continue;
    const key = `${slot.section}|${slot.className}`;
    if (!classGroups.has(key)) classGroups.set(key, []);
    classGroups.get(key).push(slot);
  }

  if (classGroups.size === 0) return;

  // Load all DB classes with their ClassSubject entries
  const dbClasses = await prisma.class.findMany({
    include: {
      subjects: {
        include: { subject: true, teacher: true },
      },
    },
  });

  // Load all teachers for name-matching
  const dbTeachers = await prisma.teacher.findMany({
    select: { id: true, name: true },
  });

  for (const [key, groupSlots] of classGroups) {
    const [section, className] = key.split('|');

    // Sort by time order; take the first slot that has both subject AND teacher filled
    const sorted = [...groupSlots].sort((a, b) => rank(a.timeSlot) - rank(b.timeSlot));
    const firstSlot = sorted.find((s) => s.subject?.trim() && s.teacher?.trim());
    if (!firstSlot) continue;

    // Reconstruct the full class name as stored in DB
    const sectionUpper = (section || '').toUpperCase();
    const fullClassName = (sectionUpper === 'OTHER' || !sectionUpper)
      ? className
      : `${sectionUpper} ${className}`;

    // Find matching DB Class (case-insensitive, whitespace-collapsed)
    const normalizedFull = fullClassName.toLowerCase().replace(/\s+/g, ' ').trim();
    const dbClass = dbClasses.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedFull
    );
    if (!dbClass) continue;

    // Find the ClassSubject for the first slot's subject
    const dbClassSubject = dbClass.subjects.find(
      (cs) => normalizeName(cs.subject.name) === normalizeName(firstSlot.subject)
    );
    if (!dbClassSubject) continue;

    // Find the Teacher whose name matches the first slot's teacher name
    const slotTeacherNorm = normalizeName(firstSlot.teacher);
    const matchedTeacher = dbTeachers.find(
      (t) => normalizeName(t.name) === slotTeacherNorm
    );
    if (!matchedTeacher) continue;

    // Only update if something actually changed
    if (dbClassSubject.teacherId === matchedTeacher.id) continue;

    await prisma.classSubject.update({
      where: { id: dbClassSubject.id },
      data: { teacherId: matchedTeacher.id },
    });
  }
}
