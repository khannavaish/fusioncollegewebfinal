import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

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

  const name = dbUser?.student?.name || dbUser?.teacher?.name || dbUser?.admin?.name || dbUser?.parent?.name || user.email;
  const role = dbUser?.role || 'STUDENT';

  const handleSignOut = async () => {
    'use server';
    const supabaseServer = await createClient();
    await supabaseServer.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-[#090b11] text-zinc-100 flex font-sans">
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

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-zinc-500 text-xs font-semibold px-2 uppercase tracking-wider mb-2">Navigation</div>
          <a href={`/${role.toLowerCase()}`} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
            🏠 Dashboard
          </a>

          {role === 'ADMIN' && (
            <>
              <div className="text-zinc-600 text-[10px] font-semibold px-2 uppercase tracking-wider mt-4 mb-1">Management</div>
              <a href="/admin/students" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                🎓 Students
              </a>
              <a href="/admin/teachers" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                👨‍🏫 Teachers
              </a>
              <a href="/admin/parents" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                👨‍👩‍👧 Parents
              </a>
              <div className="text-zinc-600 text-[10px] font-semibold px-2 uppercase tracking-wider mt-4 mb-1">Academic</div>
              <a href="/admin/classes" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                🏫 Classes
              </a>
              <a href="/admin/subjects" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                📚 Subjects
              </a>
            </>
          )}

          {role === 'TEACHER' && (
            <>
              <div className="text-zinc-600 text-[10px] font-semibold px-2 uppercase tracking-wider mt-4 mb-1">Teaching</div>
              <a href="/teacher/classes" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                🏫 My Classes
              </a>
              <a href="/teacher/attendance" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                📋 Attendance
              </a>
            </>
          )}

          {role === 'STUDENT' && (
            <>
              <div className="text-zinc-600 text-[10px] font-semibold px-2 uppercase tracking-wider mt-4 mb-1">Learning</div>
              <a href="/student/classes" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                📚 My Subjects
              </a>
              <a href="/student/attendance" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                📋 Attendance
              </a>
              <a href="/student/results" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-[#1e233d] text-zinc-300 hover:text-white transition-colors">
                🏆 Results
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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#1e233d] bg-[#0d0f1a]/50 backdrop-blur px-6 flex items-center justify-between md:justify-end">
          <div className="md:hidden flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Fusion College Logo"
              className="w-8 h-8 rounded-full object-contain bg-white"
            />
            <span className="font-bold text-white text-sm">FUSION LMS</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs px-2.5 py-1 rounded bg-[#1e233d] border border-[#2b3052] font-semibold text-zinc-300">
              Session 2026
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
