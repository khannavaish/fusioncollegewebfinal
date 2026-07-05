'use server';

import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';

// ─── Verification Helper ─────────────────────────────────────────────────────
async function verifyAdminOrTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true, teacher: true }
  });
  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'TEACHER')) {
    throw new Error('Forbidden');
  }
  return dbUser;
}

// Helper to calculate grade
function calculateGrade(marksObt, totalMarks) {
  if (!totalMarks || totalMarks <= 0) return '—';
  const percentage = (Number(marksObt) / Number(totalMarks)) * 100;
  if (percentage >= 95) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

// ─── 1. Student Progress Report ──────────────────────────────────────────────
export async function getStudentReport(studentId, dateFromStr, dateToStr) {
  await verifyAdminOrTeacher();
  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);
  dateTo.setHours(23, 59, 59, 999);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      parents: { include: { parent: true } }
    }
  });

  if (!student) throw new Error('Student not found');

  // Fetch student attendance in date range
  const attendance = await prisma.attendance.findMany({
    where: {
      studentId,
      lecture: {
        date: { gte: dateFrom, lte: dateTo }
      }
    },
    include: {
      lecture: {
        include: {
          classSubject: {
            include: { subject: true, teacher: true }
          }
        }
      }
    }
  });

  // Calculate subject-wise attendance stats
  const subjectStats = {};
  attendance.forEach(att => {
    const classSub = att.lecture.classSubject;
    const subName = classSub.subject.name;
    const teacherName = classSub.teacher.name;

    if (!subjectStats[subName]) {
      subjectStats[subName] = {
        subject: subName,
        teacher: teacherName,
        present: 0,
        total: 0
      };
    }
    subjectStats[subName].total += 1;
    if (att.status === 'PRESENT' || att.status === 'LATE') {
      subjectStats[subName].present += 1;
    }
  });

  // Fetch student exam results in date range
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId,
      exam: {
        date: { gte: dateFrom, lte: dateTo }
      }
    },
    include: {
      exam: {
        include: {
          classSubject: { include: { subject: true } }
        }
      }
    }
  });

  const formattedExamResults = examResults.map(er => {
    const marksObt = Number(er.marksObt);
    const total = er.exam.totalMarks;
    const percentage = total > 0 ? (marksObt / total) * 100 : 0;
    return {
      id: er.id,
      examId: er.exam.id,
      subject: er.exam.classSubject.subject.name,
      title: er.exam.title,
      date: er.exam.date,
      marksObt,
      totalMarks: total,
      percentage: percentage.toFixed(1),
      grade: calculateGrade(marksObt, total),
      status: er.status
    };
  });

  // Fetch WhatsApp logs for student in date range
  const whatsAppLogs = await prisma.whatsAppLog.findMany({
    where: {
      studentId,
      sentAt: { gte: dateFrom, lte: dateTo }
    },
    orderBy: { sentAt: 'desc' }
  });

  return {
    student,
    subjectStats: Object.values(subjectStats),
    examResults: formattedExamResults,
    whatsAppLogs
  };
}

