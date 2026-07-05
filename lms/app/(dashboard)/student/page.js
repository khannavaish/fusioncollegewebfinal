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

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has STUDENT role
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true },
    });
  } catch (err) {
    console.error('Error fetching user role:', err);
  }

  if (!dbUser || dbUser.role !== 'STUDENT') {
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  // Fetch student profile details from db
  let student = null;
  let activeCourses = [];
  let attendanceRate = '100.0';
  let classIncharge = 'No teacher assigned';
  let totalAssignments = 0;
  let submittedCount = 0;
  let upcomingDeadlines = [];

  try {
    const dbFullUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });
    student = dbFullUser?.student;

    if (student) {
      // 1. Fetch active courses (ClassSubject mappings)
      const classSubjects = await prisma.classSubject.findMany({
        where: { classId: student.classId },
        include: {
          subject: true,
          teacher: true,
        },
      });

      // Calculate attendance per subject
      for (const cs of classSubjects) {
        const totalLecs = await prisma.lecture.count({
          where: { classSubjectId: cs.id },
        });
        const presentLecs = await prisma.attendance.count({
          where: {
            studentId: student.id,
            lecture: { classSubjectId: cs.id },
            status: 'PRESENT',
          },
        });
        const rate = totalLecs > 0 ? Math.round((presentLecs / totalLecs) * 100) : 100;
        activeCourses.push({
          name: cs.subject.name,
          teacher: cs.teacher.name,
          progress: rate, // using attendance rate as progress representation
        });
      }

      // 2. Fetch overall attendance rate
      const totalLectures = await prisma.lecture.count({
        where: { classSubject: { classId: student.classId } },
      });
      const presentLectures = await prisma.attendance.count({
        where: { studentId: student.id, status: 'PRESENT' },
      });
      attendanceRate = totalLectures > 0 ? ((presentLectures / totalLectures) * 100).toFixed(1) : '100.0';

      // 3. Determine class incharge dynamically from timetable first slot
      const slots = await prisma.timetableSlot.findMany();
      const config = await prisma.timetableConfig.findUnique({ where: { id: 'default' } });
      const timetableTimeSlots = resolveTimeSlots(config?.slots);
      const classInfo = splitTimetableClassName(student.class.name);
      const matchingSlots = slots.filter(slot => slotMatchesClass(slot, classInfo));
      const sorted = sortSlotsByTime(matchingSlots, timetableTimeSlots);
      const firstSlot = sorted.find((s) => s.subject?.trim() && s.teacher?.trim());
      if (firstSlot) {
        classIncharge = firstSlot.teacher;
      }

      // 4. Fetch assignments
      const dbAssignments = await prisma.assignment.findMany({
        where: { classSubject: { classId: student.classId } },
        include: {
          classSubject: { include: { subject: true } },
          submissions: { where: { studentId: student.id } },
        },
        orderBy: { deadline: 'asc' },
      });

      totalAssignments = dbAssignments.length;
      submittedCount = dbAssignments.filter(a => a.submissions.length > 0).length;

      upcomingDeadlines = dbAssignments
        .filter(a => a.submissions.length === 0)
        .slice(0, 5)
        .map(a => ({
          title: a.title,
          subject: a.classSubject.subject.name,
          deadline: new Date(a.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: 'Pending',
        }));

      if (upcomingDeadlines.length === 0 && totalAssignments > 0) {
        upcomingDeadlines = dbAssignments
          .slice(0, 2)
          .map(a => ({
            title: a.title,
            subject: a.classSubject.subject.name,
            deadline: new Date(a.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Submitted',
          }));
      }
    }
  } catch (err) {
    console.error('Error fetching student dashboard info:', err);
  }

  const studentClassName = student?.class?.name || 'Not Enrolled yet';
  const studentRollNumber = student?.rollNumber || 'FC-PENDING';

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Student Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Welcome back, {student?.name || user.email}</p>
        </div>
        <div className="bg-[#16192b] border border-[#2b3052] rounded-lg px-4 py-2.5 text-xs text-zinc-300">
          <div className="font-bold text-white">{studentClassName}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Roll No: {studentRollNumber}</div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{attendanceRate}%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Goal: Keep above 85% for scholarship merit</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Assignments Submitted</div>
          <div className="text-3xl font-black text-white mt-2">{submittedCount} / {totalAssignments}</div>
          <p className="text-[10px] text-zinc-500 mt-1">{totalAssignments - submittedCount} pending tasks require completion</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Class Incharge</div>
          <div className="text-2xl font-black text-emerald-400 mt-2 truncate">{classIncharge}</div>
          <p className="text-[10px] text-zinc-500 mt-1">First Scheduled slot teacher</p>
        </div>
      </div>

      {/* Course Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white tracking-tight">Active Courses</h2>
          {activeCourses.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-sm">
              No active subjects assigned to your class yet.
            </div>
          ) : (
            <div className="space-y-4">
              {activeCourses.map((course, idx) => (
                <div key={idx} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-white text-base">{course.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{course.teacher}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Attendance</div>
                      <div className="text-sm font-black text-white mt-0.5">{course.progress}%</div>
                    </div>
                    <div className="w-24 bg-[#16192b] h-2 rounded-full overflow-hidden border border-[#2b3052]">
                      <div className={`h-full ${course.progress >= 85 ? 'bg-emerald-500' : course.progress >= 75 ? 'bg-cyan-500' : 'bg-red-500'}`} style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignments Panel */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white tracking-tight">Upcoming Deadlines</h2>
          {upcomingDeadlines.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-sm">
              No assignments assigned yet.
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingDeadlines.map((assignment, idx) => (
                <div key={idx} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-sm text-white truncate">{assignment.title}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${assignment.status === 'Submitted' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' : 'bg-amber-950/50 text-amber-400 border border-amber-500/20'}`}>
                      {assignment.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{assignment.subject}</span>
                    <span className="text-zinc-500">{assignment.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/student/courses" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Courses
          </Link>
          <Link href="/student/assignments" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Assignments
          </Link>
          <Link href="/student/grades" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Grades
          </Link>
          <Link href="/student/attendance" className="px-4 py-3 bg-[#0d0f1a] border border-[#1e233d] rounded-lg text-sm font-medium text-white hover:bg-[#1e233d] transition-colors text-center">
            My Attendance
          </Link>
        </div>
      </div>
    </div>
  );
}
