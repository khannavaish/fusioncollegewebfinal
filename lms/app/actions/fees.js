'use server';

import prisma from '@/utils/db';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

// ─── Fee Package Actions ──────────────────────────────────────────────────────

export async function createFeePackage(formData) {
  await verifyAdmin();
  const name = formData.get('name')?.toString().trim();
  const minPercentage = parseFloat(formData.get('minPercentage'));
  const maxPercentage = parseFloat(formData.get('maxPercentage'));
  const monthlyFee = parseFloat(formData.get('monthlyFee'));
  const description = formData.get('description')?.toString().trim() || null;

  if (!name || isNaN(minPercentage) || isNaN(maxPercentage) || isNaN(monthlyFee)) {
    return { error: 'All required fields must be provided.' };
  }
  if (minPercentage >= maxPercentage) {
    return { error: 'Min percentage must be less than max percentage.' };
  }

  try {
    await prisma.feePackage.create({
      data: { name, minPercentage, maxPercentage, monthlyFee, description },
    });
    revalidatePath('/admin/fees/packages');
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (e) {
    if (e.code === 'P2002') return { error: 'A package with that name already exists.' };
    return { error: 'Failed to create package.' };
  }
}

export async function updateFeePackage(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const minPercentage = parseFloat(formData.get('minPercentage'));
  const maxPercentage = parseFloat(formData.get('maxPercentage'));
  const monthlyFee = parseFloat(formData.get('monthlyFee'));
  const description = formData.get('description')?.toString().trim() || null;

  if (!id || !name || isNaN(minPercentage) || isNaN(maxPercentage) || isNaN(monthlyFee)) {
    return { error: 'All required fields must be provided.' };
  }

  try {
    await prisma.feePackage.update({
      where: { id },
      data: { name, minPercentage, maxPercentage, monthlyFee, description },
    });
    revalidatePath('/admin/fees/packages');
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to update package.' };
  }
}

export async function deleteFeePackage(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Package ID required.' };

  try {
    const pkg = await prisma.feePackage.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (pkg?._count?.students > 0) {
      return { error: `Cannot delete — ${pkg._count.students} student(s) are on this package.` };
    }
    await prisma.feePackage.delete({ where: { id } });
    revalidatePath('/admin/fees/packages');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete package.' };
  }
}

// ─── Bill Generation ──────────────────────────────────────────────────────────

export async function generateMonthlyBills(formData) {
  await verifyAdmin();
  const month = parseInt(formData.get('month'));
  const year = parseInt(formData.get('year'));
  const dueDay = parseInt(formData.get('dueDay') || '10');

  if (!month || !year || month < 1 || month > 12) {
    return { error: 'Invalid month or year.' };
  }

  const dueDate = new Date(year, month - 1, dueDay);

  try {
    const students = await prisma.student.findMany({
      where: {
        user: { status: 'ACTIVE' },
        OR: [
          { feePackageId: { not: null } },
          { feeMonthlyOverride: { not: null } },
        ],
      },
      include: { feePackage: true, class: true },
    });

    let created = 0;
    let skipped = 0;

    for (const student of students) {
      const existing = await prisma.feeBill.findUnique({
        where: { studentId_month_year: { studentId: student.id, month, year } },
      });
      if (existing) { skipped++; continue; }

      const baseAmount = student.feeMonthlyOverride ?? student.feePackage?.monthlyFee;
      if (!baseAmount) { skipped++; continue; }

      await prisma.feeBill.create({
        data: {
          studentId: student.id,
          month,
          year,
          baseAmount,
          totalAmount: baseAmount,
          dueDate,
          items: {
            create: [{ title: 'Monthly Tuition Fee', amount: baseAmount }],
          },
        },
      });
      created++;
    }

    // Fire-and-forget WhatsApp batch send
    sendBillWhatsAppBatch(month, year).catch(console.error);

    revalidatePath('/admin/fees/bills');
    revalidatePath('/admin/fees');
    return { success: true, created, skipped };
  } catch (e) {
    console.error('Bill generation error:', e);
    return { error: 'Failed to generate bills: ' + e.message };
  }
}

async function sendBillWhatsAppBatch(month, year) {
  const bills = await prisma.feeBill.findMany({
    where: { month, year, whatsappSent: false },
    include: {
      student: {
        include: {
          parents: { include: { parent: true } },
          feePackage: true,
          class: true,
        },
      },
      items: true,
    },
  });

  const { sendWhatsAppMessage } = await import('@/app/actions/whatsapp');
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const bill of bills) {
    const monthName = MONTH_NAMES[month - 1];
    const student = bill.student;
    const itemLines = bill.items
      .map((i) => `  • ${i.title}: ₨${Number(i.amount).toLocaleString()}`)
      .join('\n');

    const message = buildFeeWhatsAppMessage(student, bill, monthName, year, itemLines);

    for (const ps of student.parents) {
      if (ps.parent?.phone) {
        await delay(Math.floor(Math.random() * 2000) + 1500);
        await sendWhatsAppMessage(ps.parent.phone, message);
      }
    }

    await prisma.feeBill.update({ where: { id: bill.id }, data: { whatsappSent: true } });
  }
}

function buildFeeWhatsAppMessage(student, bill, monthName, year, itemLines) {
  const dueDate = new Date(bill.dueDate).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `💼 *FUSION COLLEGE NAROWAL — FEE NOTICE*

📅 *${monthName} ${year}*

👤 Student: *${student.name}* (${student.rollNumber})
🎓 Class: ${student.class?.name || 'N/A'}
📦 Package: ${student.feePackage?.name || 'Custom'}${student.admissionPercentage ? ` (${student.admissionPercentage}%)` : ''}

📋 *Charges:*
${itemLines}
─────────────────────
💰 *Total Due: ₨${Number(bill.totalAmount).toLocaleString()}*
📆 *Due Date: ${dueDate}*

Please deposit fee before the due date.
JazakAllah Khair 🤲
_Fusion College Narowal Administration_`;
}

