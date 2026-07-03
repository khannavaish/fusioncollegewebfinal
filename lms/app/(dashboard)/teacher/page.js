import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { resolveTimeSlots } from '@/utils/timetable';

function normalizeText(value = '') {
  return value.toString().trim().replace(/\s+/g, ' ').toLowerCase();
}

function sameText(a = '', b = '') {
  return normalizeText(a) === normalizeText(b);
}

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function parseSlot(slotStr) {
  if (!slotStr) return null;
  const parts = slotStr.split('-');
  if (parts.length < 2) return null;
  const startMin = timeToMinutes(parts[0].trim());
  const endMin = timeToMinutes(parts[1].trim());
  if (startMin == null || endMin == null) return null;
  return { startMin, endMin };
}

function splitTimetableClassName(name = '') {
  const trimmed = name.toString().trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('BOYS ')) return { section: 'BOYS', className: trimmed.replace(/^boys\s+/i, '').trim() };
  if (upper.startsWith('GIRLS ')) return { section: 'GIRLS', className: trimmed.replace(/^girls\s+/i, '').trim() };
  if (upper.startsWith('OTHER ')) return { section: 'OTHER', className: trimmed.replace(/^other\s+/i, '').trim() };
  return { section: null, className: trimmed };
}

function classDisplayNameFromSlot(slot) {
  if (!slot?.className) return '';
  return normalizeText(slot.section) === 'other' ? slot.className : `${slot.section} ${slot.className}`.trim();
}

function slotMatchesClass(slot, classInfo) {
  const slotClassName = normalizeText(slot.className);
  const slotSection = normalizeText(slot.section);
  const className = normalizeText(classInfo.className);
  const sectionMatch = !classInfo.section || slotSection === normalizeText(classInfo.section);
  const classMatch = slotClassName === className || slotClassName.includes(className) || className.includes(slotClassName);
  return sectionMatch && classMatch;
}

