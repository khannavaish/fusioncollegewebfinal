'use server';

import prisma from '@/utils/db';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

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

export async function createFeePackage(_prev, formData) {
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

export async function updateFeePackage(_prev, formData) {
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

export async function deleteFeePackage(_prev, formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Package ID required.' };

  try {
    const pkg = await prisma.feePackage.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (pkg?._count?.students > 0) {
      return { error: `Cannot delete - ${pkg._count.students} student(s) are on this package.` };
    }
    await prisma.feePackage.delete({ where: { id } });
    revalidatePath('/admin/fees/packages');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to delete package.' };
  }
}

// ─── Bill Generation ──────────────────────────────────────────────────────────

export async function generateMonthlyBills(_prev, formData) {
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

    const activeGeneralCharges = await prisma.generalCharge.findMany({
      where: { isActive: true },
    });

    const existingBills = await prisma.feeBill.findMany({
      where: { month, year, isTuition: true, studentId: { in: students.map(s => s.id) } },
      select: { studentId: true }
    });
    const existingStudentIds = new Set(existingBills.map(b => b.studentId));

    let created = 0;
    let skipped = 0;
    const createOperations = [];

    for (const student of students) {
      if (existingStudentIds.has(student.id)) { 
        skipped++; 
        continue; 
      }

      const baseAmount = student.feeMonthlyOverride ?? student.feePackage?.monthlyFee;
      if (!baseAmount) { 
        skipped++; 
        continue; 
      }

      const extraItems = activeGeneralCharges.map(charge => ({
        title: charge.title,
        amount: charge.amount,
      }));
      
      const totalAmount = Number(baseAmount) + extraItems.reduce((sum, item) => sum + Number(item.amount), 0);

      createOperations.push(
        prisma.feeBill.create({
          data: {
            studentId: student.id,
            month,
            year,
            baseAmount,
            totalAmount,
            dueDate,
            isTuition: true,
            items: {
              create: [
                { title: 'Monthly Tuition Fee', amount: baseAmount },
                ...extraItems
              ],
            },
          },
        })
      );
      created++;
    }

    // Execute in batches of 50 to avoid connection limits and timeouts
    const BATCH_SIZE = 50;
    for (let i = 0; i < createOperations.length; i += BATCH_SIZE) {
      const batch = createOperations.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(batch);
    }

    // Fire-and-forget WhatsApp batch send
    sendBillWhatsAppBatch(month, year).catch(console.error);

    revalidatePath('/admin/fees/bills');
    revalidatePath('/admin/fees');
    
    if (created === 0 && skipped > 0) {
      return { warning: `Bills for this month have already been generated. Skipped ${skipped} existing bills.` };
    }
    
    return { success: true, created, skipped };
  } catch (e) {
    console.error('Bill generation error:', e);
    return { error: 'Failed to generate bills: ' + e.message };
  }
}

async function sendBillWhatsAppBatch(month, year) {
  const [bills, bankConfig] = await Promise.all([
    prisma.feeBill.findMany({
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
    }),
    prisma.bankConfig.findUnique({ where: { id: 'default' } }),
  ]);

  const { sendWhatsAppMessage, getTargetNumbers } = await import('@/app/actions/whatsapp');
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const bill of bills) {
    const monthName = MONTH_NAMES[month - 1];
    const student = bill.student;
    const itemLines = bill.items
      .map((i) => `  • ${i.title}: ₨${Number(i.amount).toLocaleString()}`)
      .join('\n');

    const message = buildFeeWhatsAppMessage(student, bill, monthName, year, itemLines, bankConfig);

    const targetNumbers = await getTargetNumbers(student);
    for (const phone of targetNumbers) {
      await delay(Math.floor(Math.random() * 2000) + 1500);
      const result = await sendWhatsAppMessage(phone, message);
      await prisma.whatsAppLog.create({
        data: {
          studentId: student.id,
          parentPhone: phone,
          messageType: 'FEE_VOUCHER',
          success: !!result.success,
          errorMessage: result.error || (result.skipped ? 'Skipped: Config disabled' : null)
        }
      });
    }

    await prisma.feeBill.update({ where: { id: bill.id }, data: { whatsappSent: true } });
  }
}

