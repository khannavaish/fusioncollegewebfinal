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

export async function saveTimetableSlots(slots) {
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
    });

    revalidatePath('/admin/timetable');
    revalidatePath('/timetable');
    return { success: true };
  } catch (e) {
    console.error('Error saving timetable:', e);
    return { error: e.message || 'Failed to save timetable.' };
  }
}
