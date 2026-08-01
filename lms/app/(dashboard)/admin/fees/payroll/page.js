import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import prisma from '@/utils/db';
import PayrollClient from './PayrollClient';

export const metadata = {
  title: 'Teacher Payroll',
};

export default async function TeacherPayrollPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard');

  const { month, year } = await searchParams;
  const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
  const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();

  const bills = await prisma.teacherSalaryBill.findMany({
    where: { month: currentMonth, year: currentYear },
    include: { teacher: true },
    orderBy: { teacher: { name: 'asc' } },
  });

  const allTeachers = await prisma.teacher.findMany({
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-[#06080e] p-6">
      <PayrollClient 
        initialBills={bills} 
        allTeachers={allTeachers}
        currentMonth={currentMonth} 
        currentYear={currentYear} 
      />
    </div>
  );
}
