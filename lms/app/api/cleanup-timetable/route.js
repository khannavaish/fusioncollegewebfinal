import { NextResponse } from 'next/server';
import prisma from '@/utils/db';

// ONE-TIME cleanup route. Call GET /api/cleanup-timetable once then remove this file.
export async function GET(req) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'fusion-cleanup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teachers = await prisma.teacher.findMany({ select: { id: true, name: true } });
    const validIds = new Set(teachers.map(t => t.id));
    const nameToId = new Map(teachers.map(t => [t.name.toLowerCase(), t.id]));
    const slots = await prisma.timetableSlot.findMany();

    let cleaned = 0, relinked = 0;

    for (const slot of slots) {
      const teacherName = slot.teacher?.trim() || '';

      // Ghost teacherId (teacher deleted) → blank it
      if (slot.teacherId && !validIds.has(slot.teacherId)) {
        await prisma.timetableSlot.update({
          where: { id: slot.id },
          data: { teacher: '', teacherId: null }
        });
        cleaned++;
      }
      // Teacher name exists but no link → try to re-link
      else if (teacherName && !slot.teacherId) {
        const matchedId = nameToId.get(teacherName.toLowerCase());
        if (matchedId) {
          await prisma.timetableSlot.update({
            where: { id: slot.id },
            data: { teacherId: matchedId }
          });
          relinked++;
        } else {
          // Unrecognized teacher name → clear it
          await prisma.timetableSlot.update({
            where: { id: slot.id },
            data: { teacher: '', teacherId: null }
          });
          cleaned++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned ${cleaned} ghost slots, re-linked ${relinked} slots.`,
      cleaned,
      relinked,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
