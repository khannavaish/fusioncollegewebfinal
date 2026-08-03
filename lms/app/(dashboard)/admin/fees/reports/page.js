import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import prisma from '@/utils/db';
import { getFeeReport } from '@/app/actions/reports';
import FeesReportClient from './FeesReportClient';

export const metadata = {
  title: 'Fee Reports | Fusion LMS',
  description: 'View and export fee billing reports',
};

export default async function FeesReportPage({ searchParams }) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');

  const awaitedParams = await searchParams;
  const statusFilter = awaitedParams?.status || 'ALL';
  const month = awaitedParams?.month ? parseInt(awaitedParams.month) : new Date().getMonth() + 1;
  const year = awaitedParams?.year ? parseInt(awaitedParams.year) : new Date().getFullYear();

  // Create date strings covering the entire selected month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const dateFromStr = startDate.toISOString();
  const dateToStr = endDate.toISOString();

  let result = [];
  try {
    result = await getFeeReport(dateFromStr, dateToStr, '', '', statusFilter);
  } catch (err) {
    console.error('getFeeReport error:', err);
  }

  return (
    <FeesReportClient 
      initialData={result} 
      initialStatus={statusFilter} 
      initialMonth={month}
      initialYear={year}
    />
  );
}
