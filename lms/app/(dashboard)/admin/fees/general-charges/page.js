import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import GeneralChargesClient from './GeneralChargesClient';

export const metadata = {
  title: 'Manage General Charges | Fusion College LMS',
};

export default async function GeneralChargesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true }
  });

  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard');

  const charges = await prisma.generalCharge.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return <GeneralChargesClient initialCharges={charges} />;
}
