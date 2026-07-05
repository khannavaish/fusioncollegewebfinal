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

    const cleanSlots = slots.map((slot) => ({
      section: slot.section?.toString() || 'BOYS',
      className: slot.className?.toString() || '',
      timeSlot: slot.timeSlot?.toString() || '',
      subject: slot.subject?.toString() || '',
      teacher: slot.teacher?.toString() || '',
    }));

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