// ─── 2. Class Attendance Grid Report ─────────────────────────────────────────
export async function getClassAttendanceReport(classId, dateFromStr, dateToStr) {
  await verifyAdminOrTeacher();
  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);
  dateTo.setHours(23, 59, 59, 999);

  const targetClass = await prisma.class.findUnique({
    where: { id: classId },
    include: { students: { orderBy: { rollNumber: 'asc' } } }
  });

  if (!targetClass) throw new Error('Class not found');

  // Fetch all lectures for this class in date range
  const lectures = await prisma.lecture.findMany({
    where: {
      classSubject: { classId },
      date: { gte: dateFrom, lte: dateTo }
    },
    include: {
      classSubject: { include: { subject: true } },
      attendance: true
    },
    orderBy: { date: 'asc' }
  });

  // Unique dates of lectures
  const dates = [...new Set(lectures.map(l => l.date.toISOString().split('T')[0]))].sort();

  // Map each student's status for each date
  const studentsAttendance = targetClass.students.map(student => {
    const dateMap = {};
    let presentCount = 0;
    let totalCount = 0;

    dates.forEach(d => {
      // Find all lectures on this day for this class
      const dayLectures = lectures.filter(l => l.date.toISOString().split('T')[0] === d);
      const statuses = [];

      dayLectures.forEach(l => {
        const att = l.attendance.find(a => a.studentId === student.id);
        if (att) {
          statuses.push(att.status);
          totalCount += 1;
          if (att.status === 'PRESENT' || att.status === 'LATE') {
            presentCount += 1;
          }
        }
      });

      // Summarize day's attendance
      if (statuses.length === 0) {
        dateMap[d] = '—';
      } else if (statuses.includes('ABSENT')) {
        dateMap[d] = 'A';
      } else if (statuses.includes('LATE')) {
        dateMap[d] = 'L';
      } else if (statuses.includes('LEAVE')) {
        dateMap[d] = 'LV';
      } else {
        dateMap[d] = 'P';
      }
    });

    const percentage = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

    return {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      attendance: dateMap,
      percentage: percentage.toFixed(1),
      totalCount,
      presentCount
    };
  });

  // Calculate class average
  const validPercentages = studentsAttendance.filter(s => s.totalCount > 0).map(s => Number(s.percentage));
  const classAverage = validPercentages.length > 0
    ? (validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length).toFixed(1)
    : '0.0';

  return {
    className: targetClass.name,
    dates,
    studentsAttendance,
    classAverage
  };
}

// ─── 3. Teacher Performance Report ───────────────────────────────────────────
export async function getTeacherReport(teacherId, dateFromStr, dateToStr) {
  const user = await verifyAdminOrTeacher();
  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);
  dateTo.setHours(23, 59, 59, 999);

  // If a teacher is checking, enforce they can only see their own report
  let targetTeacherId = teacherId;
  if (user.role === 'TEACHER') {
    if (!user.teacher) throw new Error('Teacher record missing');
    targetTeacherId = user.teacher.id;
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: targetTeacherId }
  });

  if (!teacher) throw new Error('Teacher not found');

  // Fetch lectures taught in date range
  const lectures = await prisma.lecture.findMany({
    where: {
      classSubject: { teacherId: targetTeacherId },
      date: { gte: dateFrom, lte: dateTo }
    },
    include: {
      classSubject: { include: { class: true, subject: true } },
      attendance: true
    },
    orderBy: { date: 'desc' }
  });

  const formattedLectures = lectures.map(l => {
    const total = l.attendance.length;
    const present = l.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    return {
      id: l.id,
      date: l.date,
      className: l.classSubject.class.name,
      subject: l.classSubject.subject.name,
      topic: l.topic,
      presentCount: present,
      totalCount: total
    };
  });

  // Fetch exams administered in date range
  const exams = await prisma.exam.findMany({
    where: {
      classSubject: { teacherId: targetTeacherId },
      date: { gte: dateFrom, lte: dateTo }
    },
    include: {
      classSubject: { include: { class: true, subject: true } },
      results: true
    },
    orderBy: { date: 'desc' }
  });

  const formattedExams = exams.map(ex => {
    const scores = ex.results.map(r => Number(r.marksObt));
    const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';
    return {
      id: ex.id,
      title: ex.title,
      date: ex.date,
      totalMarks: ex.totalMarks,
      className: ex.classSubject.class.name,
      subject: ex.classSubject.subject.name,
      avgScore: average,
      resultsCount: ex.results.length
    };
  });

  return {
    teacher,
    lectures: formattedLectures,
    exams: formattedExams
  };
}

