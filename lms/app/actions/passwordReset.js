'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import prisma from '@/utils/db';
import { sendWhatsAppMessage } from './whatsapp';

// Admin auth helper
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('Forbidden');
  return user;
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function generateRandomPassword(length = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

// Request password reset (Public)
export async function requestPasswordResetAction(email) {
  if (!email) return { error: 'Email address is required.' };
  
  const cleanEmail = email.trim().toLowerCase();
  
  try {
    // Verify email exists in system
    const userExists = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });
    
    if (!userExists) {
      return { error: 'This email address is not registered in the system.' };
    }
    
    // Check if there is already a pending request to prevent spam
    const existingPending = await prisma.passwordResetRequest.findFirst({
      where: { email: cleanEmail, status: 'PENDING' }
    });
    
    if (existingPending) {
      return { success: true, message: 'Your request is already pending with the admin. Please wait for them to reset your password.' };
    }
    
    // Create new reset request
    await prisma.passwordResetRequest.create({
      data: { email: cleanEmail }
    });
    
    return { success: true, message: 'Reset request sent successfully to Admin! They will reset and send you the new password.' };
  } catch (e) {
    console.error('Password reset request error:', e);
    return { error: 'Failed to submit reset request. Please try again.' };
  }
}

// Resolve password reset (Admin only)
export async function resolvePasswordResetAction(formData) {
  try {
    await verifyAdmin();
    
    const requestId = formData.get('requestId')?.toString();
    if (!requestId) return { error: 'Request ID is required.' };
    
    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId }
    });
    
    if (!request) return { error: 'Reset request not found.' };
    if (request.status === 'RESOLVED') return { error: 'Request already resolved.' };
    
    const user = await prisma.user.findUnique({
      where: { email: request.email },
      include: {
        student: true,
        teacher: true,
        parent: true
      }
    });
    
    if (!user) {
      // Mark as resolved/invalid if user no longer exists
      await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: { status: 'RESOLVED' }
      });
      revalidatePath('/admin/notifications');
      return { error: 'User associated with this email no longer exists.' };
    }
    
    // Generate new temporary password
    const newPassword = generateRandomPassword(8);
    
    // Update password in Supabase Auth via Service Role Client
    const admin = adminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    
    if (authError) {
      return { error: `Supabase Auth error: ${authError.message}` };
    }
    
    // Update plainPassword in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { plainPassword: newPassword }
    });
    
    // Get target info for notification/WhatsApp
    let name = 'User';
    let phone = null;
    let roleText = 'User';
    
    if (user.student) {
      name = user.student.name;
      roleText = `Student (Roll: ${user.student.rollNumber})`;
      // Try to find parent/guardian phone as backup, or direct if available (using parent's phone since student accounts link to parent)
      const parentLink = await prisma.parentStudent.findFirst({
        where: { studentId: user.student.id },
        include: { parent: true }
      });
      phone = parentLink?.parent?.phone;
    } else if (user.teacher) {
      name = user.teacher.name;
      roleText = 'Teacher';
      phone = user.teacher.phone;
    } else if (user.parent) {
      name = user.parent.name;
      roleText = 'Parent';
      phone = user.parent.phone;
    }
    
    // Update request state
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: { status: 'RESOLVED' }
    });
    
    let whatsappStatus = 'No registered phone number found to send notification.';
    
    // Send WhatsApp notification directly with new credentials
    if (phone) {
      const message = `*FUSION COLLEGE NAROWAL — PASSWORD RESET* 🔑
----------------------------------------
Assalamu Alaikum,

Your password for the Fusion College LMS Portal has been reset by the Admin.

*Profile:* ${name} (${roleText})
*Login Email:* ${user.email}
*New Password:* ${newPassword}

Please log in now using these new credentials and update your password from your profile settings.

Regards,
Fusion College Narowal Administration`;
      
      const res = await sendWhatsAppMessage(phone, message);
      if (res.success) {
        whatsappStatus = `Successfully sent password directly via WhatsApp to ${phone}!`;
      } else if (res.skipped) {
        whatsappStatus = `Reset done. WhatsApp skipped (gateway disabled). New password is: ${newPassword}`;
      } else {
        whatsappStatus = `Reset done. WhatsApp failed to send: ${res.error}. New password is: ${newPassword}`;
      }
    } else {
      whatsappStatus = `Reset done. No phone found. Please copy and share this password manually: ${newPassword}`;
    }
    
    revalidatePath('/admin/notifications');
    return { success: true, message: whatsappStatus };
  } catch (e) {
    console.error('Password reset resolve error:', e);
    return { error: e.message || 'Failed to resolve password reset.' };
  }
}
