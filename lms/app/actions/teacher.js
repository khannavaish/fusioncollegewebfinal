'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import {
  classDisplayNameFromSlot,
  getFirstClassSlot,
  getScheduledSlotsForClassSubject,
  resolveTimeSlots,
  sameTimetableText,
  slotMatchesClass,
  teacherNameMatches,
} from '@/utils/timetable';

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

async function getTimetableContext() {
  const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
  const timetableSlots = await prisma.timetableSlot.findMany();
  return {
    timetableSlots,
    timeSlots: resolveTimeSlots(config?.slots),
  };
}

async function canTeacherTakeClassSubject(classSubject, teacher, timetableSlots, timeSlots) {
  const classSubjectSlots = getScheduledSlotsForClassSubject(classSubject, timetableSlots, timeSlots);
  if (classSubjectSlots.length > 0) {
    return classSubjectSlots.some((slot) => teacherNameMatches(slot.teacher, teacher.name));
  }

  return classSubject.teacherId === teacher.id;
}

async function isFirstLectureOfClass(classSubject, teacher, timetableSlots, timeSlots) {
  try {
    const classSlots = timetableSlots.filter((slot) => slotMatchesClass(slot, classSubject.class.name));
    const firstSlot = getFirstClassSlot(classSlots, timeSlots);

    if (firstSlot) {
      return (
        (sameTimetableText(classSubject.class.name, classDisplayNameFromSlot(firstSlot)) ||
          sameTimetableText(classSubject.class.name, firstSlot.className)) &&
        sameTimetableText(classSubject.subject.name, firstSlot.subject) &&
        teacherNameMatches(firstSlot.teacher, teacher.name)
      );
    }

    return classSubject.teacherId === teacher.id;
  } catch (e) {
    console.error('Error in isFirstLectureOfClass:', e);
    return false;
  }
}

export async function markAttendanceOnly(formData) {
  try {
    const teacher = await verifyTeacher();
    const classSubjectId = formData.get('classSubjectId')?.toString();
    const dateStr = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];

    if (!classSubjectId) return { error: 'Class Subject ID is required.' };

    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { class: true, subject: true, teacher: true },
    });
    if (!classSubject) return { error: 'Class subject not found.' };

    const { timetableSlots, timeSlots } = await getTimetableContext();
    const isAllowed = await canTeacherTakeClassSubject(classSubject, teacher, timetableSlots, timeSlots);
    if (!isAllowed) {
      return { error: 'You are not assigned to this timetable slot.' };
    }

    const attendanceMap = {};
    const studentIds = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attendance_')) {
        const studentId = key.replace('attendance_', '');
        attendanceMap[studentId] = value.toString();
        studentIds.push(studentId);
      }
    }

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    const existingLecture = await prisma.lecture.findFirst({
      where: {
        classSubjectId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    let lectureId;
    if (existingLecture) {
      lectureId = existingLecture.id;
      await prisma.attendance.deleteMany({ where: { lectureId } });
    } else {
      const newLecture = await prisma.lecture.create({
        data: {
          date: targetDate,
          topic: 'Pending - lecture notes to be added after class.',
          pictureUrl: '',
          classSubjectId,
        },
      });
      lectureId = newLecture.id;
    }

    if (studentIds.length > 0) {
      await prisma.attendance.createMany({
        data: studentIds.map((studentId) => ({
          lectureId,
          studentId,
          status: attendanceMap[studentId] || 'PRESENT',
        })),
        skipDuplicates: true,
      });
    }

    const isFirstLec = await isFirstLectureOfClass(classSubject, teacher, timetableSlots, timeSlots);

    if (isFirstLec) {
      const presentStudentIds = studentIds.filter((studentId) => {
        const status = attendanceMap[studentId] || 'PRESENT';
        return status === 'PRESENT' || status === 'LATE';
      });

      for (const studentId of presentStudentIds) {
        const priorAttendance = await prisma.attendance.findFirst({
          where: {
            studentId,
            status: { in: ['PRESENT', 'LATE'] },
            lecture: {
              date: { gte: startOfDay, lte: endOfDay },
              id: { not: lectureId },
            },
          },
        });

        const alreadySentToday = await prisma.whatsAppLog.findFirst({
          where: {
            studentId,
            messageType: 'ARRIVAL',
            sentAt: { gte: startOfDay, lte: endOfDay },
            success: true,
          },
        });

        if (!priorAttendance && !alreadySentToday) {
          try {
            const { sendArrivalWhatsApp } = await import('@/app/actions/whatsapp');
            await sendArrivalWhatsApp(studentId);
          } catch (e) {
            console.error('WhatsApp arrival error:', e);
          }
        }
      }
    }

    revalidatePath(`/teacher/classes/${classSubjectId}/attendance`);
    revalidatePath('/teacher');
    revalidatePath('/teacher/attendance');
    return { success: true, lectureId };
  } catch (e) {
    console.error('Error marking attendance:', e);
    return { error: e.message || 'Failed to mark attendance.' };
  }
}

export async function saveLectureNotes(formData) {
  try {
    const teacher = await verifyTeacher();
    const lectureId = formData.get('lectureId')?.toString();
    const topic = formData.get('topic')?.toString().trim();
    const pictureBase64 = formData.get('pictureBase64')?.toString() || '';

    if (!lectureId || !topic) return { error: 'Lecture ID and topic are required.' };

    const lecture = await prisma.lecture.findUnique({
      where: { id: lectureId },
      include: {
        classSubject: {
          include: { class: true, subject: true, teacher: true },
        },
      },
    });
    if (!lecture) return { error: 'Lecture not found.' };

    const { timetableSlots, timeSlots } = await getTimetableContext();
    const isAllowed = await canTeacherTakeClassSubject(lecture.classSubject, teacher, timetableSlots, timeSlots);
    if (!isAllowed) return { error: 'Unauthorized.' };

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

export async function submitAttendanceAndLecture(formData) {
  return markAttendanceOnly(formData);
}

// ==================== Update Teacher Profile ====================
export async function updateTeacherProfile(formData) {
  try {
    const teacher = await verifyTeacher();
    const phone = formData.get('phone')?.toString().trim() || null;
    const qualification = formData.get('qualification')?.toString().trim() || null;

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { phone, qualification },
    });

    revalidatePath('/teacher/profile');
    revalidatePath('/teacher');
    return { success: true };
  } catch (e) {
    console.error('updateTeacherProfile error:', e);
    return { error: e.message || 'Failed to update profile.' };
  }
}

