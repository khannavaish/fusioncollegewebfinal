'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

async function verifyTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: { teacher: true },
  });
  if (!dbUser || dbUser.role !== 'TEACHER' || !dbUser.teacher) throw new Error('Forbidden');
  return dbUser.teacher;
}

// ─── STEP 1: Mark Attendance Only (start of class) ───────────────────────────
export async function markAttendanceOnly(formData) {
  try {
    const teacher = await verifyTeacher();
    const classSubjectId = formData.get('classSubjectId')?.toString();
    const dateStr = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];

    if (!classSubjectId) return { error: 'Class Subject ID is required.' };

    const classSubject = await prisma.classSubject.findUnique({ where: { id: classSubjectId } });
    if (!classSubject || classSubject.teacherId !== teacher.id) {
      return { error: 'You are not assigned to this class subject.' };
    }

    const attendanceMap = {};
    const studentIds = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attendance_')) {
        const sid = key.replace('attendance_', '');
        attendanceMap[sid] = value.toString();
        studentIds.push(sid);
      }
    }

    // Check if a lecture already exists today for this class subject
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    let existingLecture = await prisma.lecture.findFirst({
      where: {
        classSubjectId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    let lectureId;
    if (existingLecture) {
      // Update existing attendance rather than creating a duplicate lecture
      lectureId = existingLecture.id;
      // Delete old attendance for this lecture to re-mark
      await prisma.attendance.deleteMany({ where: { lectureId } });
    } else {
      // Create a new lecture with pending topic
      const newLecture = await prisma.lecture.create({
        data: {
          date: targetDate,
          topic: 'Pending — lecture notes to be added after class.',
          pictureUrl: '',
          classSubjectId,
        },
      });
      lectureId = newLecture.id;
    }

    // Save attendance
    if (studentIds.length > 0) {
      await prisma.attendance.createMany({
        data: studentIds.map(sid => ({
          lectureId,
          studentId: sid,
          status: attendanceMap[sid] || 'PRESENT',
        })),
        skipDuplicates: true,
      });
    }

    // Check if this is the FIRST lecture marked today for each PRESENT student
    // and trigger WhatsApp arrival message if enabled
    const presentStudentIds = studentIds.filter(sid => attendanceMap[sid] === 'PRESENT' || attendanceMap[sid] === 'LATE');
    for (const sid of presentStudentIds) {
      // Check if any OTHER lecture today already exists for this student (meaning they already got the arrival message)
      const priorAttendance = await prisma.attendance.findFirst({
        where: {
          studentId: sid,
          status: { in: ['PRESENT', 'LATE'] },
          lecture: {
            date: { gte: startOfDay, lte: endOfDay },
            id: { not: lectureId },
          },
        },
      });

      if (!priorAttendance) {
        // First class today for this student — send WhatsApp arrival
        try {
          const { sendArrivalWhatsApp } = await import('@/app/actions/whatsapp');
          await sendArrivalWhatsApp(sid);
        } catch (e) {
          console.error('WhatsApp arrival error:', e);
        }
      }
    }

    revalidatePath(`/teacher/classes/${classSubjectId}/attendance`);
    return { success: true, lectureId };
  } catch (e) {
    console.error('Error marking attendance:', e);
    return { error: e.message || 'Failed to mark attendance.' };
  }
}

// ─── STEP 2: Save Lecture Notes (post-class) ──────────────────────────────────
export async function saveLectureNotes(formData) {
  try {
    const teacher = await verifyTeacher();
    const lectureId = formData.get('lectureId')?.toString();
    const topic = formData.get('topic')?.toString().trim();
    const pictureBase64 = formData.get('pictureBase64')?.toString() || '';

    if (!lectureId || !topic) return { error: 'Lecture ID and topic are required.' };

    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { classSubject: true },
    });
    if (!lecture) return { error: 'Lecture not found.' };
    if (lecture.classSubject.teacherId !== teacher.id) return { error: 'Unauthorized.' };

    await prisma.lecture.update({
      where: { id: lectureId },
      data: { topic, pictureUrl: pictureBase64 },
    });

    revalidatePath(`/teacher/classes/${lecture.classSubjectId}/attendance`);
    return { success: true };
  } catch (e) {
    console.error('Error saving lecture notes:', e);
    return { error: e.message || 'Failed to save lecture notes.' };
  }
}

// ─── LEGACY: Combined (kept for backward compat) ──────────────────────────────
export async function submitAttendanceAndLecture(formData) {
  return markAttendanceOnly(formData);
}
