import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import AnimatedSection from '@/app/components/AnimatedSection';
import { PageShell } from '@/app/components/Brand';
import { AlertTriangle } from 'lucide-react';
import SystemResetForm from './SystemResetForm';
import ChangePasswordForm from './ChangePasswordForm';

export const metadata = {
  title: 'System Settings | Fusion College LMS',
};

export default async function AdminResetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { role: true }
    });
  } catch {}

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');
  }

  return (
    <PageShell
      title="System Settings"
      icon={<AlertTriangle />}
      description="Manage your system security and reset data."
    >
      <div className="space-y-6 max-w-4xl mx-auto mt-4">

      <AnimatedSection delay={0.2}>
        <div className="rounded-2xl border border-[#1e233d] bg-[#0b051a] p-8 shadow-2xl mb-8">
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-2">Security</div>
              <h2 className="text-2xl font-bold text-white mb-2">System Password</h2>
              <p className="text-base text-zinc-300 leading-relaxed">
                The System Password is required for sensitive administrative actions like changing the bank account details or performing a factory reset. The default password is <strong>khan3843</strong>.
              </p>
            </div>
            <ChangePasswordForm />
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-8 shadow-2xl">
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-red-400 mb-2">Danger Zone</div>
              <h2 className="text-2xl font-bold text-white mb-4">Reset System Roster</h2>
              <p className="text-base text-zinc-300 leading-relaxed mb-4">
                This action is <strong>irreversible</strong>. It wipes all user data and transactional records.
              </p>
              <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1 mb-8">
                <li>Teacher accounts, subjects, and payrolls will be deleted.</li>
                <li>Student accounts, classes, and fee ledgers will be deleted.</li>
                <li>Parent accounts will be deleted.</li>
                <li>Fee Packages, General Charges, and Timetables will be wiped.</li>
                <li><strong>The primary Admin account and System Settings will remain intact.</strong></li>
              </ul>
            </div>
            
            <SystemResetForm />
          </div>
        </div>
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
