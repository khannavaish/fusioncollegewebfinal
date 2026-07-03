import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

const timeSlots = [
  '7:30-8:10',
  '8:10-8:50',
  '8:50-9:30',
  '9:30-9:50', // Break
  '9:50-10:30',
  '10:30-11:10',
  '11:10-11:50',
];

const defaultSeed = [
  // Boys Medical
  { section: 'BOYS', className: 'Medical', timeSlot: '7:30-8:10', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'BOYS', className: 'Medical', timeSlot: '8:10-8:50', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'Medical', timeSlot: '8:50-9:30', subject: 'Biology', teacher: 'Sir Abrar' },
  { section: 'BOYS', className: 'Medical', timeSlot: '9:50-10:30', subject: 'Chemistry', teacher: 'Sir Tahir' },
  { section: 'BOYS', className: 'Medical', timeSlot: '10:30-11:10', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'BOYS', className: 'Medical', timeSlot: '11:10-11:50', subject: 'Islamiat', teacher: 'Sir Akhtar' },

  // Boys I.C.S I
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '7:30-8:10', subject: 'Computer', teacher: 'Sir Faizan' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '8:10-8:50', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '8:50-9:30', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '9:50-10:30', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '10:30-11:10', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '11:10-11:50', subject: 'Urdu', teacher: 'Sir Naeem' },

  // Boys I.C.S II
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '7:30-8:10', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '8:10-8:50', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '8:50-9:30', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '9:50-10:30', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '10:30-11:10', subject: 'Computer', teacher: 'Sir Nawaish' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '11:10-11:50', subject: 'Physics', teacher: 'Sir Shafique' },

  // Girls Medical
  { section: 'GIRLS', className: 'Medical', timeSlot: '7:30-8:10', subject: 'Biology', teacher: 'Sir Abrar' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '8:10-8:50', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '8:50-9:30', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '9:50-10:30', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '10:30-11:10', subject: 'English', teacher: 'Sir Shams' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '11:10-11:50', subject: 'Chemistry', teacher: 'Sir Tahir' },

  // Girls I.C.S
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '7:30-8:10', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '8:10-8:50', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '8:50-9:30', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '9:50-10:30', subject: 'Computer', teacher: 'Mam Sania' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '10:30-11:10', subject: 'Physics', teacher: 'Sir Shafique' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '11:10-11:50', subject: 'English', teacher: 'Sir Shams' },
];

import TimetableClientView from './TimetableClientView';
import { resolveTimeSlots } from '@/utils/timetable';

export default async function UnifiedTimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: { include: { class: true } },
        teacher: true,
      },
    });
  } catch {}

  if (!dbUser) redirect('/login');

  // Fetch slots, classes, and config from DB
  let slots = [], dbClasses = [], config = null;
  try {
    slots = await prisma.timetableSlot.findMany();
    dbClasses = await prisma.class.findMany({ orderBy: { name: 'asc' } });
    config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
  } catch (err) {
    console.error('Error fetching timetable:', err);
  }

  const role = dbUser.role;
  const studentClassName = dbUser.student?.class?.name || '';
  const teacherName = dbUser.teacher?.name || '';

  const initialTimeSlots = resolveTimeSlots(config?.slots);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">College Timetable</h1>
          <p className="text-zinc-400 text-sm mt-1">Master schedule for boys and girls sections</p>
        </div>
        <Link href={`/${role.toLowerCase()}`} className="text-xs text-cyan-400 hover:text-cyan-300">
          &larr; Back to Dashboard
        </Link>
      </div>

      <TimetableClientView 
        initialSlots={slots} 
        dbClasses={dbClasses} 
        initialTimeSlots={initialTimeSlots} 
        role={role} 
        studentClassName={studentClassName} 
        teacherName={teacherName} 
      />
    </div>
  );
}