function buildFeeWhatsAppMessage(student, bill, monthName, year, itemLines, bankConfig = null) {
  const dueDate = new Date(bill.dueDate).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const bankSection = bankConfig?.accountNumber
    ? `\n🏦 *Deposit To:*
  Bank: ${bankConfig.bankName}${bankConfig.branchCode ? ` (${bankConfig.branchCode})` : ''}
  A/C Title: ${bankConfig.accountTitle}
  A/C No: *${bankConfig.accountNumber}*`
    : '';

  return `💼 *FUSION COLLEGE NAROWAL - FEE NOTICE*

📅 *${monthName} ${year}*

👤 Student: *${student.name}* (${student.rollNumber})
🎓 Class: ${student.class?.name || 'N/A'}
📦 Package: ${student.feePackage?.name || 'Custom'}${student.admissionPercentage ? ` (${student.admissionPercentage}%)` : ''}

📋 *Charges:*
${itemLines}
─────────────────────
💰 *Total Due: ₨${Number(bill.totalAmount).toLocaleString()}*
📆 *Due Date: ${dueDate}*
${bankSection}

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

    const bankConfig = await prisma.bankConfig.findUnique({ where: { id: 'default' } });
    const monthName = MONTH_NAMES[bill.month - 1];
    const itemLines = bill.items
      .map((i) => `  • ${i.title}: ₨${Number(i.amount).toLocaleString()}`)
      .join('\n');

    const message = buildFeeWhatsAppMessage(bill.student, bill, monthName, bill.year, itemLines, bankConfig);
    const { sendWhatsAppMessage, getTargetNumbers } = await import('@/app/actions/whatsapp');

    let sent = 0;
    const targetNumbers = await getTargetNumbers(bill.student);
    for (const phone of targetNumbers) {
      const result = await sendWhatsAppMessage(phone, message);
      if (result?.success !== false) sent++;
      
      await prisma.whatsAppLog.create({
        data: {
          studentId: bill.student.id,
          parentPhone: phone,
          messageType: 'FEE_VOUCHER',
          success: !!result.success,
          errorMessage: result.error || (result.skipped ? 'Skipped: Config disabled' : null)
        }
      });
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
    const existingBill = await prisma.feeBill.findUnique({ where: { id: billId } });
    if (!existingBill) return { error: 'Bill not found.' };

    if (existingBill.status === 'PAID') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);

      const newBill = await prisma.feeBill.create({
        data: {
          studentId: existingBill.studentId,
          month: existingBill.month,
          year: existingBill.year,
          baseAmount: 0,
          totalAmount: amount,
          dueDate,
          isTuition: false,
          status: 'UNPAID',
          items: {
            create: [{ title, amount }]
          }
        }
      });
      
      const fakeFd = new FormData();
      fakeFd.append('billId', newBill.id);
      await resendBillWhatsApp(fakeFd).catch(console.error);

      revalidatePath(`/admin/fees/bills/${existingBill.id}`);
      revalidatePath('/admin/fees/bills');
      return { success: true, newBillId: newBill.id };
    } else {
      await prisma.feeBillItem.create({ data: { billId, title, amount } });
      await recalculateBillTotal(billId);

      const fakeFd = new FormData();
      fakeFd.append('billId', billId);
      await resendBillWhatsApp(fakeFd).catch(console.error);

      revalidatePath(`/admin/fees/bills/${billId}`);
      revalidatePath('/admin/fees/bills');
      return { success: true };
    }
  } catch (e) {
    console.error('Add charge error:', e);
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
  const receiptImage = formData.get('receiptImage'); // File object

  if (!billId || isNaN(paidAmount)) {
    return { error: 'Bill ID and paid amount required.' };
  }

  let paymentReceipt = undefined;

  try {
    if (receiptImage && receiptImage.size > 0) {
      try {
        const bytes = await receiptImage.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = receiptImage.name.split('.').pop() || 'png';
        const filename = `receipt_${billId}_${Date.now()}.${ext}`;
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        
        await mkdir(uploadDir, { recursive: true }).catch(() => {});
        await writeFile(join(uploadDir, filename), buffer);
        paymentReceipt = `/uploads/${filename}`;
      } catch (uploadError) {
        console.warn('Failed to save receipt image (Vercel read-only FS?):', uploadError.message);
      }
    }

    const bill = await prisma.feeBill.findUnique({ where: { id: billId } });
    const status = paidAmount >= Number(bill.totalAmount) ? 'PAID' : 'PARTIAL';
    await prisma.feeBill.update({
      where: { id: billId },
      data: { status, paidAmount, paidAt: new Date(), remarks, ...(paymentReceipt && { paymentReceipt }) },
    });
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    revalidatePath('/admin/fees');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to mark bill paid.' };
  }
}

export async function updateBillAmount(formData) {
  await verifyAdmin();
  const billId = formData.get('billId')?.toString();
  const baseAmount = parseFloat(formData.get('baseAmount'));

  if (!billId || isNaN(baseAmount)) {
    return { error: 'Bill ID and valid base amount required.' };
  }

  try {
    await prisma.feeBill.update({
      where: { id: billId },
      data: { baseAmount },
    });
    
    // We also need to update the base 'Monthly Tuition Fee' item if it exists
    const baseItem = await prisma.feeBillItem.findFirst({
      where: { billId, title: { contains: 'Monthly Tuition' } }
    });
    
    if (baseItem) {
      await prisma.feeBillItem.update({
        where: { id: baseItem.id },
        data: { amount: baseAmount }
      });
    }
    
    await recalculateBillTotal(billId);
    revalidatePath(`/admin/fees/bills/${billId}`);
    revalidatePath('/admin/fees/bills');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to update bill amount.' };
  }
}

export async function updateStudentFeeAccount(formData) {
  await verifyAdmin();
  const studentId = formData.get('studentId')?.toString();
  const feePackageId = formData.get('feePackageId')?.toString() || null;
  const feeMonthlyOverrideStr = formData.get('feeMonthlyOverride')?.toString();
  const feeMonthlyOverride = feeMonthlyOverrideStr ? parseFloat(feeMonthlyOverrideStr) : null;
  const admissionPercentageStr = formData.get('admissionPercentage')?.toString();
  const admissionPercentage = admissionPercentageStr ? parseFloat(admissionPercentageStr) : null;

  if (!studentId) return { error: 'Student ID required.' };

  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { feePackageId: feePackageId === 'NONE' ? null : feePackageId, feeMonthlyOverride, admissionPercentage },
    });
    revalidatePath('/admin/fees/bills');
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true };
  } catch (e) {
    return { error: 'Failed to update student fee account.' };
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

// ─── Assign Fee Packages ──────────────────────────────────────────────────────
export async function assignFeePackages(studentIds, feePackageId, customOverride = null) {
  await verifyAdmin();
  if (!studentIds || studentIds.length === 0) return { error: 'No students selected.' };
  
  try {
    const data = {
      feePackageId: feePackageId || null,
      feeMonthlyOverride: customOverride !== null ? parseFloat(customOverride) : null,
    };

    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data,
    });
    
    revalidatePath('/admin/fees');
    revalidatePath('/admin/fees/assign');
    revalidatePath('/admin/students');
    return { success: true };
  } catch (e) {
    return { error: 'Failed to assign packages.' };
  }
}

// ─── Bank Config ──────────────────────────────────────────────────────────────
import { internalVerifySystemPassword } from './system';

export async function updateBankConfig(formData) {
  const { dbUser } = await verifyAdmin();
  const accountTitle = formData.get('accountTitle')?.toString().trim() || '';
  const accountNumber = formData.get('accountNumber')?.toString().trim() || '';
  const bankName = formData.get('bankName')?.toString().trim() || '';
  const branchCode = formData.get('branchCode')?.toString().trim() || '';
  const systemPassword = formData.get('systemPassword')?.toString();

  if (!systemPassword) {
    return { error: 'System Password is required.' };
  }

  const isValid = await internalVerifySystemPassword(systemPassword);
  if (!isValid) {
    return { error: 'Incorrect System Password.' };
  }

  try {
    const oldConfig = await prisma.bankConfig.findUnique({ where: { id: 'default' } });

    await prisma.$transaction(async (tx) => {
      await tx.bankConfig.upsert({
        where: { id: 'default' },
        update: { accountTitle, accountNumber, bankName, branchCode },
        create: { id: 'default', accountTitle, accountNumber, bankName, branchCode },
      });

      if (oldConfig && oldConfig.accountNumber !== accountNumber) {
        // Log the account number change
        const adminData = await tx.admin.findUnique({ where: { userId: dbUser.id } });
        await tx.bankAccountChangeLog.create({
          data: {
            oldAccountNumber: oldConfig.accountNumber,
            newAccountNumber: accountNumber,
            adminId: dbUser.id,
            adminName: adminData?.name || 'Unknown Admin',
          }
        });
      }
    });

    revalidatePath('/admin/fees');
    revalidatePath('/admin/fees/bills');
    return { success: true };
  } catch (e) {
    console.error('Failed to update bank details:', e);
    return { error: 'Failed to update bank details.' };
  }
}

export async function generateIndividualBill(_prev, formData) {
  await verifyAdmin();
  const studentId = formData.get('studentId');
  const month = parseInt(formData.get('month'));
  const year = parseInt(formData.get('year'));
  const dueDay = parseInt(formData.get('dueDay') || '10');

  if (!studentId || !month || !year || month < 1 || month > 12) {
    return { error: 'Invalid input parameters.' };
  }

  const dueDate = new Date(year, month - 1, dueDay);

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { feePackage: true },
    });

    if (!student) {
      return { error: 'Student not found.' };
    }

    const existing = await prisma.feeBill.findFirst({
      where: { studentId: student.id, month, year, isTuition: true },
    });

    if (existing) {
      return { warning: `A regular fee bill already exists for this student for ${month}/${year}.` };
    }

    const baseAmount = student.feeMonthlyOverride ?? student.feePackage?.monthlyFee;
    if (!baseAmount) {
      return { error: 'This student does not have a fee package or override assigned.' };
    }

    const activeGeneralCharges = await prisma.generalCharge.findMany({
      where: { isActive: true },
    });

    const extraItems = activeGeneralCharges.map(charge => ({
      title: charge.title,
      amount: charge.amount,
    }));
    
    const totalAmount = Number(baseAmount) + extraItems.reduce((sum, item) => sum + Number(item.amount), 0);

    await prisma.feeBill.create({
      data: {
        studentId: student.id,
        month,
        year,
        baseAmount,
        totalAmount,
        dueDate,
        isTuition: true,
        items: {
          create: [
            { title: 'Monthly Tuition Fee', amount: baseAmount },
            ...extraItems
          ],
        },
      },
    });

    // Fire-and-forget WhatsApp batch send
    sendBillWhatsAppBatch(month, year).catch(console.error);

    revalidatePath('/admin/fees/bills');
    revalidatePath('/admin/fees');
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath(`/admin/students/${studentId}/ledger`);
    return { success: true };
  } catch (e) {
    console.error('Bill generation error:', e);
    return { error: 'Failed to generate bill: ' + e.message };
  }
}
