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

async function verifyStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: { student: true },
  });
  if (!dbUser || dbUser.role !== 'STUDENT' || !dbUser.student) throw new Error('Forbidden');
  return dbUser.student;
}

// ==================== Teacher: Create Assignment ====================
export async function createAssignment(formData) {
  try {
    const teacher = await verifyTeacher();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const deadline = formData.get('deadline')?.toString();
    const classSubjectId = formData.get('classSubjectId')?.toString();
    const fileUrl = formData.get('fileUrl')?.toString().trim() || null;

    if (!title || !description || !deadline || !classSubjectId) {
      return { error: 'Title, description, deadline and class/subject are required.' };
    }

    // Verify this teacher owns the classSubject
    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });
    if (!classSubject || classSubject.teacherId !== teacher.id) {
      return { error: 'You are not assigned to this class/subject.' };
    }

    await prisma.assignment.create({
      data: {
        title,
        description,
        deadline: new Date(deadline),
        classSubjectId,
        fileUrl,
      },
    });

    revalidatePath('/teacher/assignments');
    return { success: true };
  } catch (e) {
    console.error('createAssignment error:', e);
    return { error: e.message || 'Failed to create assignment.' };
  }
}

// ==================== Teacher: Grade Submission ====================
export async function gradeSubmission(formData) {
  try {
    const teacher = await verifyTeacher();
    const submissionId = formData.get('submissionId')?.toString();
    const grade = formData.get('grade')?.toString().trim();
    const remarks = formData.get('remarks')?.toString().trim() || null;

    if (!submissionId || !grade) {
      return { error: 'Submission ID and grade are required.' };
    }

    // Verify this submission belongs to one of the teacher's assignments
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: { classSubject: true },
        },
      },
    });

    if (!submission) return { error: 'Submission not found.' };
    if (submission.assignment.classSubject.teacherId !== teacher.id) {
      return { error: 'Unauthorized to grade this submission.' };
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: { grade, remarks, status: 'GRADED' },
    });

    revalidatePath('/teacher/assignments');
    return { success: true };
  } catch (e) {
    console.error('gradeSubmission error:', e);
    return { error: e.message || 'Failed to grade submission.' };
  }
}

// ==================== Teacher: Delete Assignment ====================
export async function deleteAssignment(formData) {
  try {
    const teacher = await verifyTeacher();
    const assignmentId = formData.get('assignmentId')?.toString();
    if (!assignmentId) return { error: 'Assignment ID required.' };

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { classSubject: true },
    });
    if (!assignment || assignment.classSubject.teacherId !== teacher.id) {
      return { error: 'Not authorized to delete this assignment.' };
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });
    revalidatePath('/teacher/assignments');
    return { success: true };
  } catch (e) {
    console.error('deleteAssignment error:', e);
    return { error: e.message || 'Failed to delete assignment.' };
  }
}

// ==================== Student: Submit Assignment ====================
export async function submitAssignment(formData) {
  try {
    const student = await verifyStudent();
    const assignmentId = formData.get('assignmentId')?.toString();
    const fileUrl = formData.get('fileUrl')?.toString().trim();
    const textAnswer = formData.get('textAnswer')?.toString().trim();

    if (!assignmentId) return { error: 'Assignment ID required.' };
    if (!fileUrl && !textAnswer) {
      return { error: 'Please provide a file URL or a written answer.' };
    }

    // Verify the assignment belongs to the student's class
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { classSubject: true },
    });
    if (!assignment) return { error: 'Assignment not found.' };
    if (assignment.classSubject.classId !== student.classId) {
      return { error: 'This assignment is not for your class.' };
    }

    // Check for duplicate submission
    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    });
    if (existing) return { error: 'You have already submitted this assignment.' };

    await prisma.submission.create({
      data: {
        assignmentId,
        studentId: student.id,
        fileUrl: fileUrl || textAnswer,
        status: 'SUBMITTED',
      },
    });

    revalidatePath('/student/assignments');
    return { success: true };
  } catch (e) {
    console.error('submitAssignment error:', e);
    return { error: e.message || 'Failed to submit assignment.' };
  }
}
