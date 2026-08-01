import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import AnimatedSection from '@/app/components/AnimatedSection';
import { IconDownload, IconUsers, IconGraduationCap, IconBuilding, IconBookOpen } from '@/app/components/icons';

export const metadata = {
  title: 'Export Data | Fusion College LMS',
};

export default async function AdminExportPage() {
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

  const exportOptions = [
    { type: 'students', label: 'Students Directory', icon: IconGraduationCap, desc: 'Full roster of students, rolls, classes, and contact info.' },
    { type: 'teachers', label: 'Teachers Directory', icon: IconUsers, desc: 'All teachers, departments, phones, and base salaries.' },
    { type: 'classes', label: 'Classes List', icon: IconBuilding, desc: 'All classes, assigned incharges, and academic years.' },
    { type: 'fees', label: 'Fee Bills Archive', icon: IconBookOpen, desc: 'Every fee bill generated, including billed amount, paid status, and dates.' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Export Data</h1>
            <p className="text-zinc-400 text-sm mt-1">Download your school's data directly to standard CSV format.</p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exportOptions.map((opt) => (
            <div key={opt.type} className="bg-[#0d0f1a] border border-[#1e233d] rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#16192b] border border-[#2b3052] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <opt.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{opt.label}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">{opt.desc}</p>
              </div>
              
              <a 
                href={`/api/export/${opt.type}`} 
                download
                className="w-full inline-flex items-center justify-center gap-2 bg-[#16192b] hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-[#2b3052] hover:border-cyan-500"
              >
                <IconDownload className="w-4 h-4" /> Export CSV
              </a>
            </div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  );
}
