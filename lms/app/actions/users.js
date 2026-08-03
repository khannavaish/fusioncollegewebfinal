'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/utils/db';
import { verifyAdmin } from './admin';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function getUsers() {
  await verifyAdmin();
  
  const users = await prisma.user.findMany({
    where: {
      email: {
        not: 'superadmin@fusionlms.edu'
      }
    },
    include: {
      admin: true,
      teacher: true,
      student: {
        include: {
          class: true
        }
      },
      parent: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  return users;
}

export async function updateUser(userId, data) {
  await verifyAdmin();
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email === 'superadmin@fusionlms.edu') {
    return { error: 'Unauthorized action' };
  }

  try {
    const updateData = {};
    if (data.status) updateData.status = data.status;
    
    // If password update is requested
    if (data.password && data.password.trim().length > 0) {
      const admin = adminClient();
      const { error: authError } = await admin.auth.admin.updateUserById(user.authId, {
        password: data.password.trim()
      });
      
      if (authError) return { error: authError.message };
      
      updateData.plainPassword = data.password.trim();
      updateData.mustChangePassword = true; // force them to change it on next login
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Update user error:', err);
    return { error: err.message };
  }
}

export async function deleteUser(userId) {
  await verifyAdmin();
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email === 'superadmin@fusionlms.edu') {
    return { error: 'Unauthorized action' };
  }

  try {
    const admin = adminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(user.authId);
    
    if (authError && !authError.message.includes('not found')) {
      return { error: authError.message };
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err) {
    console.error('Delete user error:', err);
    return { error: err.message };
  }
}
