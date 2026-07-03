'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({ where: { authId: user.id }, select: { role: true } });
  if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('Forbidden');
  return user;
}

// â”€â”€â”€ Send via Custom / UltraMsg â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendWhatsAppMessage(to, message) {
  const config = await prisma.whatsAppConfig.findUnique({ where: { id: 'default' } });
  if (!config || !config.isEnabled) {
    console.log('[WhatsApp] Not configured or disabled. Message not sent.');
    return { skipped: true };
  }

  const rawTarget = to.toString().trim();
  const isWhatsAppJid = rawTarget.endsWith('@g.us') || rawTarget.endsWith('@s.whatsapp.net');
  const phone = rawTarget.replace(/[^0-9]/g, '');
  const formattedPhone = isWhatsAppJid ? rawTarget : (phone.startsWith('92') ? phone : `92${phone.replace(/^0/, '')}`);

  if (config.provider === 'CUSTOM') {
    const url = `${config.gatewayUrl.replace(/\/$/, '')}/send`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: formattedPhone, message }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { error: data.error || 'Failed to send message.' };
      }
      return { success: true, data };
    } catch (e) {
      console.error('[WhatsApp] Self-hosted gateway send error:', e);
      return { error: e.message };
    }
  } else {
    // UltraMsg Mode
    if (!config.apiToken || !config.instanceId) {
      console.log('[WhatsApp] UltraMsg token or instanceId is missing.');
      return { skipped: true };
    }
    const url = `https://api.ultramsg.com/${config.instanceId}/messages/chat`;
    const body = new URLSearchParams({
      token: config.apiToken,
      to: formattedPhone,
      body: message,
      priority: '10',
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await res.json();
      return { success: true, data };
    } catch (e) {
      console.error('[WhatsApp] UltraMsg send error:', e);
      return { error: e.message };
    }
  }
}

// â”€â”€â”€ Get / Save WhatsApp Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getWhatsAppConfig() {
  try {
    const config = await prisma.whatsAppConfig.findUnique({ where: { id: 'default' } });
    return config || { provider: 'ULTRAMSG', gatewayUrl: 'http://localhost:3001', senderNumber: '', apiToken: '', instanceId: '', isEnabled: false };
  } catch {
    return { provider: 'ULTRAMSG', gatewayUrl: 'http://localhost:3001', senderNumber: '', apiToken: '', instanceId: '', isEnabled: false };
  }
}

