import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import AnimatedSection from '@/app/components/AnimatedSection';
import SessionClient from './SessionClient';
import { PageShell } from '@/app/components/Brand';
import { Database } from 'lucide-react';

export const metadata = {
  title: 'Session Management | Admin',
};

export default async function AdminSessionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true }
  });

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const [settings, classes] = await Promise.all([
    prisma.systemSettings.findUnique({ where: { id: 'global' } }),
    prisma.class.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const activeSessionName = settings?.activeSessionName || 'Session 2025-2026';

  return (
    <PageShell
      title="Academic Sessions"
      icon={<Database />}
      description="Manage the global academic session, graduate final year students, and seamlessly promote 1st year batches to the next year."
    >
      <div className="space-y-8 font-sans pb-10 mt-4">

      <AnimatedSection delay={0.2}>
        <SessionClient 
          initialSessionName={activeSessionName} 
          classes={classes.map(c => ({
            id: c.id,
            name: c.name,
            studentCount: c._count.students
          }))} 
        />
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
