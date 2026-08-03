import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MarkPaidClient from './MarkPaidClient';

export const metadata = { title: 'Mark Bills Paid | Fusion LMS' };

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default async function MarkPaidPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');

  const sp = await searchParams;
  const now = new Date();
  const month  = parseInt(sp?.month  || now.getMonth() + 1);
  const year   = parseInt(sp?.year   || now.getFullYear());
  const classId = sp?.classId || 'ALL';

  const whereClause = {
    month,
    year,
    status: { in: ['UNPAID', 'PARTIAL'] }, // Only unpaid/partial bills
    ...(classId !== 'ALL' ? { student: { classId } } : {}),
  };

  const [bills, classes] = await Promise.all([
    prisma.feeBill.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true,
            parents: { include: { parent: { select: { phone: true, name: true } } } },
          },
        },
      },
      orderBy: [{ student: { class: { name: 'asc' } } }, { student: { rollNumber: 'asc' } }],
    }),
    prisma.class.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  // Serialize 
  const serializedBills = bills.map((b) => ({
    id: b.id,
    month: b.month,
    year: b.year,
    totalAmount: Number(b.totalAmount),
    dueDate: b.dueDate.toISOString(),
    status: b.status,
    paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
    student: {
      id: b.student.id,
      name: b.student.name,
      rollNumber: b.student.rollNumber,
      fatherName: b.student.fatherName,
      class: b.student.class ? { name: b.student.class.name } : null,
    },
  }));

  const filters = { month, year, classId };

  return <MarkPaidClient bills={serializedBills} classes={classes} filters={filters} monthNames={MONTH_NAMES} />;
}
