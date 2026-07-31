import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import BillDetailClient from './BillDetailClient';

export const metadata = { title: '📄 Fee Bill Detail — Fusion LMS' };

export default async function BillDetailPage({ params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');

  const { billId } = await params;

  const bill = await prisma.feeBill.findUnique({
    where: { id: billId },
    include: {
      student: {
        include: {
          class: true,
          feePackage: true,
          parents: { include: { parent: { select: { phone: true, name: true } } } },
        },
      },
      items: { orderBy: { id: 'asc' } },
    },
  });

  if (!bill) notFound();

  const serialized = {
    id: bill.id,
    month: bill.month,
    year: bill.year,
    baseAmount: Number(bill.baseAmount),
    totalAmount: Number(bill.totalAmount),
    dueDate: bill.dueDate.toISOString(),
    status: bill.status,
    paidAmount: bill.paidAmount ? Number(bill.paidAmount) : null,
    paidAt: bill.paidAt ? bill.paidAt.toISOString() : null,
    remarks: bill.remarks,
    whatsappSent: bill.whatsappSent,
    createdAt: bill.createdAt.toISOString(),
    items: bill.items.map((i) => ({ id: i.id, title: i.title, amount: Number(i.amount) })),
    student: {
      id: bill.student.id,
      name: bill.student.name,
      rollNumber: bill.student.rollNumber,
      fatherName: bill.student.fatherName,
      admissionPercentage: bill.student.admissionPercentage ? Number(bill.student.admissionPercentage) : null,
      class: bill.student.class ? { id: bill.student.class.id, name: bill.student.class.name } : null,
      feePackage: bill.student.feePackage ? { name: bill.student.feePackage.name } : null,
      parents: bill.student.parents.map((ps) => ({ name: ps.parent.name, phone: ps.parent.phone })),
    },
  };

  return (
    <div className="min-h-screen bg-[#060810] text-white p-6 md:p-8">
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-6">
        <Link href="/admin" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/fees" className="hover:text-cyan-400 transition-colors">Fee Management</Link>
        <span>/</span>
        <Link href="/admin/fees/bills" className="hover:text-cyan-400 transition-colors">Bills</Link>
        <span>/</span>
        <span className="text-zinc-300">{bill.student.name}</span>
      </div>
      <BillDetailClient bill={serialized} />
    </div>
  );
}
