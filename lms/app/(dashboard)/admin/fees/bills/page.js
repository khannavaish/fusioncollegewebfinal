import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BillsClient from './BillsClient';

export const metadata = { title: '📋 Fee Bills — Fusion LMS' };

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default async function BillsPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');

  const sp = await searchParams;
  const now = new Date();
  const month  = parseInt(sp?.month  || now.getMonth() + 1);
  const year   = parseInt(sp?.year   || now.getFullYear());
  const status = sp?.status  || 'ALL';
  const classId = sp?.classId || 'ALL';

  const whereClause = {
    month,
    year,
    ...(status !== 'ALL' ? { status } : {}),
    ...(classId !== 'ALL' ? { student: { classId } } : {}),
  };

  const [bills, classes] = await Promise.all([
    prisma.feeBill.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true,
            feePackage: true,
            parents: { include: { parent: { select: { phone: true, name: true } } } },
          },
        },
        items: true,
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
    baseAmount: Number(b.baseAmount),
    totalAmount: Number(b.totalAmount),
    dueDate: b.dueDate.toISOString(),
    status: b.status,
    paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
    paidAt: b.paidAt ? b.paidAt.toISOString() : null,
    remarks: b.remarks,
    whatsappSent: b.whatsappSent,
    createdAt: b.createdAt.toISOString(),
    items: b.items.map((i) => ({ id: i.id, title: i.title, amount: Number(i.amount) })),
    student: {
      id: b.student.id,
      name: b.student.name,
      rollNumber: b.student.rollNumber,
      fatherName: b.student.fatherName,
      admissionPercentage: b.student.admissionPercentage ? Number(b.student.admissionPercentage) : null,
      class: b.student.class ? { id: b.student.class.id, name: b.student.class.name } : null,
      feePackage: b.student.feePackage ? { name: b.student.feePackage.name } : null,
      parents: b.student.parents.map((ps) => ({
        name: ps.parent.name,
        phone: ps.parent.phone,
      })),
    },
  }));

  const filters = { month, year, status, classId };

  return (
    <div className="min-h-screen bg-[#060810] text-white p-6 md:p-8">
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-6">
        <Link href="/admin" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/fees" className="hover:text-cyan-400 transition-colors">Fee Management</Link>
        <span>/</span>
        <span className="text-zinc-300">Bills</span>
      </div>
      <BillsClient bills={serializedBills} classes={classes} filters={filters} monthNames={MONTH_NAMES} />
    </div>
  );
}
