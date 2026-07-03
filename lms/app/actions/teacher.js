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

export async function submitAttendanceAndLecture(formData) {
  try {
    const teacher = await verifyTeacher();
    const classSubjectId = formData.get('classSubjectId')?.toString();
    const dateStr = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
    const topic = formData.get('topic')?.toString().trim();
    const pictureBase64 = formData.get('pictureBase64')?.toString() || '';

    if (!classSubjectId || !topic) {
      return { error: 'Class Subject ID and What was taught are required.' };
    }

    // Verify this class subject belongs to this teacher
    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });
    if (!classSubject || classSubject.teacherId !== teacher.id) {
      return { error: 'You are not assigned to this class subject.' };
    }

    // Parse attendance statuses for students
    const attendanceMap = {};
    const studentIds = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attendance_')) {
        const studentId = key.replace('attendance_', '');
        attendanceMap[studentId] = value.toString();
        studentIds.push(studentId);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create the lecture log
      const lecture = await tx.lecture.create({
        data: {
          date: new Date(dateStr),
          topic,
          pictureUrl: pictureBase64,
          classSubjectId,
        },
      });

      // 2. Create attendance entries
      if (studentIds.length > 0) {
        const attendanceData = studentIds.map((sid) => ({
          lectureId: lecture.id,
          studentId: sid,
          status: attendanceMap[sid] || 'PRESENT',
        }));
        await tx.attendance.createMany({
          data: attendanceData,
          skipDuplicates: true,
        });
      }
    });

    revalidatePath(`/teacher/classes/${classSubjectId}/attendance`);
    return { success: true };
  } catch (e) {
    console.error('Error submitting attendance:', e);
    return { error: e.message || 'Failed to submit attendance.' };
  }
}
