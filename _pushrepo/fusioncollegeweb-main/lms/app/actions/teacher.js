'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

function splitTimetableClassName(name = '') {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('BOYS ')) return { section: 'BOYS', className: trimmed.replace(/^boys\s+/i, '') };
  if (upper.startsWith('GIRLS ')) return { section: 'GIRLS', className: trimmed.replace(/^girls\s+/i, '') };
  if (upper.startsWith('OTHER ')) return { section: 'OTHER', className: trimmed.replace(/^other\s+/i, '') };
  return { section: 'OTHER', className: trimmed };
}

function sameText(a = '', b = '') {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

async function isFirstLectureOfClass(classSubjectId, dateStr) {
  try {
    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        class: true,
        subject: true,
        teacher: true,
      },
    });
    if (!classSubject) return false;

    const { section, className } = splitTimetableClassName(classSubject.class.name);
    const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
    const timeSlots = Array.isArray(config?.slots) ? config.slots : [];

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    const dbSlots = await prisma.timetableSlot.findMany({
      where: { section, className },
    });

    if (dbSlots.length > 0 && timeSlots.length > 0) {
      let firstSlot = null;
      for (const ts of timeSlots) {
        const slot = dbSlots.find(s => s.timeSlot === ts && s.subject?.trim() && s.teacher?.trim());
        if (slot) {
          firstSlot = slot;
          break;
        }
      }

      if (!firstSlot) return false;

      return (
        sameText(classSubject.subject.name, firstSlot.subject) &&
        sameText(classSubject.teacher.name, firstSlot.teacher)
      );
    }

    const priorLectures = await prisma.lecture.findFirst({
      where: {
        classSubject: { classId: classSubject.classId },
        date: { gte: startOfDay, lte: endOfDay },
        classSubjectId: { not: classSubjectId },
      },
    });
    return !priorLectures;
  } catch (e) {
    console.error('Error in isFirstLectureOfClass:', e);
    return false;
  }
}
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

// â”€â”€â”€ STEP 1: Mark Attendance Only (start of class) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          topic: 'Pending â€” lecture notes to be added after class.',
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

    // Check if this is the FIRST lecture of the class for today (from timetable or first created today)
    const isFirstLec = await isFirstLectureOfClass(classSubjectId, dateStr);

    if (isFirstLec) {
      const presentStudentIds = studentIds.filter(sid => attendanceMap[sid] === 'PRESENT' || attendanceMap[sid] === 'LATE');
      for (const sid of presentStudentIds) {
        // Double check they haven't somehow gotten an arrival message today already
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

        const alreadySentToday = await prisma.whatsAppLog.findFirst({
          where: {
            studentId: sid,
            messageType: 'ARRIVAL',
            sentAt: { gte: startOfDay, lte: endOfDay },
            success: true,
          },
        });

        if (!priorAttendance && !alreadySentToday) {
          try {
            const { sendArrivalWhatsApp } = await import('@/app/actions/whatsapp');
            await sendArrivalWhatsApp(sid);
          } catch (e) {
            console.error('WhatsApp arrival error:', e);
          }
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

// â”€â”€â”€ STEP 2: Save Lecture Notes (post-class) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ LEGACY: Combined (kept for backward compat) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function submitAttendanceAndLecture(formData) {
  return markAttendanceOnly(formData);
}