export async function resendBillWhatsApp(formData) {
  await verifyAdmin();
  const billId = formData.get('billId')?.toString();
  if (!billId) return { error: 'Bill ID required.' };

  try {
    const bill = await prisma.feeBill.findUnique({
      where: { id: billId },
      include: {
        student: {
          include: {
            parents: { include: { parent: true } },
            feePackage: true,
            class: true,
          },
        },
        items: true,
      },
    });
    if (!bill) return { error: 'Bill not found.' };

    const monthName = MONTH_NAMES[bill.month - 1];
    const itemLines = bill.items
      .map((i) => `  • ${i.title}: ₨${Number(i.amount).toLocaleString()}`)
      .join('\n');

    const message = buildFeeWhatsAppMessage(bill.student, bill, monthName, bill.year, itemLines);
    const { sendWhatsAppMessage } = await import('@/app/actions/whatsapp');

    let sent = 0;
    for (const ps of bill.student.parents) {
      if (ps.parent?.phone) {
        const result = await sendWhatsAppMessage(ps.parent.phone, message);
        if (result?.success !== false) sent++;
      }
    }

    await prisma.feeBill.update({ where: { id: billId }, data: { whatsappSent: true } });
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    return { success: true, sent };
  } catch (e) {
    return { error: 'Failed to resend WhatsApp: ' + e.message };
  }
}

// ─── Bill Item Management ─────────────────────────────────────────────────────

export async function addBillItem(formData) {
  await verifyAdmin();
  const billId = formData.get('billId')?.toString();
  const title = formData.get('title')?.toString().trim();
  const amount = parseFloat(formData.get('amount'));

  if (!billId || !title || isNaN(amount)) {
    return { error: 'All fields required.' };
  }

  try {
    await prisma.feeBillItem.create({ data: { billId, title, amount } });
    await recalculateBillTotal(billId);
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to add charge.' };
  }
}

export async function removeBillItem(formData) {
  await verifyAdmin();
  const itemId = formData.get('itemId')?.toString();
  const billId = formData.get('billId')?.toString();
  if (!itemId || !billId) return { error: 'Item ID required.' };

  try {
    await prisma.feeBillItem.delete({ where: { id: itemId } });
    await recalculateBillTotal(billId);
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to remove charge.' };
  }
}

async function recalculateBillTotal(billId) {
  const items = await prisma.feeBillItem.findMany({ where: { billId } });
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  await prisma.feeBill.update({ where: { id: billId }, data: { totalAmount: total } });
}

// ─── Bill Status Management ───────────────────────────────────────────────────

export async function markBillPaid(formData) {
  await verifyAdmin();
  const billId = formData.get('billId')?.toString();
  const paidAmount = parseFloat(formData.get('paidAmount'));
  const remarks = formData.get('remarks')?.toString().trim() || null;

  if (!billId || isNaN(paidAmount)) {
    return { error: 'Bill ID and paid amount required.' };
  }

  try {
    const bill = await prisma.feeBill.findUnique({ where: { id: billId } });
    const status = paidAmount >= Number(bill.totalAmount) ? 'PAID' : 'PARTIAL';
    await prisma.feeBill.update({
      where: { id: billId },
      data: { status, paidAmount, paidAt: new Date(), remarks },
    });
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to mark bill paid.' };
  }
}

export async function waiveBill(formData) {
  await verifyAdmin();
  const billId = formData.get('billId')?.toString();
  const remarks = formData.get('remarks')?.toString().trim() || 'Waived by admin';
  if (!billId) return { error: 'Bill ID required.' };

  try {
    await prisma.feeBill.update({
      where: { id: billId },
      data: { status: 'WAIVED', remarks },
    });
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to waive bill.' };
  }
}

// ─── Student Fee Package Assignment ──────────────────────────────────────────

export async function updateStudentFeePackage(formData) {
  await verifyAdmin();
  const studentId = formData.get('studentId')?.toString();
  const feePackageId = formData.get('feePackageId')?.toString() || null;
  const feeMonthlyOverrideRaw = formData.get('feeMonthlyOverride')?.toString().trim();
  const feeMonthlyOverride = feeMonthlyOverrideRaw ? parseFloat(feeMonthlyOverrideRaw) : null;
  const admissionPercentageRaw = formData.get('admissionPercentage')?.toString().trim();
  const admissionPercentage = admissionPercentageRaw ? parseFloat(admissionPercentageRaw) : null;

  if (!studentId) return { error: 'Student ID required.' };

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { feePackageId, feeMonthlyOverride, admissionPercentage },
    });
    revalidatePath('/admin/students');
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to update student fee settings.' };
  }
}

// ─── Fee Dashboard Stats ──────────────────────────────────────────────────────

export async function getFeeStats(month, year) {
  const bills = await prisma.feeBill.findMany({
    where: { month, year },
    select: { status: true, totalAmount: true, paidAmount: true },
  });

  const total = bills.length;
  const unpaid = bills.filter((b) => b.status === 'UNPAID').length;
  const paid = bills.filter((b) => b.status === 'PAID').length;
  const partial = bills.filter((b) => b.status === 'PARTIAL').length;
  const waived = bills.filter((b) => b.status === 'WAIVED').length;
  const totalDue = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
  const totalCollected = bills
    .filter((b) => b.status === 'PAID' || b.status === 'PARTIAL')
    .reduce((s, b) => s + Number(b.paidAmount || 0), 0);

  return { total, unpaid, paid, partial, waived, totalDue, totalCollected };
}
