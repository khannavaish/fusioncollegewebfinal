'use server';

import prisma from '@/utils/db';
import { revalidatePath } from 'next/cache';

export async function updateSessionName(formData) {
  try {
    const sessionName = formData.get('sessionName');
    if (!sessionName) throw new Error('Session name is required');

    await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: { activeSessionName: sessionName },
      create: { id: 'global', activeSessionName: sessionName }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { error: error.message || 'Failed to update session name' };
  }
}

export async function graduateStudents(formData) {
  try {
    const classIds = formData.getAll('classIds');
    if (!classIds || classIds.length === 0) {
      throw new Error('No classes selected for graduation.');
    }

    // Find all students in these classes
    const students = await prisma.student.findMany({
      where: { classId: { in: classIds } },
      select: { userId: true }
    });

    if (students.length === 0) {
      throw new Error('No students found in selected classes.');
    }

    const userIds = students.map(s => s.userId);

    // Update their user status to ALUMNI
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: 'ALUMNI' }
    });

    revalidatePath('/admin/session');
    revalidatePath('/admin/students');
    return { success: true, count: students.length };
  } catch (error) {
    return { error: error.message || 'Failed to graduate students' };
  }
}

export async function promoteStudents(mappingData) {
  // mappingData = [{ fromClassId, toClassId }]
  try {
    if (!mappingData || mappingData.length === 0) {
      throw new Error('No promotion mapping provided.');
    }

    let totalPromoted = 0;

    for (const mapping of mappingData) {
      if (!mapping.fromClassId || !mapping.toClassId) continue;
      
      const result = await prisma.student.updateMany({
        where: { classId: mapping.fromClassId },
        data: { classId: mapping.toClassId }
      });
      totalPromoted += result.count;
    }

    revalidatePath('/admin/session');
    revalidatePath('/admin/students');
    return { success: true, count: totalPromoted };
  } catch (error) {
    return { error: error.message || 'Failed to promote students' };
  }
}
