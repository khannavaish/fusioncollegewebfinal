import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import {
  IconHome, IconGraduationCap, IconUserTie, IconFamily,
  IconBuilding, IconBookOpen, IconClipboard, IconTrophy, IconUsers, IconChatBubble,
} from '@/app/components/icons';
import MobileMenu from '@/app/components/MobileMenu';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile details from database based on email or authId
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: true,
        teacher: true,
        admin: true,
        parent: true,
      },
    });

    // Auto-create user profile if it doesn't exist
    if (!dbUser) {
      // Determine role from user metadata or default to STUDENT
      const userRole = user.user_metadata?.role || 'STUDENT';
      
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          authId: user.id,
          email: user.email,
          role: userRole.toUpperCase(),
          status: 'ACTIVE',
        },
      });

      // Create role-specific profile based on role
      switch (userRole.toUpperCase()) {
        case 'ADMIN':
          await prisma.admin.create({
            data: {
              id: user.id,
              userId: user.id,
              name: user.email?.split('@')[0] || 'Admin',
            },
          });
          break;
        case 'TEACHER':
          await prisma.teacher.create({
            data: {
              id: user.id,
              userId: user.id,
              name: user.email?.split('@')[0] || 'Teacher',
            },
          });
          break;
        case 'STUDENT':
          await prisma.student.create({
            data: {
              id: user.id,
              userId: user.id,
              name: user.email?.split('@')[0] || 'Student',
              rollNumber: 'TEMP-' + user.id.slice(0, 8),
            },
          });
          break;
        case 'PARENT':
          await prisma.parent.create({
            data: {
              id: user.id,
              userId: user.id,
              name: user.email?.split('@')[0] || 'Parent',
            },
          });
          break;
      }

      // Re-fetch with includes
      dbUser = await prisma.user.findUnique({
        where: { authId: user.id },
        include: {
          student: true,
          teacher: true,
          admin: true,
          parent: true,
        },
      });
    }
  } catch (err) {
    console.error('Error fetching/creating user profile:', err);
  }

  // Deactivated account check
  if (dbUser && dbUser.status === 'INACTIVE') {
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/login?error=inactive');
  }

  const name = dbUser?.student?.name || dbUser?.teacher?.name || dbUser?.admin?.name || dbUser?.parent?.name || user.email;
  const role = dbUser?.role || 'STUDENT';

  const handleSignOut = async () => {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen h-dvh bg-[#090b11] text-zinc-100 flex font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1e233d] bg-[#0d0f1a] hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[#1e233d] gap-2">
          <img
            src="/logo.png"
            alt="Fusion College Logo"
            className="w-8 h-8 rounded-full border border-cyan-500/30 object-contain bg-white"
          />
          <span className="font-bold tracking-tight text-white">FUSION LMS</span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest mb-2">Navigation</p>
          <a href={`/${role.toLowerCase()}`} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
            <IconHome className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            Dashboard
          </a>

          {role === 'ADMIN' && (
            <>
              <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">People</p>
              <a href="/admin/students" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconGraduationCap className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                Students
              </a>
              <a href="/admin/teachers" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconUserTie className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Teachers
              </a>
              <a href="/admin/parents" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconUsers className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                Parents
              </a>
              <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Academic</p>
              <a href="/admin/classes" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBuilding className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                Classes
              </a>
              <a href="/admin/subjects" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBookOpen className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                Subjects
              </a>
              <a href="/admin/timetable" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconClipboard className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Edit Timetable
              </a>
              <a href="/admin/exams" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconTrophy className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                Schedule Exams
              </a>
              <a href="/admin/whatsapp" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconChatBubble className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                WhatsApp Alerts
              </a>
              <a href="/admin/announcements" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconChatBubble className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Announcements
              </a>
              <a href="/admin/notifications" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconChatBubble className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                Notification History
              </a>
              <a href="/admin/reports" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconTrophy className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                Reports Center
              </a>
            </>
          )}

          {role === 'TEACHER' && (
            <>
              <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Teaching</p>
              <a href="/teacher/classes" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBuilding className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                My Classes
              </a>
              <a href="/teacher/assignments" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconClipboard className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                Assignments
              </a>
              <a href="/teacher/attendance" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconClipboard className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Attendance
              </a>
              <a href="/timetable" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBuilding className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                Timetable
              </a>
              <a href="/teacher/reports" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconTrophy className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Reports &amp; Marks
              </a>
              <a href="/teacher/announcements" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconChatBubble className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Announcements
              </a>
              <a href="/teacher/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconUsers className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                My Profile
              </a>
            </>
          )}

          {role === 'STUDENT' && (
            <>
              <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Learning</p>
              <a href="/student/courses" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBookOpen className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                My Subjects
              </a>
              <a href="/student/assignments" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconClipboard className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                Assignments
              </a>
              <a href="/student/attendance" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconClipboard className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Attendance
              </a>
              <a href="/student/grades" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconTrophy className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                My Grades
              </a>
              <a href="/timetable" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBuilding className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                Timetable
              </a>
              <a href="/student/announcements" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconChatBubble className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                Announcements
              </a>
              <a href="/student/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconUsers className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                My Profile
              </a>
            </>
          )}

          {role === 'PARENT' && (
            <>
              <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Family</p>
              <a href="/timetable" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <IconBuilding className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                Timetable
              </a>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-[#1e233d] flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center font-bold text-cyan-400">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{name}</div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">{role}</div>
            </div>
          </div>
          <form action={handleSignOut} className="mt-2">
            <button type="submit" className="w-full text-left text-xs text-red-400 hover:text-red-300 font-medium py-2 px-3 rounded hover:bg-red-950/20 transition-colors cursor-pointer">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main pane */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="h-16 border-b border-[#1e233d] bg-[#0d0f1a]/50 backdrop-blur px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenu role={role} name={name} handleSignOutAction={handleSignOut} />
            <div className="md:hidden flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Fusion College Logo"
                className="w-8 h-8 rounded-full object-contain bg-white"
              />
              <span className="font-bold text-white text-sm">FUSION LMS</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs px-2.5 py-1 rounded bg-[#1e233d] border border-[#2b3052] font-semibold text-zinc-300">
              Session 2026
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto overflow-x-hidden min-h-0 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

