import { getUsers } from '@/app/actions/users';
import prisma from '@/utils/db';
import UsersClient from './UsersClient';
import { verifyAdmin } from '@/app/actions/admin';

export const metadata = {
  title: 'Users Management | Fusion LMS',
  description: 'Manage all users in the system.',
};

export default async function UsersPage() {
  await verifyAdmin();
  
  // Fetch users and classes concurrently
  const [users, classes] = await Promise.all([
    getUsers(),
    prisma.class.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">Users Management</h1>
          <p className="text-sm text-zinc-400 mt-1">
            View, modify, or delete user accounts across all roles.
          </p>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Users</span>
          <div className="text-xl font-black text-cyan-400">{users.length}</div>
        </div>
      </div>

      <UsersClient initialUsers={users} classes={classes} />
    </div>
  );
}
