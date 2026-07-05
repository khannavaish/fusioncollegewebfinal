import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function StudentAttendancePage() {
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

  // Fetch student's attendance records
  let student = null;
  let attendanceRecords = [];
  let attendanceRate = 0;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });
    student = dbUser?.student;

    if (student) {
      attendanceRecords = await prisma.attendance.findMany({
        where: { studentId: student.id },
        include: {
          lecture: {
            include: {
              classSubject: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: { lecture: { date: 'desc' } },
        take: 50,
      });

      // Calculate attendance rate
      const totalLectures = await prisma.lecture.count({
        where: {
          classSubject: {
            classId: student.classId,
          },
        },
      });

      const presentLectures = await prisma.attendance.count({
        where: {
          studentId: student.id,
          status: 'PRESENT',
        },
      });

      attendanceRate = totalLectures > 0 ? ((presentLectures / totalLectures) * 100).toFixed(1) : 0;
    }
  } catch (err) {
    console.error('Error fetching student attendance:', err);
  }

  // Count by status
  const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter(a => a.status === 'ABSENT').length;
  const leaveCount = attendanceRecords.filter(a => a.status === 'LEAVE').length;
  const lateCount = attendanceRecords.filter(a => a.status === 'LATE').length;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Attendance</h1>
          <p className="text-zinc-400 text-sm mt-1">View your attendance record</p>
        </div>
        <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</div>
          <div className="text-3xl font-black text-cyan-400 mt-2">{attendanceRate}%</div>
          <p className="text-[10px] text-zinc-500 mt-1">Overall</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Present</div>
          <div className="text-3xl font-black text-emerald-400 mt-2">{presentCount}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Lectures</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Absent</div>
          <div className="text-3xl font-black text-red-400 mt-2">{absentCount}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Lectures</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Leave</div>
          <div className="text-3xl font-black text-amber-400 mt-2">{leaveCount}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Days</p>
        </div>
        <div className="bg-[#16192b]/50 border border-[#1e233d] rounded-xl p-6">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Late</div>
          <div className="text-3xl font-black text-orange-400 mt-2">{lateCount}</div>
          <p className="text-[10px] text-zinc-500 mt-1">Arrivals</p>
        </div>
      </div>

      {attendanceRecords.length === 0 ? (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
          No attendance records yet.
        </div>
      ) : (
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e233d] text-xs font-bold uppercase tracking-wider text-zinc-400 bg-[#16192b]/50">
                  <th className="p-4">Date</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e233d] text-sm text-zinc-300">
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#16192b]/20 transition-colors">
                    <td className="p-4">{new Date(record.lecture.date).toLocaleDateString()}</td>
                    <td className="p-4">{record.lecture.classSubject.subject.name}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${
                        record.status === 'PRESENT' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20' :
                        record.status === 'ABSENT' ? 'bg-red-950/50 text-red-400 border border-red-500/20' :
                        record.status === 'LEAVE' ? 'bg-amber-950/50 text-amber-400 border border-amber-500/20' :
                        'bg-orange-950/50 text-orange-400 border border-orange-500/20'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
