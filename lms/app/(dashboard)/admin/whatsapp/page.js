import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import Link from 'next/link';
import WhatsAppSettingsClient from './WhatsAppSettingsClient';

export const metadata = {
  title: 'WhatsApp Settings — Fusion College LMS',
  description: 'Configure WhatsApp parent notification system',
};

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  } catch {}
  if (!dbUser || dbUser.role !== 'ADMIN') redirect(dbUser ? `/${dbUser.role.toLowerCase()}` : '/login');

  let config = null;
  try {
    config = await prisma.whatsAppConfig.findUnique({ where: { id: 'default' } });
  } catch {}

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">WhatsApp Notifications</h1>
          <p className="text-zinc-400 text-sm mt-1">Configure parent notification settings and send reports</p>
        </div>
        <div className="flex items-center gap-2">
          {config?.isEnabled ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/40 border border-zinc-700/30 text-zinc-500 text-xs font-bold rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              Inactive
            </span>
          )}
          <Link href="/admin" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            Back to Admin
          </Link>
        </div>
      </div>
      <WhatsAppSettingsClient config={config} />
    </div>
  );
}
