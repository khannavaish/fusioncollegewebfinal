import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AnimatedSection from '@/app/components/AnimatedSection';
import StudentFeesClient from './StudentFeesClient';

export const metadata = { title: '💰 My Fee Bills — Fusion LMS' };

export default async function StudentFeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: { student: { include: { feePackage: true, class: true, feeBills: { include: { items: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }] } } } },
  });

  if (!dbUser?.student) redirect('/student');

  const student = dbUser.student;

  const serialized = {
    name: student.name,
    rollNumber: student.rollNumber,
    fatherName: student.fatherName,
    class: student.class?.name || '—',
    admissionPercentage: student.admissionPercentage ? Number(student.admissionPercentage) : null,
    feePackage: student.feePackage ? { name: student.feePackage.name, monthlyFee: Number(student.feePackage.monthlyFee) } : null,
    feeMonthlyOverride: student.feeMonthlyOverride ? Number(student.feeMonthlyOverride) : null,
    bills: student.feeBills.map((b) => ({
      id: b.id,
      month: b.month,
      year: b.year,
      totalAmount: Number(b.totalAmount),
      paidAmount: b.paidAmount ? Number(b.paidAmount) : null,
      paidAt: b.paidAt ? b.paidAt.toISOString() : null,
      dueDate: b.dueDate.toISOString(),
      status: b.status,
      remarks: b.remarks,
      whatsappSent: b.whatsappSent,
      items: b.items.map((i) => ({ id: i.id, title: i.title, amount: Number(i.amount) })),
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        fatherName: student.fatherName,
        admissionPercentage: student.admissionPercentage ? Number(student.admissionPercentage) : null,
        class: student.class ? { name: student.class.name } : null,
        feePackage: student.feePackage ? { name: student.feePackage.name } : null,
        parents: [],
      },
    })),
  };

  return (
    <AnimatedSection delay={0.1}>
      <StudentFeesClient student={serialized} />
    </AnimatedSection>
  );
}
