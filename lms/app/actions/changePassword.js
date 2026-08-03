'use server';

import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import { redirect } from 'next/navigation';

export async function changePassword(prevState, formData) {
  const newPassword = formData.get('newPassword')?.toString();
  const confirmPassword = formData.get('confirmPassword')?.toString();

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  // Clear the mustChangePassword flag and update plainPassword
  await prisma.user.update({
    where: { authId: user.id },
    data: { mustChangePassword: false, plainPassword: newPassword },
  });

  redirect('/');
}
