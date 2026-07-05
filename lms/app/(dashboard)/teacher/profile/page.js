import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import { updateTeacherProfile } from '@/app/actions/teacher';

export const metadata = {
  title: 'My Profile — Fusion College LMS',
};

export const dynamic = 'force-dynamic';

export default async function TeacherProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { teacher: true },
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'TEACHER') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const teacher = dbUser.teacher;
  const inputCls = 'w-full bg-[#0d0f1a] border border-[#1e233d] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-8 font-sans max-w-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Profile</h1>
          <p className="text-zinc-400 text-sm mt-1">View and edit your account information</p>
        </div>
        <Link href="/teacher" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-violet-950/60 border border-violet-500/30 flex items-center justify-center font-black text-violet-400 text-2xl flex-shrink-0">
          {teacher?.name?.charAt(0) || '?'}
        </div>
        <div>
          <div className="text-xl font-bold text-white">{teacher?.name}</div>
          <div className="text-sm text-zinc-400">{dbUser.email}</div>
          <div className="text-xs text-violet-400 font-semibold mt-1 uppercase tracking-wide">Teacher · Fusion Faculty</div>
        </div>
      </div>

      {/* Read-only Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Full Name', value: teacher?.name },
          { label: 'Email', value: dbUser.email },
          { label: 'Phone', value: teacher?.phone || 'Not set' },
          { label: 'Qualification', value: teacher?.qualification || 'Not set' },
          { label: 'Account Status', value: dbUser.status },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
            <div className="text-sm font-semibold text-white mt-1">{value || '—'}</div>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">Update Contact Info</h2>
        <form action={updateTeacherProfile} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Phone Number</label>
            <input name="phone" defaultValue={teacher?.phone || ''} placeholder="e.g. 03001234567" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Qualification</label>
            <input name="qualification" defaultValue={teacher?.qualification || ''} placeholder="e.g. M.Sc Physics" className={inputCls} />
          </div>
          <button type="submit" className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