export async function saveWhatsAppConfig(formData) {
  await verifyAdmin();
  const provider     = formData.get('provider')?.toString() || 'ULTRAMSG';
  const gatewayUrl   = formData.get('gatewayUrl')?.toString().trim() || 'http://localhost:3001';
  const senderNumber = formData.get('senderNumber')?.toString().trim() || '';
  const apiToken     = formData.get('apiToken')?.toString().trim() || '';
  const instanceId   = formData.get('instanceId')?.toString().trim() || '';
  const isEnabled    = formData.get('isEnabled') === 'true';

  try {
    await prisma.whatsAppConfig.upsert({
      where: { id: 'default' },
      update: { provider, gatewayUrl, senderNumber, apiToken, instanceId, isEnabled },
      create: { id: 'default', provider, gatewayUrl, senderNumber, apiToken, instanceId, isEnabled },
    });
    revalidatePath('/admin/whatsapp');
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// â”€â”€â”€ Test Message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendTestWhatsApp(formData) {
  await verifyAdmin();
  const testNumber = formData.get('testNumber')?.toString().trim();
  if (!testNumber) return { error: 'Enter a phone number.' };

  const result = await sendWhatsAppMessage(testNumber, 'Test message from Fusion College Narowal LMS Portal. WhatsApp notifications are working correctly.');
  if (result.skipped) return { error: 'WhatsApp is not configured or disabled. Save settings first.' };
  if (result.error) return { error: result.error };
  return { success: true };
}

// â”€â”€â”€ Send First-Arrival Message (called after first attendance of day) â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendArrivalWhatsApp(studentId) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parents: {
          include: { parent: true }
        }
      }
    });

    if (!student || student.parents.length === 0) return;

    const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const message = `*FUSION COLLEGE NAROWAL â€” DAILY REPORT* ðŸ«
----------------------------------------
*English:*
Assalamu Alaikum,
Your child *${student.name}* (Roll No: ${student.rollNumber}) has arrived safely at the college today, ${today}.

*Ø§Ø±Ø¯Ùˆ:*
Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÛŒÚ©Ù…ØŒ
Ø¢Ù¾ Ú©Ø§ Ø¨Ú†Û *${student.name}* (Ø±ÙˆÙ„ Ù†Ù…Ø¨Ø±: ${student.rollNumber}) Ø¢Ø¬ Ù…ÙˆØ±Ø®Û ${today} Ú©Ùˆ Ø¨Ø­ÙØ§Ø¸Øª Ú©Ø§Ù„Ø¬ Ù¾ÛÙ†Ú† Ú†Ú©Ø§ ÛÛ’Û”
----------------------------------------
Regards,
Fusion College Narowal Administration`;

    for (const ps of student.parents) {
      if (ps.parent?.phone) {
        const result = await sendWhatsAppMessage(ps.parent.phone, message);
        
        // Log to DB
        await prisma.whatsAppLog.create({
          data: {
            studentId: student.id,
            parentPhone: ps.parent.phone,
            messageType: 'ARRIVAL',
            success: !!result.success,
            errorMessage: result.error || (result.skipped ? 'Skipped: Config disabled' : null)
          }
        });
      }
    }
  } catch (e) {
    console.error('[WhatsApp] Arrival send error:', e);
  }
}

