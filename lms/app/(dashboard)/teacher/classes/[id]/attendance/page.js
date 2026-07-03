import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import AttendanceForm from './AttendanceForm';

export default async function TeacherAttendancePage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has TEACHER role
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

  // Fetch class subject details and students
  let classSubject = null;
  let students = [];
  let pastLectures = [];

  try {
    classSubject = await prisma.classSubject.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            students: {
              include: {
                user: true,
              },
              orderBy: { name: 'asc' },
            },
          },
        },
        subject: true,
        teacher: true,
      },
    });

    if (classSubject) {
      students = classSubject.class.students;
      
      // Fetch past lectures logged for this class subject
      pastLectures = await prisma.lecture.findMany({
        where: { classSubjectId: id },
        orderBy: { date: 'desc' },
        include: {
          attendance: true,
        },
      });
    }
  } catch (err) {
    console.error('Error fetching class/lecture details:', err);
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Class Logging & Attendance</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {classSubject ? `${classSubject.class.name} — ${classSubject.subject.name}` : 'Class Session'}
          </p>
        </div>
        <Link href="/teacher/attendance" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Attendance Center
        </Link>
      </div>

      {!classSubject ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          Class session not found or you are unauthorized.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
              <h2 className="text-base font-bold text-white mb-1">Mark Daily Attendance</h2>
              <p className="text-[11px] text-zinc-500 mb-5">Fill out topics taught, optionally attach a whiteboard photo, and submit logs.</p>
              
              <AttendanceForm classSubjectId={id} students={students} />
            </div>
          </div>

          {/* Past Lecture Logs Column */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Lecture Log History</h2>
            {pastLectures.length === 0 ? (
              <div className="bg-[#0d0f1a]/50 border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-xs">
                No lectures logged yet. Submit the form on the left to create your first log.
              </div>
            ) : (
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-1">
                {pastLectures.map((lec) => {
                  const present = lec.attendance.filter(a => a.status === 'PRESENT').length;
                  const late = lec.attendance.filter(a => a.status === 'LATE').length;
                  const total = lec.attendance.length;
                  
                  return (
                    <div key={lec.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-[10px] font-bold text-cyan-400 font-mono">
                            {new Date(lec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="font-semibold text-xs text-white mt-1 line-clamp-3 whitespace-pre-line">{lec.topic}</div>
                        </div>
                      </div>

                      {lec.pictureUrl && (
                        <div className="relative border border-[#1e233d] rounded-lg overflow-hidden group bg-black/50">
                          <img
                            src={lec.pictureUrl}
                            alt="Lecture Board Notes"
                            className="w-full h-32 object-contain hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[8px] text-zinc-400">
                            Whiteboard Photo
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#1e233d] flex justify-between items-center text-[10px] text-zinc-400">
                        <span>Attendance Summary:</span>
                        <span className="font-bold text-white">
                          {present + late} / {total} Present
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
