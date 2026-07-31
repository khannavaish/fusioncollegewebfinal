import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import {
  IconHome, IconGraduationCap, IconUserTie, IconFamily,
  IconBuilding, IconBookOpen, IconClipboard, IconTrophy, IconUsers, IconChatBubble, IconDocumentText,
} from '@/app/components/icons';
import MobileMenu from '@/app/components/MobileMenu';
import ThemeToggle from '@/app/components/ThemeToggle';


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

  // Pending password reset count - only loaded for admins (cheap, single count query)
  let pendingResetCount = 0;
  if (role === 'ADMIN') {
    try {
      pendingResetCount = await prisma.passwordResetRequest.count({ where: { status: 'PENDING' } });
    } catch {}
  }

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
          {/* helper to render a nav link with inline svg icon */}
          {(() => {
            const NavLink = ({ href, label, d, hoverColor = 'group-hover:text-cyan-400', badge }) => (
              <a href={href} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-400 hover:text-white transition-all group">
                <svg className={`w-4 h-4 text-zinc-500 ${hoverColor} transition-colors flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                </svg>
                <span className="flex-1">{label}</span>
                {badge}
              </a>
            );

            const ICONS = {
              home:      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
              students:  'M12 14l9-5-9-5-9 5 9 5z',
              teachers:  'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
              parents:   'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
              classes:   'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
              subjects:  'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
              timetable: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
              exams:     'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
              fees:      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
              whatsapp:  'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
              announce:  'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
              history:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
              reports:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14m-6 0a2 2 0 002 2h2a2 2 0 002-2',
              assignments:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
              attendance: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
              grades:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14m-6 0a2 2 0 002 2h2a2 2 0 002-2',
              profile:   'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
            };

            return (
              <>
                <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest mb-2">Navigation</p>
                <NavLink href={`/${role.toLowerCase()}`} label="Dashboard" d={ICONS.home} />

                {role === 'ADMIN' && (<>
                  <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">People</p>
                  <NavLink href="/admin/students"      label="Students"             d={ICONS.students}   hoverColor="group-hover:text-indigo-400" />
                  <NavLink href="/admin/teachers"      label="Teachers"             d={ICONS.teachers}   hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/admin/parents"       label="Parents"              d={ICONS.parents}    hoverColor="group-hover:text-violet-400" />
                  <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Academic</p>
                  <NavLink href="/admin/classes"       label="Classes"              d={ICONS.classes}    hoverColor="group-hover:text-blue-400" />
                  <NavLink href="/admin/subjects"      label="Subjects"             d={ICONS.subjects}   hoverColor="group-hover:text-emerald-400" />
                  <NavLink href="/admin/timetable"     label="Edit Timetable"       d={ICONS.timetable}  hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/admin/exams"         label="Schedule Exams"       d={ICONS.exams}      hoverColor="group-hover:text-amber-400" />
                  <NavLink href="/admin/fees"          label="Fee Management"       d={ICONS.fees}       hoverColor="group-hover:text-emerald-400" />
                  <NavLink href="/admin/whatsapp"      label="WhatsApp Alerts"      d={ICONS.whatsapp}   hoverColor="group-hover:text-green-400" />
                  <NavLink href="/admin/announcements" label="Announcements"        d={ICONS.announce}   hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/admin/notifications" label="Notification History" d={ICONS.history}    hoverColor="group-hover:text-violet-400"
                    badge={pendingResetCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center">
                        {pendingResetCount}
                      </span>
                    )}
                  />
                  <NavLink href="/admin/reports"       label="Reports Center"       d={ICONS.reports}    hoverColor="group-hover:text-amber-400" />
                </>)}

                {role === 'TEACHER' && (<>
                  <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Teaching</p>
                  <NavLink href="/teacher/classes"      label="My Classes"      d={ICONS.classes}      hoverColor="group-hover:text-blue-400" />
                  <NavLink href="/teacher/assignments"  label="Assignments"     d={ICONS.assignments}  hoverColor="group-hover:text-violet-400" />
                  <NavLink href="/teacher/attendance"   label="Attendance"      d={ICONS.attendance}   hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/timetable"            label="Timetable"       d={ICONS.timetable}    hoverColor="group-hover:text-amber-400" />
                  <NavLink href="/teacher/reports"      label="Reports & Marks" d={ICONS.reports}      hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/teacher/announcements" label="Announcements"  d={ICONS.announce}     hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/teacher/profile"      label="My Profile"      d={ICONS.profile}      hoverColor="group-hover:text-zinc-300" />
                </>)}

                {role === 'STUDENT' && (<>
                  <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Learning</p>
                  <NavLink href="/student/courses"      label="My Subjects"     d={ICONS.subjects}     hoverColor="group-hover:text-emerald-400" />
                  <NavLink href="/student/assignments"  label="Assignments"     d={ICONS.assignments}  hoverColor="group-hover:text-violet-400" />
                  <NavLink href="/student/attendance"   label="Attendance"      d={ICONS.attendance}   hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/student/grades"       label="My Grades"       d={ICONS.grades}       hoverColor="group-hover:text-amber-400" />
                  <NavLink href="/student/fees"         label="My Fee Bills"    d={ICONS.fees}         hoverColor="group-hover:text-emerald-400" />
                  <NavLink href="/timetable"            label="Timetable"       d={ICONS.timetable}    hoverColor="group-hover:text-blue-400" />
                  <NavLink href="/student/announcements" label="Announcements"  d={ICONS.announce}     hoverColor="group-hover:text-cyan-400" />
                  <NavLink href="/student/profile"      label="My Profile"      d={ICONS.profile}      hoverColor="group-hover:text-zinc-300" />
                </>)}

                {role === 'PARENT' && (<>
                  <p className="text-zinc-600 text-[10px] font-semibold px-3 uppercase tracking-widest pt-4 pb-1">Family</p>
                  <NavLink href="/timetable" label="Timetable" d={ICONS.timetable} hoverColor="group-hover:text-blue-400" />
                </>)}
              </>
            );
          })()}
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
        <header className="h-16 border-b border-[#1e233d] bg-[#0d0f1a] px-6 flex items-center justify-between">
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
            <ThemeToggle />
            <span className="text-xs px-2.5 py-1 rounded bg-[#1e233d] border border-[#2b3052] font-semibold text-zinc-300">
              Session 2026
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden min-h-0 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