// ─── 4. WhatsApp Log ─────────────────────────────────────────────────────────
export async function getWhatsAppLog(dateFromStr, dateToStr, classId = 'ALL') {
  await verifyAdminOrTeacher();
  const dateFrom = new Date(dateFromStr);
  const dateTo = new Date(dateToStr);
  dateTo.setHours(23, 59, 59, 999);

  const whereClause = {
    sentAt: { gte: dateFrom, lte: dateTo }
  };

  if (classId !== 'ALL') {
    whereClause.student = { classId };
  }

  const logs = await prisma.whatsAppLog.findMany({
    where: whereClause,
    include: {
      student: { include: { class: true } }
    },
    orderBy: { sentAt: 'desc' }
  });

  return logs;
}

// ─── 5. Daily Absentee Report ────────────────────────────────────────────────
export async function getDailyAbsenteeReport(dateStr) {
  await verifyAdminOrTeacher();
  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

  const absences = await prisma.attendance.findMany({
    where: {
      status: 'ABSENT',
      lecture: {
        date: { gte: startOfDay, lte: endOfDay }
      }
    },
    include: {
      student: {
        include: {
          class: true,
          parents: { include: { parent: true } }
        }
      },
      lecture: {
        include: {
          classSubject: {
            include: { subject: true, teacher: true }
          }
        }
      }
    },
    orderBy: { student: { rollNumber: 'asc' } }
  });

  return absences.map(a => ({
    attendanceId: a.id,
    studentName: a.student.name,
    rollNumber: a.student.rollNumber,
    className: a.student.class.name,
    subject: a.lecture.classSubject.subject.name,
    teacher: a.lecture.classSubject.teacher.name,
    parentName: a.student.parents[0]?.parent?.name || '—',
    parentPhone: a.student.parents[0]?.parent?.phone || '—'
  }));
}

// ─── 6. Low Attendance Warning List ──────────────────────────────────────────
export async function getLowAttendanceWarningList(threshold = 75) {
  await verifyAdminOrTeacher();

  const students = await prisma.student.findMany({
    include: {
      class: true,
      parents: { include: { parent: true } },
      attendance: true
    }
  });

  const warningList = students.map(s => {
    const total = s.attendance.length;
    const present = s.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const percentage = total > 0 ? (present / total) * 100 : 100;

    return {
      id: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      className: s.class.name,
      parentName: s.parents[0]?.parent?.name || '—',
      parentPhone: s.parents[0]?.parent?.phone || '—',
      presentCount: present,
      totalCount: total,
      percentage: Number(percentage.toFixed(1))
    };
  });

  return warningList
    .filter(s => s.totalCount > 0 && s.percentage < threshold)
    .sort((a, b) => a.percentage - b.percentage);
}

// ─── 7. Teacher Completeness Report ──────────────────────────────────────────
export async function getTeacherCompletenessReport(dateStr) {
  await verifyAdminOrTeacher();
  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

  const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
  if (!config || !Array.isArray(config.slots) || config.slots.length === 0) {
    return { error: 'Master timetable is not configured yet.' };
  }

  const slots = await prisma.timetableSlot.findMany();

  const lecturesToday = await prisma.lecture.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      classSubject: {
        include: { class: true, subject: true, teacher: true }
      }
    }
  });

  const completeness = [];

  slots.forEach(slot => {
    if (!slot.subject || slot.subject.trim() === '' || slot.subject.trim() === '—') return;

    const fullClassName = `${slot.section} - ${slot.className}`;

    const matchingLecture = lecturesToday.find(l => 
      l.classSubject.class.name === fullClassName && 
      l.classSubject.subject.name.toLowerCase() === slot.subject.toLowerCase()
    );

    completeness.push({
      id: slot.id,
      className: fullClassName,
      timeSlot: slot.timeSlot,
      subject: slot.subject,
      teacher: slot.teacher,
      isMarked: !!matchingLecture,
      lectureId: matchingLecture ? matchingLecture.id : null,
      topic: matchingLecture ? matchingLecture.topic : 'Not marked yet'
    });
  });

  return completeness;
}
