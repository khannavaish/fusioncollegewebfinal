import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import AdminDashboardClient from './AdminDashboardClient';
import { PageShell } from '@/app/components/Brand';
import { LayoutDashboard } from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard | Fusion LMS',
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  let admin = null, studentCount = 0, teacherCount = 0, classCount = 0, subjectCount = 0, parentCount = 0;
  let recentStudents = [], recentTeachers = [], enquiries = [];
  let revenueThisMonth = 0;
  let outstandingThisMonth = 0;
  let attendanceRate = 0;
  let todayLecturesCount = 0;

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // Run ALL queries in parallel instead of sequentially
    const [
      full, 
      studentCountResult, teacherCountResult, classCountResult, subjectCountResult,
      rawStudents, rawTeachers, rawEnquiries,
      bills, todayLectures
    ] = await Promise.all([
      prisma.user.findUnique({ where: { authId: user.id }, include: { admin: true } }),
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.student.findMany({ select: { id: true, name: true, rollNumber: true, class: { select: { name: true } } }, orderBy: { name: 'asc' }, take: 5 }),
      prisma.teacher.findMany({ select: { id: true, name: true, user: { select: { email: true } } }, orderBy: { name: 'asc' }, take: 5 }),
      prisma.contactEnquiry.findMany({ select: { id: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.feeBill.findMany({ where: { month: currentMonth, year: currentYear }, select: { status: true, totalAmount: true, paidAmount: true } }),
      prisma.lecture.findMany({ where: { date: { gte: todayStart, lte: todayEnd } }, select: { id: true, attendance: { select: { status: true } } } }),
    ]);

    admin = full?.admin;
    studentCount = studentCountResult;
    teacherCount = teacherCountResult;
    classCount = classCountResult;
    subjectCount = subjectCountResult;

    recentStudents = rawStudents.map(s => ({
      id: s.id, name: s.name, rollNumber: s.rollNumber,
      class: s.class ? { name: s.class.name } : null,
    }));
    recentTeachers = rawTeachers.map(t => ({
      id: t.id, name: t.name, user: t.user ? { email: t.user.email } : null,
    }));
    enquiries = rawEnquiries;

    for (const bill of bills) {
      if (bill.status === 'PAID') {
        revenueThisMonth += Number(bill.paidAmount || bill.totalAmount);
      } else if (bill.status === 'PARTIAL') {
        revenueThisMonth += Number(bill.paidAmount || 0);
        outstandingThisMonth += (Number(bill.totalAmount) - Number(bill.paidAmount || 0));
      } else if (bill.status === 'UNPAID') {
        outstandingThisMonth += Number(bill.totalAmount);
      }
    }

    todayLecturesCount = todayLectures.length;
    let totalPresent = 0;
    let totalRecords = 0;
    todayLectures.forEach(lecture => {
      lecture.attendance.forEach(att => {
        totalRecords++;
        if (att.status === 'PRESENT') totalPresent++;
      });
    });
    attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  } catch {}

  const adminName = admin?.name || user.email;

  const stats = {
    studentCount,
    teacherCount,
    classCount,
    subjectCount,
    parentCount,
    revenueThisMonth,
    outstandingThisMonth,
    attendanceRate,
    todayLecturesCount
  };

  return (
    <PageShell title="Admin Dashboard" icon={<LayoutDashboard />}>
      <AdminDashboardClient 
        adminName={adminName} 
        stats={stats}
        recentStudents={recentStudents}
        recentTeachers={recentTeachers}
        enquiries={enquiries}
      />
    </PageShell>
  );
}
