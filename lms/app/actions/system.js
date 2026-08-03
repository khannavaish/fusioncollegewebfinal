'use server';

import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'khan3843';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { id: true, role: true },
    include: { admin: true }
  });
  
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');
  return { user, dbUser };
}

/**
 * Helper function to retrieve and potentially initialize the system setting.
 */
export async function getOrInitSystemSetting() {
  let setting = await prisma.systemSetting.findUnique({
    where: { id: 'default' }
  });

  if (!setting) {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    setting = await prisma.systemSetting.create({
      data: {
        id: 'default',
        password: hashedPassword
      }
    });
  }
  return setting;
}

/**
 * Action to change the system password.
 */
export async function changeSystemPassword(prevState, formData) {
  try {
    await verifyAdmin();
    const oldPassword = formData.get('oldPassword')?.toString();
    const newPassword = formData.get('newPassword')?.toString();
    
    if (!oldPassword || !newPassword) {
      return { error: 'Both old and new passwords are required.' };
    }
    
    if (newPassword.length < 6) {
      return { error: 'New password must be at least 6 characters long.' };
    }

    const setting = await getOrInitSystemSetting();
    const isValid = await bcrypt.compare(oldPassword, setting.password);
    
    if (!isValid) {
      return { error: 'Incorrect previous password.' };
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.systemSetting.update({
      where: { id: 'default' },
      data: { password: newHashedPassword }
    });

    return { success: true, message: 'System password updated successfully.' };
  } catch (error) {
    console.error('Failed to change system password:', error);
    return { error: 'Failed to update system password.' };
  }
}

/**
 * Internally verify the password, returns true/false without modifying state.
 */
export async function internalVerifySystemPassword(passwordToVerify) {
  if (!passwordToVerify) return false;
  const setting = await getOrInitSystemSetting();
  return await bcrypt.compare(passwordToVerify, setting.password);
}
