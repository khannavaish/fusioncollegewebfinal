'use server';

import prisma from '@/utils/db';
import { verifyAdmin } from './admin';

export async function getStudentLedger(studentId) {
  await verifyAdmin();
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        feeBills: {
          orderBy: [
            { year: 'asc' },
            { month: 'asc' }
          ],
          include: { items: true }
        }
      }
    });
    
    if (!student) return { error: 'Student not found.' };

    const serializedStudent = {
      ...student,
      admissionPercentage: student.admissionPercentage ? Number(student.admissionPercentage) : null,
      feeMonthlyOverride: student.feeMonthlyOverride ? Number(student.feeMonthlyOverride) : null,
      feeBills: student.feeBills.map(bill => ({
        ...bill,
        baseAmount: Number(bill.baseAmount),
        totalAmount: Number(bill.totalAmount),
        paidAmount: bill.paidAmount ? Number(bill.paidAmount) : null,
        items: bill.items.map(item => ({
          ...item,
          amount: Number(item.amount)
        }))
      }))
    };

    return { student: serializedStudent };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to fetch student ledger.' };
  }
}

export async function getTeacherLedger(teacherId) {
  await verifyAdmin();
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        salaryBills: {
          orderBy: [
            { year: 'asc' },
            { month: 'asc' }
          ]
        }
      }
    });

    if (!teacher) return { error: 'Teacher not found.' };

    const serializedTeacher = {
      ...teacher,
      baseSalary: teacher.baseSalary ? Number(teacher.baseSalary) : null,
      salaryBills: teacher.salaryBills.map(bill => ({
        ...bill,
        baseSalary: Number(bill.baseSalary),
        allowances: Number(bill.allowances),
        deductions: Number(bill.deductions),
        totalAmount: Number(bill.totalAmount),
        paidAmount: bill.paidAmount ? Number(bill.paidAmount) : null,
      }))
    };

    return { teacher: serializedTeacher };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to fetch teacher ledger.' };
  }
}

export async function getClassLedger(classId, month = 'ALL', year = 'ALL') {
  await verifyAdmin();
  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });
    
    if (!classData) return { error: 'Class not found.' };

    const billFilter = {};
    if (month !== 'ALL') billFilter.month = parseInt(month);
    if (year !== 'ALL') billFilter.year = parseInt(year);

    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        feeBills: {
          where: billFilter
        }
      },
      orderBy: { name: 'asc' }
    });

    const studentLedgers = students.map(s => {
      const totalBilled = s.feeBills.reduce((acc, bill) => acc + Number(bill.totalAmount), 0);
      const totalPaid = s.feeBills.reduce((acc, bill) => acc + (bill.paidAmount ? Number(bill.paidAmount) : 0), 0);
      return {
        id: s.id,
        name: s.name,
        rollNumber: s.rollNumber,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid
      };
    });

    return { classData, studentLedgers };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to fetch class ledger.' };
  }
}
