import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { updateAdminProfile } from '@/app/actions/admin';
import AnimatedSection from '@/app/components/AnimatedSection';
import { IconChevronLeft, IconAlertTriangle } from '@/app/components/icons';

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
    <div className="space-y-8 font-sans max-w-2xl">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Profile</h1>
            <p className="text-zinc-400 text-sm mt-1">View and edit your account information</p>
          </div>
          <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
            <IconChevronLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      {/* Avatar + Name */}
      <AnimatedSection delay={0.2}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-2xl flex-shrink-0">
            {admin?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="text-xl font-bold text-white">{admin?.name || 'Administrator'}</div>
            <div className="text-sm text-zinc-400">{dbUser.email}</div>
            <div className="text-xs text-cyan-400 font-semibold mt-1 uppercase tracking-wide">System Administrator</div>
          </div>
        </div>
      </AnimatedSection>

      {/* Read-only Info */}
      <AnimatedSection delay={0.3}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Role', value: 'System Administrator' },
            { label: 'Account Status', value: dbUser.status },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
              <div className="text-sm font-semibold text-white mt-1">{value || '-'}</div>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Edit Form */}
      <AnimatedSection delay={0.4}>
        <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
          <h2 className="text-sm font-bold text-white mb-4">Update Profile Details</h2>
          
          {/* Note about pictures */}
          <div className="mb-5 bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3 flex items-start gap-3">
            <IconAlertTriangle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              <strong className="text-cyan-300">Note:</strong> Profile picture uploads are currently disabled across all roles (Admin, Teachers, Students) due to the read-only filesystem policy on Vercel. 
            </p>
          </div>

          <form action={updateAdminProfile} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">Full Name</label>
              <input name="name" defaultValue={admin?.name || ''} placeholder="Administrator Name" className={inputCls} required />
            </div>
            
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">Email Address</label>
              <input name="email" type="email" defaultValue={dbUser.email || ''} placeholder="admin@fusion.edu" className={inputCls} required />
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">New Password <span className="text-zinc-600">(leave blank to keep current)</span></label>
              <input name="password" type="password" placeholder="••••••••" className={inputCls} minLength={6} />
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-lg shadow-cyan-900/20">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </AnimatedSection>
    </div>
  );
}
