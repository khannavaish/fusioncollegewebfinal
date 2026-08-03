import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import AnimatedSection from '@/app/components/AnimatedSection';
import { IconTrash, IconAlertTriangle } from '@/app/components/icons';
import { resetSchoolData } from '@/app/actions/admin';
import { PageShell } from '@/app/components/Brand';
import { AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'System Reset | Fusion College LMS',
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
      title="System Reset"
      icon={<AlertTriangle />}
      description="Danger Zone: Permanently erase the academic roster."
    >
      <div className="space-y-6 max-w-4xl mx-auto mt-4">

      <AnimatedSection delay={0.2}>
        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-8 shadow-2xl">
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-red-400 mb-2">Danger Zone</div>
              <h2 className="text-2xl font-bold text-white mb-4">Reset Teachers and Students</h2>
              <p className="text-base text-zinc-300 leading-relaxed mb-4">
                This action is <strong>irreversible</strong>. It removes all teacher, student, and parent accounts linked to them. 
                It also cascades to delete class assignments, lectures, attendance records, submissions, exams, and related logs.
              </p>
              <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1 mb-8">
                <li>Teacher accounts and payrolls will be deleted.</li>
                <li>Student accounts and fee ledgers will be deleted.</li>
                <li>Parent accounts will be deleted.</li>
                <li><strong>Admin data, classes, subjects, timetable layout, and enquiries will remain intact.</strong></li>
              </ul>
            </div>
            
            <div className="bg-[#0d0f1a] border border-red-500/30 rounded-xl p-6 shadow-inner max-w-lg">
              <form action={resetSchoolData} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Type RESET to confirm</label>
                  <input
                    name="confirmText"
                    placeholder="RESET"
                    className="w-full rounded-lg border border-[#1e233d] bg-[#0a0c14] px-4 py-3 text-base font-mono text-white placeholder-zinc-700 focus:border-red-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <p className="text-xs text-zinc-500 mb-2">
                  This clears the academic roster and its linked records. It does not remove the admin account or setup.
                </p>
                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20">
                  <IconTrash className="h-5 w-5" /> Permanently Reset Roster
                </button>
              </form>
            </div>
          </div>
        </div>
      </AnimatedSection>
      </div>
    </PageShell>
  );
}
