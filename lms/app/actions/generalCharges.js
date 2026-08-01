'use server';

import prisma from '@/utils/db';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/login');
  return user;
}

export async function createGeneralCharge(_prev, formData) {
  await verifyAdmin();
  const title = formData.get('title')?.toString().trim();
  const amount = parseFloat(formData.get('amount'));

  if (!title || isNaN(amount)) {
    return { error: 'Title and amount are required.' };
  }

  try {
    await prisma.generalCharge.create({
      data: { title, amount, isActive: true },
    });
    revalidatePath('/admin/fees/general-charges');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to create general charge.' };
  }
}

export async function toggleGeneralCharge(id, isActive) {
  await verifyAdmin();
  try {
    await prisma.generalCharge.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/admin/fees/general-charges');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to toggle status.' };
  }
}

export async function deleteGeneralCharge(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'ID required.' };

  try {
    await prisma.generalCharge.delete({ where: { id } });
    revalidatePath('/admin/fees/general-charges');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete charge.' };
  }
}
