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

  // Fetch current slots configuration
  let slots = [];
  try {
    slots = await prisma.timetableSlot.findMany();
  } catch (err) {
    console.error('Error fetching timetable slots:', err);
  }

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

      <TimetableEditor initialSlots={slots} />
    </div>
  );
}
