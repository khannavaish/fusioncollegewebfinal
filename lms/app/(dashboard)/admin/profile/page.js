import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { updateAdminProfile } from '@/app/actions/admin';
import AnimatedSection from '@/app/components/AnimatedSection';
import { IconChevronLeft, IconAlertTriangle } from '@/app/components/icons';
import { PageShell } from '@/app/components/Brand';
import { Settings } from 'lucide-react';
import ProfileFormClient from './ProfileFormClient';
import ProfileStats from './ProfileStats';

export const metadata = {
  title: 'Admin Profile | Fusion College LMS',
};

export const dynamic = 'force-dynamic';

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { admin: true },
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const admin = dbUser.admin;
  const inputCls = 'w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500';

  return (
    <PageShell
      title="Admin Profile"
      icon={<Settings />}
      description="View and edit your account information"
      rightContent={
        <Link href="/admin" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 uppercase tracking-widest bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 transition-all hover:bg-cyan-500/20">
          <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      }
    >
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Area: Profile Form */}
        <div className="lg:col-span-2">
          <AnimatedSection delay={0.1}>
            <ProfileFormClient admin={admin} dbUser={dbUser} />
          </AnimatedSection>
        </div>
        
        {/* Right Sidebar: Stats */}
        <div className="lg:col-span-1">
          <AnimatedSection delay={0.2}>
            <ProfileStats />
          </AnimatedSection>
        </div>
      </div>
    </PageShell>
  );
}
