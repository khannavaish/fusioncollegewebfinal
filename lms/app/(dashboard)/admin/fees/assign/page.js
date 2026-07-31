import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import { redirect } from 'next/navigation';
import AssignClient from './AssignClient';

export const metadata = {
  title: 'Assign Fee Packages | Fusion LMS',
};

export default async function AssignFeePackagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch all active students, fee packages, and classes
  const [students, packages, classes] = await Promise.all([
    prisma.student.findMany({
      where: { user: { status: 'ACTIVE' } },
      include: {
        class: { select: { name: true } },
        feePackage: { select: { name: true, monthlyFee: true } },
      },
      orderBy: [{ classId: 'asc' }, { rollNumber: 'asc' }],
    }),
    prisma.feePackage.findMany({
      orderBy: { monthlyFee: 'asc' },
    }),
    prisma.class.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AssignClient students={students} packages={packages} classes={classes} />
    </div>
  );
}
