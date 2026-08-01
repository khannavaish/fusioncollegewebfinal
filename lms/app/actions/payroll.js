'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/utils/db';
import { createClient } from '@/utils/supabase/server';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('Forbidden');
  return user;
}

export async function generateTeacherSalaries(formData) {
  await verifyAdmin();
  const month = parseInt(formData.get('month')?.toString(), 10);
  const year = parseInt(formData.get('year')?.toString(), 10);

  if (!month || !year) return { error: 'Month and year are required.' };

  try {
    // Get all active teachers with a base salary
    const teachers = await prisma.teacher.findMany({
      where: { 
        baseSalary: { not: null },
        user: { status: 'ACTIVE' }
      }
    });

    if (teachers.length === 0) {
      return { error: 'No active teachers found with a configured base salary.' };
    }

    let generated = 0;
    
    // Process one by one to handle unique constraints cleanly
    for (const teacher of teachers) {
      const existing = await prisma.teacherSalaryBill.findUnique({
        where: {
          teacherId_month_year: {
            teacherId: teacher.id,
            month,
            year
          }
        }
      });

      if (!existing && teacher.baseSalary) {
        await prisma.teacherSalaryBill.create({
          data: {
            teacherId: teacher.id,
            month,
            year,
            baseAmount: teacher.baseSalary,
            status: 'UNPAID'
          }
        });
        generated++;
      }
    }

    revalidatePath('/admin/fees/payroll');
    return { success: true, generated };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate salaries.' };
  }
}

export async function payTeacherSalary(formData) {
  await verifyAdmin();
  const billId = formData.get('billId')?.toString();
  const paidAmountRaw = formData.get('paidAmount')?.toString();
  const remarks = formData.get('remarks')?.toString() || null;

  if (!billId || !paidAmountRaw) return { error: 'Bill ID and Paid Amount are required.' };

  try {
    const paidAmount = parseFloat(paidAmountRaw);
    
    await prisma.teacherSalaryBill.update({
      where: { id: billId },
      data: {
        paidAmount,
        status: 'PAID',
        paidAt: new Date(),
        remarks
      }
    });

    revalidatePath('/admin/fees/payroll');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to process payment.' };
  }
}

export async function updateTeacherBaseSalary(formData) {
  const teacherId = formData.get('teacherId')?.toString();
  const baseSalaryRaw = formData.get('baseSalary')?.toString().trim();
  
  if (!teacherId) return { error: 'Teacher ID required.' };
  
  const baseSalary = baseSalaryRaw ? parseFloat(baseSalaryRaw) : null;

  try {
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { baseSalary }
    });

    revalidatePath('/admin/fees/payroll');
    revalidatePath('/admin/teachers');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update base salary.' };
  }
}
