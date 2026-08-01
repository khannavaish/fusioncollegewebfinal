import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

export async function GET(request, { params }) {
  const { type } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let csv = '';
  let filename = `${type}_export.csv`;

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '';
    const stringified = String(str);
    if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  };

  try {
    if (type === 'students') {
      const students = await prisma.student.findMany({
        include: { class: true, user: true },
        orderBy: { name: 'asc' }
      });
      csv += 'ID,Roll Number,Name,Father Name,Class,CNIC,Father CNIC,WhatsApp,Phone,Address,Gender,Created At\n';
      students.forEach(s => {
        csv += `${s.id},${escapeCSV(s.rollNumber)},${escapeCSV(s.name)},${escapeCSV(s.fatherName)},${escapeCSV(s.class?.name)},${escapeCSV(s.cnic)},${escapeCSV(s.fatherCnic)},${escapeCSV(s.whatsappNumber)},${escapeCSV(s.telephone)},${escapeCSV(s.address)},${escapeCSV(s.gender)},${s.user?.createdAt ? new Date(s.user.createdAt).toISOString() : ''}\n`;
      });
    } 
    else if (type === 'teachers') {
      const teachers = await prisma.teacher.findMany({
        include: { user: true },
        orderBy: { name: 'asc' }
      });
      csv += 'ID,Name,Phone,Qualification,Department,Base Salary,Created At\n';
      teachers.forEach(t => {
        csv += `${t.id},${escapeCSV(t.name)},${escapeCSV(t.phone)},${escapeCSV(t.qualification)},${escapeCSV(t.department)},${escapeCSV(t.baseSalary)},${t.user?.createdAt ? new Date(t.user.createdAt).toISOString() : ''}\n`;
      });
    }
    else if (type === 'classes') {
      const classes = await prisma.class.findMany({
        include: { inchargeTeacher: true, _count: { select: { students: true } } },
        orderBy: { name: 'asc' }
      });
      csv += 'ID,Name,Academic Year,Incharge Teacher,Student Count\n';
      classes.forEach(c => {
        csv += `${c.id},${escapeCSV(c.name)},${escapeCSV(c.academicYr)},${escapeCSV(c.inchargeTeacher?.name)},${c._count.students}\n`;
      });
    }
    else if (type === 'fees') {
      const bills = await prisma.feeBill.findMany({
        include: { student: { include: { class: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      });
      csv += 'Bill ID,Student Name,Roll Number,Class,Year,Month,Status,Total Amount,Paid Amount,Paid Date\n';
      bills.forEach(b => {
        csv += `${b.id},${escapeCSV(b.student?.name)},${escapeCSV(b.student?.rollNumber)},${escapeCSV(b.student?.class?.name)},${b.year},${b.month},${b.status},${b.totalAmount},${escapeCSV(b.paidAmount)},${b.paidDate ? new Date(b.paidDate).toISOString() : ''}\n`;
      });
    }
    else {
      return new NextResponse('Invalid export type', { status: 400 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(csv, { status: 200, headers });
  } catch (err) {
    console.error('Export Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
