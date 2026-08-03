import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import AdminTimetableShell from './AdminTimetableShell';
import { resolveTimeSlots } from '@/utils/timetable';
import { PageShell } from '@/app/components/Brand';
import { Calendar } from 'lucide-react';

export default async function AdminTimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true },
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  // Fetch current slots, classes, active teachers, and time slots configuration
  let slots = [], dbClasses = [], dbTeachers = [], config = null;
  try {
    slots = await prisma.timetableSlot.findMany();
    dbClasses = await prisma.class.findMany({ orderBy: { name: 'asc' } });
    dbTeachers = await prisma.teacher.findMany({
      where: {
        user: {
          status: 'ACTIVE',
        },
      },
      orderBy: { name: 'asc' },
    });
    config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
  } catch (err) {
    console.error('Error fetching timetable configuration:', err);
  }

  const initialTimeSlots = resolveTimeSlots(config?.slots);

  return (
    <PageShell
      title="Manage Timetable"
      icon={<Calendar />}
      description="Configure classes, assign subjects, and resolve conflicts"
    >
      <div className="space-y-8 font-sans mt-4">
      <AnimatedSection delay={0.2}>
        <AdminTimetableShell
          initialSlots={slots}
          dbClasses={dbClasses}
          dbTeachers={dbTeachers}
          initialTimeSlots={initialTimeSlots}
        />
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
