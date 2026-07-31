import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PackagesClient from './PackagesClient';

export const metadata = { title: '📦 Fee Packages — Fusion LMS' };

export default async function PackagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');

  const packages = await prisma.feePackage.findMany({
    orderBy: { minPercentage: 'desc' },
    include: { _count: { select: { students: true } } },
  });

  const serialized = packages.map((p) => ({
    id: p.id,
    name: p.name,
    minPercentage: Number(p.minPercentage),
    maxPercentage: Number(p.maxPercentage),
    monthlyFee: Number(p.monthlyFee),
    description: p.description,
    studentCount: p._count.students,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[#060810] text-white p-6 md:p-8">
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-6">
        <Link href="/admin" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/fees" className="hover:text-cyan-400 transition-colors">Fee Management</Link>
        <span>/</span>
        <span className="text-zinc-300">Packages</span>
      </div>
      <PackagesClient packages={serialized} />
    </div>
  );
}
