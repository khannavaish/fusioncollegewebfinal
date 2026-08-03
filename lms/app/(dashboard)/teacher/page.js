import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import AnimatedSection from '@/app/components/AnimatedSection';
import {
  classDisplayNameFromSlot,
  findMatchingClassSubject,
  getClassGroupKey,
  getFirstClassSlot,
  getScheduledSlotsForClassSubject,
  getScheduleStatus,
  resolveTimeSlots,
  teacherMatchesSlot,
  compareTimeSlots,
} from '@/utils/timetable';

export const dynamic = 'force-dynamic';

function getTeacherClassSubjects(allClassSubjects, teacher, timetableSlots, timeSlots) {
  if (!teacher) return [];

  if (timetableSlots.length === 0) {
    return allClassSubjects.filter((classSubject) => classSubject.teacherId === teacher.id);
  }

  return allClassSubjects
    .map((classSubject) => ({
      ...classSubject,
      scheduledSlots: getScheduledSlotsForClassSubject(
        classSubject,
        timetableSlots,
        timeSlots,
        teacher,
      ),
    }))
    .filter((classSubject) => classSubject.scheduledSlots.length > 0);
}

function getClassInchargeList(allClassSubjects, teacher, timetableSlots, timeSlots) {
  if (!teacher) return [];

  // First, check for manual incharge overrides from Class model
  const manualInchargeClasses = allClassSubjects
    .filter((cs) => cs.class?.inchargeTeacherId === teacher.id)
    .map((cs) => {
      const slot = timetableSlots.find((s) => 
        s?.className && classDisplayNameFromSlot(s) === cs.class.name
      );
      return {
        id: `manual-${cs.class.id}`,
        className: cs.class.name,
        subject: cs.subject.name,
        timeSlot: slot?.timeSlot || 'Manual Assignment',
        students: cs.class._count?.students || 0,
      };
    });

  // If no timetable slots, return only manual assignments
  if (timetableSlots.length === 0) return manualInchargeClasses;

  // Then, add first-period teachers for remaining classes
  const classGroups = new Map();
  for (const slot of timetableSlots) {
    if (!slot?.className || !slot?.timeSlot) continue;
    const key = getClassGroupKey(slot);
    if (!classGroups.has(key)) classGroups.set(key, []);
    classGroups.get(key).push(slot);
  }

  const firstPeriodIncharges = [...classGroups.values()]
    .map((slots) => getFirstClassSlot(slots, timeSlots))
    .filter((slot) => slot && teacherMatchesSlot(teacher, slot))
    .map((slot) => {
      const classSubject = findMatchingClassSubject(allClassSubjects, slot);
      if (!classSubject) return null;

      // Skip if this class already has a manual incharge assignment
      if (manualInchargeClasses.some((mic) => mic.className === classDisplayNameFromSlot(slot))) {
        return null;
      }

      return {
        id: `${slot.section}-${slot.className}-${slot.subject}-${slot.timeSlot}`,
        className: classDisplayNameFromSlot(slot),
        subject: slot.subject,
        timeSlot: slot.timeSlot,
        students: classSubject.class?._count?.students || 0,
      };
    })
    .filter(Boolean);

  const combinedList = [...manualInchargeClasses, ...firstPeriodIncharges];
  return combinedList.sort((a, b) => compareTimeSlots(a.timeSlot, b.timeSlot));
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
  let classInchargeList = [];
  let classStatusCard = null;

  try {
    const fullUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { teacher: true },
    });
    teacher = fullUser?.teacher;

    const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
    const timetableSlots = await prisma.timetableSlot.findMany();
    const timetableTimeSlots = resolveTimeSlots(config?.slots);

    const allClassSubjects = await prisma.classSubject.findMany({
      include: {
        subject: true,
        class: { 
          include: { 
            _count: { select: { students: true } },
            inchargeTeacher: true,
          } 
        },
      },
    });

    classSubjects = getTeacherClassSubjects(allClassSubjects, teacher, timetableSlots, timetableTimeSlots);
    classInchargeList = getClassInchargeList(allClassSubjects, teacher, timetableSlots, timetableTimeSlots);
    const teacherSlots = teacher
      ? timetableSlots.filter((slot) => teacherMatchesSlot(teacher, slot))
      : [];
    classStatusCard = getScheduleStatus(teacherSlots);
  } catch (e) {
    console.error('Timetable status error:', e);
  }

  const teacherName = teacher?.name || user.email;
  const qualification = teacher?.qualification || 'Senior Subject Specialist';
  const totalStudents = classSubjects.reduce((sum, cs) => sum + (cs.class._count?.students || 0), 0);

  const colorMap = {
    emerald: { bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400 animate-pulse' },
    amber: { bg: 'bg-amber-950/30', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' },
    cyan: { bg: 'bg-cyan-950/20', border: 'border-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-400' },
    zinc: { bg: 'bg-zinc-900/30', border: 'border-zinc-700/30', text: 'text-zinc-300', dot: 'bg-zinc-500' },
  };

  return (
    <PageShell
      title="Teacher Dashboard"
      icon={<UserCheck />}
      description={`Welcome back, ${teacherName}`}
      rightContent={
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">{qualification}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Fusion Faculty</div>
        </div>
      }
    >
      <div className="space-y-8 font-sans mt-4">
      <AnimatedSection delay={0.1}>
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
            No class is scheduled right now. Check the timetable for upcoming slots.
          </div>
        )}
      </AnimatedSection>

      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
            <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Scheduled Classes</div>
            <div className="text-3xl font-black text-cyan-400 mt-2">{classSubjects.length} Classes</div>
            <p className="text-[10px] text-zinc-500 mt-1">Total enrolled students: {totalStudents}</p>
          </div>
          <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
            <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance Today</div>
            <Link href="/teacher/attendance" className="text-3xl font-black text-emerald-400 mt-2 block hover:text-emerald-300 transition-colors">
              Mark Now
            </Link>
            <p className="text-[10px] text-zinc-500 mt-1">Classes come directly from the saved timetable.</p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Class Incharge</h2>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Based on the first saved lecture</span>
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
      </AnimatedSection>

      <AnimatedSection delay={0.25}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">My Classes</h2>
          {classSubjects.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
              No timetable slots are assigned to you yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classSubjects.map((cs) => (
                <div key={cs.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#2b3052] transition-colors">
                  <div>
                    <div className="font-bold text-white text-base">{cs.class.name}</div>
                    <div className="text-xs text-cyan-400 mt-0.5">{cs.subject.name}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Time Slot: {cs.scheduledSlots?.map((slot) => slot.timeSlot).join(', ') || 'Not scheduled yet'}
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
      </AnimatedSection>

      <AnimatedSection delay={0.3}>
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
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