// â”€â”€â”€ Send End-of-Day Summary to All Parents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendEndOfDaySummary(formData) {
  await verifyAdmin();
  const dateStr = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
  const classId = formData.get('classId')?.toString();

  try {
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause = {
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (classId && classId !== 'ALL') {
      whereClause.classSubject = { classId: classId };
    }

    // Get all lectures for this day
    const lectures = await prisma.lecture.findMany({
      where: whereClause,
      include: {
        classSubject: {
          include: {
            subject: true,
            teacher: true,
            class: {
              include: {
                students: {
                  include: {
                    parents: { include: { parent: true } }
                  }
                }
              }
            }
          }
        },
        attendance: {
          include: { student: true }
        }
      }
    });

    if (lectures.length === 0) {
      return { error: 'No lectures found for the selected date.' };
    }

    // Group attendance by student
    const studentMap = {};
    for (const lec of lectures) {
      for (const att of lec.attendance) {
        if (!studentMap[att.studentId]) {
          studentMap[att.studentId] = {
            student: att.student,
            entries: [],
          };
        }
        studentMap[att.studentId].entries.push({
          subject: lec.classSubject.subject.name,
          teacher: lec.classSubject.teacher.name,
          status: att.status,
          topic: lec.topic && !lec.topic.startsWith('Pending') ? lec.topic : 'No topic logged.',
        });
      }
    }

    const formattedDate = targetDate.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let sent = 0;
    let skipped = 0;

    for (const [studentId, data] of Object.entries(studentMap)) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { parents: { include: { parent: true } } }
      });
      if (!student || student.parents.length === 0) { skipped++; continue; }

      const totalClasses = data.entries.length;
      const presentCount = data.entries.filter(e => e.status === 'PRESENT' || e.status === 'LATE').length;
      const absentCount = data.entries.filter(e => e.status === 'ABSENT').length;

      let summaryLinesEn = [];
      let summaryLinesUr = [];

      data.entries.forEach(e => {
        const isPresent = e.status === 'PRESENT' || e.status === 'LATE';
        const sign = isPresent ? 'âœ…' : 'âŒ';
        
        // English line
        summaryLinesEn.push(`${sign} *${e.subject}* (by ${e.teacher}): ${isPresent ? 'Attended' : 'Absent'}\n   Topic: ${e.topic}`);
        
        // Urdu line
        const statusUrdu = isPresent ? 'Ø­Ø§Ø¶Ø± (Ø­Ø§Ø¶Ø±ÛŒ Ø±ÛŒÚ©Ø§Ø±Úˆ Ú©ÛŒ Ú¯Ø¦ÛŒ)' : 'ØºÛŒØ± Ø­Ø§Ø¶Ø±';
        summaryLinesUr.push(`${sign} *${e.subject}* (Ø¨Ø°Ø±ÛŒØ¹Û ${e.teacher}): ${statusUrdu}\n   Ù…ÙˆØ¶ÙˆØ¹: ${e.topic}`);
      });

      const message = `*FUSION COLLEGE NAROWAL â€” END-OF-DAY ACADEMIC REPORT* ðŸ«
----------------------------------------
*Student:* ${data.student.name} (${data.student.rollNumber})
*Date:* ${formattedDate}

*English:*
Assalamu Alaikum,
Here is the daily performance and attendance summary of your child:

ðŸ“Š *Summary:* Present in ${presentCount}/${totalClasses} lectures.
ðŸ“– *Subject Details & Topics Taught:*
${summaryLinesEn.join('\n\n')}

*Ø§Ø±Ø¯Ùˆ:*
Ø§Ù„Ø³Ù„Ø§Ù… Ø¹Ù„ÛŒÚ©Ù…ØŒ
Ø¢Ù¾ Ú©Û’ Ø¨Ú†Û’ Ú©ÛŒ Ø±ÙˆØ²Ø§Ù†Û Ú©ÛŒ ØªØ¹Ù„ÛŒÙ…ÛŒ Ø§ÙˆØ± Ø­Ø§Ø¶Ø±ÛŒ Ú©ÛŒ Ø±Ù¾ÙˆØ±Ù¹ Ø¯Ø±Ø¬ Ø°ÛŒÙ„ ÛÛ’:

ðŸ“Š *Ø®Ù„Ø§ØµÛ:* Ø­Ø§Ø¶Ø±ÛŒ ${presentCount}/${totalClasses} Ù„ÛŒÚ©Ú†Ø±Ø²Û”
ðŸ“– *Ù…Ø¶Ø§Ù…ÛŒÙ† Ú©ÛŒ ØªÙØµÛŒÙ„Ø§Øª Ø§ÙˆØ± Ù¾Ú‘Ú¾Ø§ÛŒØ§ Ú¯ÛŒØ§ Ù…ÙˆØ¶ÙˆØ¹:*
${summaryLinesUr.join('\n\n')}
----------------------------------------
JazakAllah Khair,
Fusion College Narowal Administration`;

      // Helper to delay executions (anti-spam block measure)
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (const ps of student.parents) {
        if (ps.parent?.phone) {
          // Wait 5-8 seconds randomly before sending next message
          const randomDelay = Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;
          await delay(randomDelay);

          const result = await sendWhatsAppMessage(ps.parent.phone, message);
          if (!result.skipped) {
            if (result.success) sent++;
          } else {
            skipped++;
          }

          // Log to DB
          await prisma.whatsAppLog.create({
            data: {
              studentId: student.id,
              parentPhone: ps.parent.phone,
              messageType: 'EOD_SUMMARY',
              success: !!result.success,
              errorMessage: result.error || (result.skipped ? 'Skipped: Config disabled' : null)
            }
          });
        }
      }
    }

    revalidatePath('/admin/whatsapp');
    return { success: true, sent, skipped };
  } catch (e) {
    console.error('[WhatsApp] End-of-day error:', e);
    return { error: e.message || 'Failed to send summaries.' };
  }
}

