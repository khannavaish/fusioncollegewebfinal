import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import TimetableEditor from './TimetableEditor';

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

  // Fetch current slots, classes, and time slots configuration
  let slots = [], dbClasses = [], config = null;
  try {
    slots = await prisma.timetableSlot.findMany();
    dbClasses = await prisma.class.findMany({ orderBy: { name: 'asc' } });
    config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
  } catch (err) {
    console.error('Error fetching timetable configuration:', err);
  }

  const initialTimeSlots = (config?.slots && Array.isArray(config.slots)) 
    ? config.slots 
    : ['7:30-8:10', '8:10-8:50', '8:50-9:30', '9:50-10:30', '10:30-11:10', '11:10-11:50'];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">College Timetable Editor</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage master timetable scheduling for Boys & Girls sections</p>
        </div>
        <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300">
          &larr; Back to Dashboard
        </Link>
      </div>

      <TimetableEditor 
        initialSlots={slots} 
        dbClasses={dbClasses} 
        initialTimeSlots={initialTimeSlots} 
      />
    </div>
  );
}