function sortSlotsByTime(slots, timeSlots) {
  const rankByTime = new Map(timeSlots.map((slot, index) => [normalizeText(slot), index]));
  return [...slots].sort((a, b) => {
    const ai = rankByTime.has(normalizeText(a.timeSlot)) ? rankByTime.get(normalizeText(a.timeSlot)) : Number.MAX_SAFE_INTEGER;
    const bi = rankByTime.has(normalizeText(b.timeSlot)) ? rankByTime.get(normalizeText(b.timeSlot)) : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

function getScheduledTimeSlots(className, subjectName, timetableSlots, timeSlots) {
  const classInfo = splitTimetableClassName(className);
  return sortSlotsByTime(
    timetableSlots.filter((slot) => {
      if (!slot?.className || !slot?.subject || !slot?.timeSlot) return false;
      return slotMatchesClass(slot, classInfo) && sameText(slot.subject, subjectName);
    }),
    timeSlots,
  )
    .map((slot) => slot.timeSlot)
    .filter(Boolean);
}

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUserRole = null;
  try {
    dbUserRole = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUserRole || dbUserRole.role !== 'TEACHER') redirect(dbUserRole ? `/${dbUserRole.role.toLowerCase()}` : '/login');

  let teacher = null;
  let classSubjects = [];
  let timetableSlots = [];
  let timetableTimeSlots = [];
  let classInchargeList = [];
  let classStatusCard = null;

  try {
    const fullUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        teacher: {
          include: {
            subjects: {
              include: {
                subject: true,
                class: { include: { _count: { select: { students: true } } } },
              },
            },
          },
        },
      },
    });
    teacher = fullUser?.teacher;
    classSubjects = teacher?.subjects || [];

    const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
    timetableSlots = await prisma.timetableSlot.findMany();
    timetableTimeSlots = resolveTimeSlots(config?.slots);

    const classGroups = new Map();
    for (const slot of timetableSlots) {
      if (!slot?.className || !slot?.subject || !slot?.timeSlot) continue;
      const key = normalizeText(`${slot.section || ''}|${slot.className}`);
      if (!classGroups.has(key)) classGroups.set(key, []);
      classGroups.get(key).push(slot);
    }

    classInchargeList = [...classGroups.values()]
      .map((slots) => {
        const head = sortSlotsByTime(slots, timetableTimeSlots)[0];
        if (!head) return null;

        const displayClass = classDisplayNameFromSlot(head);
        const matchedClassSubject = classSubjects.find(
          (cs) => sameText(cs.class.name, displayClass) && sameText(cs.subject.name, head.subject),
        ) || classSubjects.find(
          (cs) => sameText(cs.class.name, head.className) && sameText(cs.subject.name, head.subject),
        ) || classSubjects.find(
          (cs) => sameText(cs.class.name, head.className.replace(/\./g, '').replace(/\s/g, '')) && sameText(cs.subject.name, head.subject),
        );

        if (!matchedClassSubject || matchedClassSubject.teacherId !== teacher?.id) return null;

        return {
          id: `${head.section}-${head.className}-${head.subject}-${head.timeSlot}`,
          className: displayClass,
          subject: head.subject,
          timeSlot: head.timeSlot,
          students: matchedClassSubject.class?._count?.students || 0,
        };
      })
      .filter(Boolean);

    const teacherSlots = timetableSlots.filter((slot) => classSubjects.some((cs) => (
      sameText(cs.subject.name, slot.subject) &&
      (sameText(cs.class.name, classDisplayNameFromSlot(slot)) || sameText(cs.class.name, slot.className)) &&
      sameText(teacher?.name, slot.teacher)
    )));

    if (teacherSlots.length > 0) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const parsedSlots = teacherSlots
        .map((slot) => ({ ...slot, parsed: parseSlot(slot.timeSlot) }))
        .filter((slot) => slot.parsed)
        .sort((a, b) => a.parsed.startMin - b.parsed.startMin);

      const currentClass = parsedSlots.find((slot) => nowMinutes >= slot.parsed.startMin && nowMinutes <= slot.parsed.endMin);
      const nextClass = parsedSlots.find((slot) => slot.parsed.startMin > nowMinutes);
      const allDone = parsedSlots.length > 0 && parsedSlots.every((slot) => slot.parsed.endMin < nowMinutes);

      if (currentClass) {
        classStatusCard = {
          type: 'active',
          label: 'Class In Progress',
          detail: `${currentClass.subject} - ${classDisplayNameFromSlot(currentClass)}`,
          time: currentClass.timeSlot,
          color: 'emerald',
        };
      } else if (nextClass) {
        const minsUntil = nextClass.parsed.startMin - nowMinutes;
        classStatusCard = {
          type: 'next',
          label: minsUntil <= 10 ? 'Next Class Starting Soon' : 'Next Class',
          detail: `${nextClass.subject} - ${classDisplayNameFromSlot(nextClass)}`,
          time: nextClass.timeSlot,
          color: minsUntil <= 10 ? 'amber' : 'cyan',
        };
      } else if (allDone) {
        classStatusCard = {
          type: 'done',
          label: 'Done for Today',
          detail: `You had ${parsedSlots.length} class${parsedSlots.length !== 1 ? 'es' : ''} today.`,
          time: null,
          color: 'zinc',
        };
      }
    }
  } catch (e) {
    console.error('Timetable status error:', e);
  }

  const teacherName = teacher?.name || user.email;
  const qualification = teacher?.qualification || 'Senior Subject Specialist';
  const totalStudents = classSubjects.reduce((sum, cs) => sum + (cs.class._count?.students || 0), 0);

  const colorMap = {
    emerald: { bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500', dot: 'bg-emerald-400 animate-pulse' },
    amber: { bg: 'bg-amber-950/30', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500', dot: 'bg-amber-400 animate-pulse' },
    cyan: { bg: 'bg-cyan-950/20', border: 'border-cyan-500/20', text: 'text-cyan-400', badge: 'bg-cyan-600', dot: 'bg-cyan-400' },
    zinc: { bg: 'bg-zinc-900/30', border: 'border-zinc-700/30', text: 'text-zinc-300', badge: 'bg-zinc-600', dot: 'bg-zinc-500' },
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Teacher Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {teacherName}</p>
        </div>
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">{qualification}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Fusion Faculty</div>
        </div>
      </div>

      {classStatusCard ? (
        <div className={`${colorMap[classStatusCard.color].bg} border ${colorMap[classStatusCard.color].border} rounded-xl p-5 flex items-center gap-4`}>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorMap[classStatusCard.color].dot}`} />
          <div className="flex-1">
            <div className={`text-xs font-bold uppercase tracking-wider ${colorMap[classStatusCard.color].text}`}>
              {classStatusCard.label}
            </div>
            <div className="text-white font-bold text-base mt-0.5">{classStatusCard.detail}</div>
            {classStatusCard.time && (
              <div className="text-zinc-400 text-xs mt-0.5">{classStatusCard.time}</div>
            )}
          </div>
          {classStatusCard.type === 'active' && (
            <Link href="/teacher/attendance"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors cursor-pointer">
              Mark Attendance
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/20 border border-zinc-700/20 rounded-xl p-4 text-xs text-zinc-500">
          No timetable schedule found yet. Ask admin to set up the timetable.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Assigned Classes</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{classSubjects.length} Classes</div>
          <p className="text-[10px] text-zinc-500 mt-1">Total enrolled students: {totalStudents}</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance Today</div>
          <Link href="/teacher/attendance" className="text-3xl font-black text-emerald-400 mt-2 block hover:text-emerald-300 transition-colors">
            Mark Now
          </Link>
          <p className="text-[10px] text-zinc-500 mt-1">Separate Step 1 (roll call) &amp; Step 2 (lecture notes)</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Class Incharge</h2>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Based on the first scheduled lecture</span>
        </div>
        {classInchargeList.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-sm">
            You are not the first-period teacher for any class in the current timetable.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classInchargeList.map((item) => (
              <div key={item.id} className="bg-[#0d0f1a] border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Class Incharge</div>
                  <div className="mt-1 text-base font-bold text-white">{item.className}</div>
                  <div className="text-sm text-cyan-400 mt-0.5">{item.subject}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">Time Slot: {item.timeSlot}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{item.students}</div>
                  <div className="text-xs text-zinc-400">Students</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">My Classes</h2>
        {classSubjects.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
            No classes assigned yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classSubjects.map((cs) => (
              <div key={cs.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#2b3052] transition-colors">
                <div>
                  <div className="font-bold text-white text-base">{cs.class.name}</div>
                  <div className="text-xs text-cyan-400 mt-0.5">{cs.subject.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Time Slot: {getScheduledTimeSlots(cs.class.name, cs.subject.name, timetableSlots, timetableTimeSlots).join(', ') || 'Not scheduled yet'}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">{cs.class._count?.students || 0} students</div>
                </div>
                <Link href={`/teacher/classes/${cs.id}/attendance`}
                  className="px-4 py-2 bg-[#16192b] border border-[#2b3052] hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 font-bold text-xs rounded-lg transition-colors text-center cursor-pointer">
                  Mark Attendance
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/teacher/attendance" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            Attendance Center
          </Link>
          <Link href="/teacher/classes" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            View My Classes
          </Link>
          <Link href="/teacher/assignments" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            Manage Assignments
          </Link>
        </div>
      </div>
    </div>
  );
}
