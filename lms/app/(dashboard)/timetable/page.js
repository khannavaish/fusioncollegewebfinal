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

  // Fetch slots from database
  let slots = [];
  try {
    slots = await prisma.timetableSlot.findMany();
    if (slots.length === 0) {
      slots = defaultSeed;
    }
  } catch (err) {
    slots = defaultSeed;
  }

  const role = dbUser.role;
  const studentClassName = dbUser.student?.class?.name || '';
  const teacherName = dbUser.teacher?.name || '';

  const getSlot = (section, className, timeSlot) => {
    return slots.find(
      (s) =>
        s.section === section &&
        s.className === className &&
        s.timeSlot === timeSlot
    );
  };

  const shouldHighlightClass = (clsName) => {
    if (role !== 'STUDENT') return false;
    // Basic prefix matching for class name (e.g. "I.C.S I" matches "ICS 1")
    const cleanStudentClass = studentClassName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanClsName = clsName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return cleanStudentClass.includes(cleanClsName) || cleanClsName.includes(cleanStudentClass);
  };

  const shouldHighlightSlot = (slot) => {
    if (!slot || role !== 'TEACHER') return false;
    return slot.teacher.toLowerCase().includes(teacherName.toLowerCase());
  };

  const renderSection = (sectionTitle, sectionCode, classes) => {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 tracking-wider uppercase border-b border-[#1e233d] pb-2">
          {sectionTitle} Section
        </h3>

        <div className="overflow-x-auto border border-[#1e233d] rounded-xl bg-[#0d0f1a]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-[#1e233d] bg-[#16192b]/50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-28">Class</th>
                {timeSlots.map((ts) => (
                  <th key={ts} className="px-3 py-3 w-36 border-r border-[#1e233d] last:border-r-0">
                    {ts === '9:30-9:50' ? 'Break' : ts}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e233d]">
              {classes.map((clsName) => {
                const isStudentClass = shouldHighlightClass(clsName);
                return (
                  <tr
                    key={clsName}
                    className={`transition-colors ${
                      isStudentClass
                        ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                        : 'hover:bg-[#16192b]/10'
                    }`}
                  >
                    <td className={`px-4 py-4 text-xs font-bold text-left border-r border-[#1e233d] ${isStudentClass ? 'text-indigo-400 font-extrabold' : 'text-white'}`}>
                      {clsName} {isStudentClass && '★'}
                    </td>
                    {timeSlots.map((ts) => {
                      if (ts === '9:30-9:50') {
                        return (
                          <td key={ts} className="px-2 py-4 bg-[#16192b]/30 text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-r border-[#1e233d]">
                            BREAK
                          </td>
                        );
                      }

                      const slot = getSlot(sectionCode, clsName, ts);
                      const isTeacherSlot = shouldHighlightSlot(slot);

                      return (
                        <td
                          key={ts}
                          className={`p-1.5 border-r border-[#1e233d] last:border-r-0 relative transition-all ${
                            isTeacherSlot
                              ? 'bg-cyan-950/30'
                              : ''
                          }`}
                        >
                          <div className={`min-h-12 flex flex-col justify-center items-center rounded-lg p-1.5 border ${
                            isTeacherSlot
                              ? 'border-cyan-500 bg-cyan-950/50 shadow shadow-cyan-900/30'
                              : 'border-[#1e233d] bg-black/20'
                          }`}>
                            <span className={`text-[11px] font-bold ${isTeacherSlot ? 'text-cyan-400' : 'text-zinc-100'}`}>
                              {slot?.subject || '—'}
                            </span>
                            <span className="text-[9px] text-zinc-400 mt-0.5">
                              {slot?.teacher || '—'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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

      {(role === 'STUDENT' && studentClassName) && (
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300">
          ⭐️ Your class (<span className="font-bold text-white">{studentClassName}</span>) rows are highlighted below to help you find your schedule easily.
        </div>
      )}

      {(role === 'TEACHER' && teacherName) && (
        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-4 text-xs text-cyan-300">
          ⭐️ Slots assigned to you (<span className="font-bold text-white">{teacherName}</span>) are highlighted with a cyan border below.
        </div>
      )}

      {renderSection('Boys', 'BOYS', ['Medical', 'I.C.S I', 'I.C.S II'])}
      {renderSection('Girls', 'GIRLS', ['Medical', 'I.C.S'])}
    </div>
  );
}
