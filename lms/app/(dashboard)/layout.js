import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Sidebar from '@/app/components/Sidebar';
import GlobalSearch from '@/app/components/GlobalSearch';
import { TopBar } from '@/app/components/Brand';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let sessionName = 'Session 2026-2028';
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 'global', activeSessionName: sessionName } });
    }
    sessionName = settings.activeSessionName;
  } catch (e) {
    // Ignore error to prevent Next.js dev overlay from popping up on network issues
  }


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
    <div className="dashboard-layout flex w-full min-h-screen relative overflow-hidden">
      {/* Global Background Patterns */}
      <div className="bg-dot-pattern pointer-events-none fixed inset-0 z-[1]" />

      {/* Sidebar with higher z-index to sit above bg */}
      <div className="relative z-20">
        <Sidebar role={role} name={name} handleSignOutAction={handleSignOut} />
      </div>

      {/* Main pane */}
      <div className="flex-1 min-w-0 w-full relative z-10 h-screen overflow-y-auto">
        <TopBar />
        <div className="max-w-[1400px] px-6 py-6 pb-28 mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

