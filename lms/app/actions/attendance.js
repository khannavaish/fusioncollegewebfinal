'use server';

import prisma from '@/utils/db';
import { revalidatePath } from 'next/cache';

export async function getDailyAttendance(dateStr) {
  try {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    const lectures = await prisma.lecture.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        classSubject: {
          include: {
            subject: true,
            teacher: true,
            class: true
          }
        },
        attendance: {
          include: {
            student: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    let totalLectures = lectures.length;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    const data = lectures.map(l => {
      let present = 0;
      let absent = 0;
      let late = 0;
      
      l.attendance.forEach(a => {
        if (a.status === 'PRESENT') { present++; totalPresent++; }
        if (a.status === 'ABSENT') { absent++; totalAbsent++; }
        if (a.status === 'LATE') { late++; totalLate++; }
      });

      return {
        id: l.id,
        class: l.classSubject.class.name,
        subject: l.classSubject.subject.name,
        teacher: l.classSubject.teacher.name,
        topic: l.topic,
        startTime: l.startTime,
        endTime: l.endTime,
        stats: { present, absent, late, total: present + absent + late }
      };
    });

    return { 
      success: true, 
      date: targetDate.toISOString(),
      summary: {
        totalLectures,
        totalPresent,
        totalAbsent,
        totalLate,
        totalStudents: totalPresent + totalAbsent + totalLate
      },
      lectures: data
    };

  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    return { success: false, error: 'Failed to fetch attendance' };
  }
}
