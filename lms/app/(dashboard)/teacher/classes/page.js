import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { resolveTimeSlots } from '@/utils/timetable';

function normalizeText(value = '') {
  return value.toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

function splitTimetableClassName(name = '') {
  const trimmed = name.toString().trim();
  const upper = trimmed.toUpperCase();

  if (upper.startsWith('BOYS ')) return { section: 'BOYS', className: trimmed.replace(/^boys\s+/i, '').trim() };
  if (upper.startsWith('GIRLS ')) return { section: 'GIRLS', className: trimmed.replace(/^girls\s+/i, '').trim() };
  if (upper.startsWith('OTHER ')) return { section: 'OTHER', className: trimmed.replace(/^other\s+/i, '').trim() };

  return { section: null, className: trimmed };
}

function getScheduledTimeSlots(className, subjectName, teacherName, timetableSlots, timeSlots) {
  const classInfo = splitTimetableClassName(className);
  const normalizedClassName = normalizeText(classInfo.className);
  const normalizedSubject = normalizeText(subjectName);
  const normalizedTeacher = normalizeText(teacherName || '');
  const rankByTime = new Map(timeSlots.map((slot, index) => [normalizeText(slot), index]));

  const matches = timetableSlots.filter((slot) => {
    const slotClassName = normalizeText(slot.className);
    const slotSection = normalizeText(slot.section);
    const sectionMatch = !classInfo.section || slotSection === normalizeText(classInfo.section);
    const classMatch = slotClassName === normalizedClassName || slotClassName.includes(normalizedClassName) || normalizedClassName.includes(slotClassName);
    const subjectMatch = normalizeText(slot.subject) === normalizedSubject;
    const teacherMatch = !normalizedTeacher || normalizeText(slot.teacher) === normalizedTeacher;
    return sectionMatch && classMatch && subjectMatch && teacherMatch;
  });

  return [...matches]
    .sort((a, b) => {
      const ai = rankByTime.has(normalizeText(a.timeSlot)) ? rankByTime.get(normalizeText(a.timeSlot)) : Number.MAX_SAFE_INTEGER;
      const bi = rankByTime.has(normalizeText(b.timeSlot)) ? rankByTime.get(normalizeText(b.timeSlot)) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    })
    .map((slot) => slot.timeSlot)
    .filter(Boolean);
}

export default async function TeacherClassesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true },
    });
  } catch (err) {
    console.error('Error fetching user role:', err);
  }

  if (!dbUser || dbUser.role !== 'TEACHER') {
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  let teacher = null;
  let classSubjects = [];
  let timetableSlots = [];
  let timetableTimeSlots = [];

  try {
    const fullUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        teacher: true,
      },
    });
    teacher = fullUser?.teacher;

    if (teacher) {
      const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
      timetableSlots = await prisma.timetableSlot.findMany();
      timetableTimeSlots = resolveTimeSlots(config?.slots);

      classSubjects = await prisma.classSubject.findMany({
        where: { teacherId: teacher.id },
        include: {
          class: {
            include: {
              students: {
                include: {
                  user: true,
                },
              },
            },
          },
          subject: true,
        },
      });

      classSubjects = classSubjects.map((cs) => ({
        ...cs,
        scheduledTimeSlots: getScheduledTimeSlots(
          cs.class.name,
          cs.subject.name,
          teacher?.name,
          timetableSlots,
          timetableTimeSlots,
        ),
      }));
    }
  } catch (err) {
    console.error('Error fetching teacher classes:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Classes</h1>
          <p className="text-zinc-400 text-sm mt-1">View and manage your assigned classes</p>
        </div>
        <Link href="/teacher" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {classSubjects.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No classes assigned yet. Contact admin for class assignments.
        </div>
      ) : (
        <div className="space-y-6">
          {classSubjects.map((cs) => (
            <div key={cs.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{cs.class.name}</h3>
                  <p className="text-sm text-cyan-400 mt-1">{cs.subject.name}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Time Slot: {cs.scheduledTimeSlots?.length ? cs.scheduledTimeSlots.join(', ') : 'Not scheduled yet'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Session: {cs.class.academicYr}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{cs.class.students.length}</div>
                  <div className="text-xs text-zinc-400">Students</div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-3">Enrolled Students</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1e233d] text-xs font-bold uppercase tracking-wider text-zinc-400 bg-[#16192b]/50">
                        <th className="p-3">Name</th>
                        <th className="p-3">Roll Number</th>
                        <th className="p-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e233d] text-sm text-zinc-300">
                      {cs.class.students.map((student) => (
                        <tr key={student.id} className="hover:bg-[#16192b]/20 transition-colors">
                          <td className="p-3 font-semibold text-white">{student.name}</td>
                          <td className="p-3">{student.rollNumber}</td>
                          <td className="p-3">{student.user?.email || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/teacher/classes/${cs.id}/attendance`} className="text-xs px-3 py-2 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 hover:bg-cyan-950/20 transition-colors text-center">
                  Take Attendance
                </Link>
                <Link href={`/teacher/assignments`} className="text-xs px-3 py-2 bg-[#1e233d] border border-[#2b3052] rounded text-cyan-400 hover:bg-cyan-950/20 transition-colors text-center">
                  View Assignments
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
