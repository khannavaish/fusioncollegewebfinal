import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import AdminTimetableShell from './AdminTimetableShell';
import { resolveTimeSlots } from '@/utils/timetable';

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
    <div className="space-y-8 font-sans">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">College Timetable</h1>
            <p className="text-zinc-400 text-sm mt-1">Review the live timetable, then open edit mode when changes are needed</p>
          </div>
          <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300">
            &larr; Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <AdminTimetableShell initialSlots={slots} 
          dbClasses={dbClasses} 
          initialTimeSlots={initialTimeSlots} 
          dbTeachers={dbTeachers}
        />
      </AnimatedSection>
    </div>
  );
}

