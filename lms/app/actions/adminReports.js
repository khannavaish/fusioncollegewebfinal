'use server';

import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Verification Helper ─────────────────────────────────────────────────────
async function verifyAccess(itemId, type) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true, teacher: true }
  });
  if (!dbUser) throw new Error('Forbidden');
  if (dbUser.role === 'ADMIN') return { role: 'ADMIN' };

  if (dbUser.role === 'TEACHER') {
    if (!dbUser.teacher) throw new Error('Teacher record missing');
    const teacherId = dbUser.teacher.id;

    // Check if the item belongs to this teacher
    if (type === 'lecture') {
      const lecture = await prisma.lecture.findUnique({
        where: { id: itemId },
        include: { classSubject: true }
      });
      if (lecture && lecture.classSubject.teacherId === teacherId) return { role: 'TEACHER', teacherId };
    } else if (type === 'exam') {
      const exam = await prisma.exam.findUnique({
        where: { id: itemId },
        include: { classSubject: true }
      });
      if (exam && exam.classSubject.teacherId === teacherId) return { role: 'TEACHER', teacherId };
    } else if (type === 'examResult') {
      const result = await prisma.examResult.findUnique({
        where: { id: itemId },
        include: { exam: { include: { classSubject: true } } }
      });
      if (result && result.exam.classSubject.teacherId === teacherId) return { role: 'TEACHER', teacherId };
    } else if (type === 'attendance') {
      const att = await prisma.attendance.findUnique({
        where: { id: itemId },
        include: { lecture: { include: { classSubject: true } } }
      });
      if (att && att.lecture.classSubject.teacherId === teacherId) return { role: 'TEACHER', teacherId };
    }
    throw new Error('Forbidden: You do not own this record.');
  }

  throw new Error('Forbidden');
}

// ─── Attendance Operations ──────────────────────────────────────────────────
export async function updateAttendanceStatus(attendanceId, status) {
  await verifyAccess(attendanceId, 'attendance');
  try {
    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status }
    });
    return { success: true, updated };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteAttendance(attendanceId) {
  await verifyAccess(attendanceId, 'attendance');
  try {
    await prisma.attendance.delete({ where: { id: attendanceId } });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Lecture Operations ─────────────────────────────────────────────────────
export async function updateLectureTopic(lectureId, topic, dateStr) {
  await verifyAccess(lectureId, 'lecture');
  try {
    const data = { topic };
    if (dateStr) {
      data.date = new Date(dateStr);
    }
    const updated = await prisma.lecture.update({
      where: { id: lectureId },
      data
    });
    return { success: true, updated };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteLecture(lectureId) {
  await verifyAccess(lectureId, 'lecture');
  try {
    await prisma.lecture.delete({ where: { id: lectureId } });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Exam Operations ────────────────────────────────────────────────────────
export async function updateExam(examId, title, dateStr, totalMarks) {
  await verifyAccess(examId, 'exam');
  try {
    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        title,
        date: new Date(dateStr),
        totalMarks: parseInt(totalMarks, 10)
      }
    });
    return { success: true, updated };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteExam(examId) {
  await verifyAccess(examId, 'exam');
  try {
    await prisma.exam.delete({ where: { id: examId } });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Exam Result Operations ─────────────────────────────────────────────────
export async function updateExamResult(resultId, marksObt) {
  await verifyAccess(resultId, 'examResult');
  try {
    const result = await prisma.examResult.findUnique({
      where: { id: resultId },
      include: { exam: true }
    });
    if (!result) throw new Error('Result not found');
    const marks = Number(marksObt);
    const pass = marks >= (Number(result.exam.totalMarks) * 0.5);

    const updated = await prisma.examResult.update({
      where: { id: resultId },
      data: {
        marksObt: marks,
        status: pass ? 'PASSED' : 'FAILED'
      }
    });
    return { success: true, updated };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteExamResult(resultId) {
  await verifyAccess(resultId, 'examResult');
  try {
    await prisma.examResult.delete({ where: { id: resultId } });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function addExamResult(examId, studentId, marksObt) {
  await verifyAccess(examId, 'exam');
  try {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new Error('Exam not found');
    const marks = Number(marksObt);
    const pass = marks >= (Number(exam.totalMarks) * 0.5);

    const created = await prisma.examResult.create({
      data: {
        examId,
        studentId,
        marksObt: marks,
        status: pass ? 'PASSED' : 'FAILED'
      }
    });
    return { success: true, created };
  } catch (e) {
    return { error: e.message };
  }
}

export async function createExamForClassSubject(classSubjectId, title, dateStr, totalMarks) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true, teacher: true }
    });
    if (!dbUser) throw new Error('Forbidden');
    if (dbUser.role === 'TEACHER') {
      const classSubject = await prisma.classSubject.findUnique({
        where: { id: classSubjectId }
      });
      if (!classSubject || classSubject.teacherId !== dbUser.teacher.id) {
        throw new Error('Forbidden: You do not own this class subject.');
      }
    }

    const created = await prisma.exam.create({
      data: {
        title,
        date: new Date(dateStr),
        totalMarks: parseInt(totalMarks, 10),
        classSubjectId
      }
    });
    return { success: true, created };
  } catch (e) {
    return { error: e.message };
  }
}

export async function adminCreateExam(formData) {
  try {
    const classSubjectId = formData.get('classSubjectId')?.toString();
    const title = formData.get('title')?.toString().trim();
    const dateStr = formData.get('date')?.toString();
    const totalMarks = formData.get('totalMarks')?.toString();

    if (!classSubjectId || !title || !dateStr || !totalMarks) {
      return { error: 'All fields are required.' };
    }

    const res = await createExamForClassSubject(classSubjectId, title, dateStr, totalMarks);
    if (res.error) return { error: res.error };

    revalidatePath('/admin/exams');
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function adminDeleteExam(formData) {
  try {
    const examId = formData.get('examId')?.toString();
    if (!examId) return { error: 'Exam ID required.' };
    await prisma.exam.delete({ where: { id: examId } });
    revalidatePath('/admin/exams');
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}


