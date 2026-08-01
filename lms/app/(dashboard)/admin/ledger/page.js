import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import LedgerClient from './LedgerClient';

export const metadata = {
  title: 'Ledgers | Fusion College LMS',
  description: 'View full financial ledgers for students and teachers.',
};

export default async function AdminLedgerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true }
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  // Fetch initial filter option lists
  let students = [];
  let teachers = [];
  let classes = [];

  try {
    students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        rollNumber: true,
        class: { select: { name: true } }
      },
      orderBy: { name: 'asc' }
    });

    teachers = await prisma.teacher.findMany({
      orderBy: { name: 'asc' }
    });
    
    classes = await prisma.class.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (err) {
    console.error('Error loading ledger filters data:', err);
  }

  return (
    <div className="space-y-6">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Financial Ledgers</h1>
            <p className="text-zinc-400 text-sm mt-1">Export professional PDF ledgers for students, teachers, and classes</p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <LedgerClient
          students={students}
          teachers={teachers}
          classes={classes}
        />
      </AnimatedSection>
    </div>
  );
}
