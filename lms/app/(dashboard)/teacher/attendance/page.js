import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';
import { IconClipboard } from '@/app/components/icons';
import { getScheduleStatus, getScheduledSlotsForClassSubject, resolveTimeSlots } from '@/utils/timetable';

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

export default async function TeacherAttendanceIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'TEACHER') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let classSubjects = [];
  let classStatusCard = null;
  try {
    const fullUser = await prisma.user.findUnique({ where: { authId: user.id }, include: { teacher: true } });
    const teacher = fullUser?.teacher;
    if (teacher) {
      const today = new Date();
      const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
      const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
      const timetableSlots = await prisma.timetableSlot.findMany();
      const timetableTimeSlots = resolveTimeSlots(config?.slots);

      const allClassSubjects = await prisma.classSubject.findMany({
        include: {
          class: { include: { students: true } },
          subject: true,
          lectures: {
            where: { date: { gte: startOfDay, lte: endOfDay } },
            take: 1,
          },
        },
        orderBy: { class: { name: 'asc' } },
      });

      classSubjects = getTeacherClassSubjects(allClassSubjects, teacher, timetableSlots, timetableTimeSlots);
      const teacherSlots = classSubjects.flatMap((cs) =>
        (cs.scheduledSlots || []).map((slot) => ({
          ...slot,
          className: cs.class.name,
          subject: cs.subject.name,
        })),
      );
      classStatusCard = getScheduleStatus(teacherSlots);
    }
  } catch (err) {
    console.error('Error fetching teacher data:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Attendance Center</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Mark attendance for classes assigned to you in the saved timetable.
            </p>
          </div>
          <Link href="/teacher" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <div className="bg-[#0d0f1a] border border-amber-500/20 rounded-xl p-4 text-sm">
          <div className="flex items-start gap-3">
            <IconClipboard className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Two-step workflow</p>
              <p className="text-zinc-400 text-xs mt-1">
                <strong className="text-emerald-400">Step 1 - Start of Class:</strong> Mark each student as Present, Absent, Late, or Leave.
                Parents receive a WhatsApp notification when their child is first marked present for the day.<br/>
                <strong className="text-indigo-400">Step 2 - After Class:</strong> Add what topics were taught and optionally attach a board photo.
              </p>
            </div>
          </div>
        </div>
  
        {classStatusCard && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4 mt-6">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              {classStatusCard.label}
            </div>
            <div className="mt-1 text-sm font-semibold text-white">{classStatusCard.detail}</div>
            {classStatusCard.time && (
              <div className="mt-1 text-[11px] text-zinc-400">{classStatusCard.time}</div>
            )}
          </div>
        )}
      </AnimatedSection>

      <AnimatedSection delay={0.3}>
        {classSubjects.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-10 text-center text-zinc-500 text-sm">
            No timetable slots are assigned to you yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classSubjects.map(cs => {
              const todayMarked = cs.lectures.length > 0;
              return (
                <div key={cs.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 flex flex-col justify-between hover:border-[#2b3052] transition-colors group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">{cs.class.name}</h3>
                        <p className="text-sm font-semibold text-cyan-400 mt-0.5">{cs.subject.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Time Slot: {cs.scheduledSlots?.map((slot) => slot.timeSlot).join(', ') || 'Not scheduled yet'}
                        </p>
                      </div>
                      {todayMarked ? (
                        <span className="text-[10px] px-2.5 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold uppercase rounded">
                          Marked Today
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-1 bg-amber-950/40 border border-amber-500/30 text-amber-400 font-bold uppercase rounded">
                          Pending
                        </span>
                      )}
                    </div>
  
                    <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-lg p-3 mb-5 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Students</span>
                        <span className="text-sm font-bold text-white mt-0.5 block">{cs.class.students.length}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Academic Year</span>
                        <span className="text-sm font-bold text-white mt-0.5 block">{cs.class.academicYr}</span>
                      </div>
                    </div>
                  </div>
  
                  <div className="flex flex-col gap-2">
                    <Link href={`/teacher/classes/${cs.id}/attendance`}
                      className="block w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider text-center rounded-lg transition-colors cursor-pointer">
                      {todayMarked ? 'View / Re-mark Attendance' : 'Mark Attendance (Step 1)'}
                    </Link>
                    <Link href={`/teacher/classes/${cs.id}/attendance`}
                      className="block w-full py-2.5 bg-[#16192b] border border-[#2b3052] hover:border-indigo-500 text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-wider text-center rounded-lg transition-colors cursor-pointer">
                      {todayMarked ? 'Add / Edit Lecture Notes (Step 2)' : 'Lecture Notes (unlock after Step 1)'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
