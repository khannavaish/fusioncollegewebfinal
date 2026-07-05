import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import MarkAttendanceForm from './MarkAttendanceForm';
import LectureNotesForm from './LectureNotesForm';

export default async function TeacherAttendancePage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'TEACHER') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let classSubject = null, students = [], pastLectures = [];
  try {
    classSubject = await prisma.classSubject.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            students: { include: { user: true }, orderBy: { name: 'asc' } },
          },
        },
        subject: true,
        teacher: true,
      },
    });
    if (classSubject) {
      students = classSubject.class.students;
      pastLectures = await prisma.lecture.findMany({
        where: { classSubjectId: id },
        orderBy: { date: 'desc' },
        include: {
          attendance: { include: { student: true } },
        },
        take: 30,
      });
    }
  } catch (err) {
    console.error('Error fetching class data:', err);
  }

  // Today's lecture (if exists)
  const today = new Date();
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(today); endOfDay.setHours(23, 59, 59, 999);
  const todaysLecture = pastLectures.find(l => {
    const d = new Date(l.date);
    return d >= startOfDay && d <= endOfDay;
  });

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {classSubject ? `${classSubject.class.name} — ${classSubject.subject.name}` : 'Class Session'}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Attendance marking and lecture notes</p>
        </div>
        <Link href="/teacher/attendance" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          Back to Attendance Center
        </Link>
      </div>

      {!classSubject ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          Class session not found or you are unauthorized.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Two-step workflow */}
          <div className="lg:col-span-3 space-y-6">

            {/* STEP 1: Mark Attendance */}
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-emerald-950/20 border-b border-emerald-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-black">1</div>
                <div>
                  <h2 className="text-sm font-bold text-white">Mark Attendance</h2>
                  <p className="text-[11px] text-zinc-500">Do this at the beginning of the class</p>
                </div>
                {todaysLecture && (
                  <span className="ml-auto px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider">
                    Already Marked Today
                  </span>
                )}
              </div>
              <div className="p-6">
                <MarkAttendanceForm classSubjectId={id} students={students} />
              </div>
            </div>

            {/* STEP 2: Lecture Notes — only shown if today attendance is marked */}
            <div className={`bg-[#0d0f1a] border rounded-xl overflow-hidden ${todaysLecture ? 'border-[#1e233d]' : 'border-[#1e233d] opacity-60'}`}>
              <div className="px-6 py-4 bg-indigo-950/20 border-b border-indigo-500/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">2</div>
                <div>
                  <h2 className="text-sm font-bold text-white">Log Lecture Notes</h2>
                  <p className="text-[11px] text-zinc-500">Do this after the class ends — topics covered, optional photo</p>
                </div>
              </div>
              <div className="p-6">
                {todaysLecture ? (
                  <LectureNotesForm lecture={todaysLecture} />
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-sm">
                    Mark attendance first (Step 1) to unlock lecture notes for today.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Past lectures */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight">Lecture History</h2>
            {pastLectures.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-sm">
                No lectures logged yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {pastLectures.map(lec => {
                  const present = lec.attendance.filter(a => a.status === 'PRESENT').length;
                  const late    = lec.attendance.filter(a => a.status === 'LATE').length;
                  const absent  = lec.attendance.filter(a => a.status === 'ABSENT').length;
                  const total   = lec.attendance.length;
                  const isPending = lec.topic.startsWith('Pending');
                  return (
                    <div key={lec.id} className={`bg-[#0d0f1a] border rounded-xl p-4 space-y-3 ${isPending ? 'border-amber-500/20' : 'border-[#1e233d]'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-[10px] font-bold text-cyan-400 font-mono">
                            {new Date(lec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          {isPending ? (
                            <div className="text-[11px] text-amber-400 mt-1 italic">Lecture notes pending...</div>
                          ) : (
                            <div className="text-xs text-white mt-1 whitespace-pre-line line-clamp-3">{lec.topic}</div>
                          )}
                        </div>
                      </div>
                      {lec.pictureUrl && !isPending && (
                        <img src={lec.pictureUrl} alt="Board Notes" className="w-full h-28 object-contain rounded-lg border border-[#1e233d] bg-black/30" />
                      )}
                      <div className="pt-2 border-t border-[#1e233d] flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Attendance</span>
                        <span className="font-bold">
                          <span className="text-emerald-400">{present + late}</span>
                          <span className="text-zinc-500">/{total} present</span>
                          {absent > 0 && <span className="text-red-400 ml-2">{absent} absent</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
