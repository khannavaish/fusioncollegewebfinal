import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';

export const metadata = {
  title: 'My Profile | Fusion College LMS',
};

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { student: { include: { class: true } } },
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'STUDENT') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  const student = dbUser.student;

  return (
    <div className="space-y-8 font-sans max-w-2xl">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">My Profile</h1>
            <p className="text-zinc-400 text-sm mt-1">Your account information</p>
          </div>
          <Link href="/student" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>
      </AnimatedSection>

      {/* Avatar + Name */}
      <AnimatedSection delay={0.2}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-2xl flex-shrink-0">
            {student?.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="text-xl font-bold text-white">{student?.name}</div>
            <div className="text-sm text-zinc-400">{dbUser.email}</div>
            <div className="text-xs text-cyan-400 font-semibold mt-1 uppercase tracking-wide">Student</div>
          </div>
        </div>
      </AnimatedSection>

      {/* Info Cards */}
      <AnimatedSection delay={0.3}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Full Name', value: student?.name },
            { label: 'Roll Number', value: student?.rollNumber },
            { label: 'Class', value: student?.class?.name },
            { label: "Father's Name", value: student?.fatherName },
            { label: 'Email', value: dbUser.email },
            { label: 'CNIC', value: student?.cnic || 'Not provided' },
            { label: "Father's CNIC", value: student?.fatherCnic || 'Not provided' },
            { label: 'Account Status', value: dbUser.status },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
              <div className="text-sm font-semibold text-white mt-1">{value || '-'}</div>
            </div>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.4}>
        <div className="bg-[#16192b]/30 border border-[#1e233d] rounded-xl p-4 text-xs text-zinc-500">
          To update your profile information, please contact the admin.
        </div>
      </AnimatedSection>
    </div>
  );
}
