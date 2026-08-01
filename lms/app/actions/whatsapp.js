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

export async function getTargetNumbers(student) {
  const numbers = [];
  if (student.whatsappNumber?.trim()) {
    numbers.push(student.whatsappNumber.trim());
  }
  if (student.parents && Array.isArray(student.parents)) {
    for (const ps of student.parents) {
      if (ps.parent?.phone?.trim() && !numbers.includes(ps.parent.phone.trim())) {
        numbers.push(ps.parent.phone.trim());
      }
    }
  }
  return numbers;
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

  const baseUrl = config.gatewayUrl.replace(/\/$/, '');
  try {
    // First verify the WhatsApp socket is actually connected
    const statusRes = await fetch(`${baseUrl}/status`, { method: 'GET' });
    const contentType = statusRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Gateway is sleeping / returning HTML - Render cold start
      return { error: 'Gateway is starting up. Please try again in 30 seconds.' };
    }
    const statusData = await statusRes.json();
    if (!statusData.connected) {
      return { error: 'WhatsApp not connected. Admin must scan the QR code at /admin/whatsapp.' };
    }

    // Socket is connected - send the message
    const res = await fetch(`${baseUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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

// ─── Logout from WhatsApp Gateway ────────────────────────────────────────────────────
export async function logoutWhatsAppGateway() {
  await verifyAdmin();
  
  const config = await prisma.whatsAppConfig.findUnique({ where: { id: 'default' } });
  if (!config || config.provider !== 'CUSTOM') {
    return { error: 'Logout is only available for custom self-hosted gateway.' };
  }

  if (!config.gatewayUrl) {
    return { error: 'Gateway URL not configured.' };
  }

  try {
    const url = `${config.gatewayUrl.replace(/\/$/, '')}/logout`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { error: data.error || 'Failed to logout from gateway.' };
    }
    return { success: true, message: data.message };
  } catch (e) {
    console.error('[WhatsApp] Gateway logout error:', e);
    return { error: e.message || 'Failed to connect to gateway.' };
  }
}

// â”€â”€â”€ Send First-Arrival Message (called after first attendance of day) â”€â”€â”€â”€â”€â”€â”€â”€
export async function sendArrivalWhatsApp(studentId, status = 'PRESENT') {
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
    
    let statusBlock = '```\n🟢 STATUS: PRESENT (حاضر)\n```';
    let englishStatus = `has arrived safely at the college today, ${today}.`;
    let urduStatus = `آج مورخہ ${today} کو بحفظ کالج پہنچ چکا ہے۔`;

    if (status === 'LATE') {
      statusBlock = '```\n🟡 STATUS: LATE (دیر سے)\n```';
      englishStatus = `has arrived late at the college today, ${today}.`;
      urduStatus = `آج مورخہ ${today} کو کالج دیر سے پہنچا ہے۔`;
    } else if (status === 'ABSENT') {
      statusBlock = '```\n🔴 STATUS: ABSENT (غیر حاضر)\n```';
      englishStatus = `is absent from the college today, ${today}.`;
      urduStatus = `آج مورخہ ${today} کو کالج سے غیر حاضر ہے۔`;
    } else if (status === 'LEAVE') {
      statusBlock = '```\n🔵 STATUS: LEAVE (رخصت)\n```';
      englishStatus = `is on approved leave today, ${today}.`;
      urduStatus = `آج مورخہ ${today} کو رخصت پر ہے۔`;
    }

    const message = `*FUSION COLLEGE NAROWAL - ARRIVAL NOTIFICATION* 🏫

${statusBlock}

Assalamu Alaikum,
Your child *${student.name}* (Roll No: ${student.rollNumber}) ${englishStatus}

السلام علیکم
آپ کا بچہ *${student.name}* (رول نمبر: ${student.rollNumber}) ${urduStatus}

Regards,
Fusion College Narowal Administration`;

    const targetNumbers = await getTargetNumbers(student);
    for (const phone of targetNumbers) {
      const result = await sendWhatsAppMessage(phone, message);
      
      // Log to DB
      await prisma.whatsAppLog.create({
        data: {
          studentId: student.id,
          parentPhone: phone,
          messageType: 'ARRIVAL',
          success: !!result.success,
          errorMessage: result.error || (result.skipped ? 'Skipped: Config disabled' : null)
        }
      });
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

    // Group lectures by classId
    const classLecturesMap = {};
    for (const lec of lectures) {
      const cId = lec.classSubject.class.id;
      if (!classLecturesMap[cId]) {
        classLecturesMap[cId] = {
          classData: lec.classSubject.class,
          lectures: []
        };
      }
      classLecturesMap[cId].lectures.push({
        subject: lec.classSubject.subject.name,
        teacher: lec.classSubject.teacher.name,
        topic: lec.topic && !lec.topic.startsWith('Pending') ? lec.topic : 'No topic logged.',
      });
    }

    const formattedDate = targetDate.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let sent = 0;
    let skipped = 0;

    // Helper to delay executions (anti-spam block measure)
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const [cId, data] of Object.entries(classLecturesMap)) {
      const students = data.classData.students;
      
      let summaryLinesEn = [];
      let summaryLinesUr = [];

      data.lectures.forEach(lec => {
        summaryLinesEn.push(`📖 *${lec.subject}* (by ${lec.teacher}):\n   Topic: ${lec.topic}`);
        summaryLinesUr.push(`📖 *${lec.subject}* (بذریعہ ${lec.teacher}):\n   موضوع: ${lec.topic}`);
      });

      const joinedEn = summaryLinesEn.join('\n\n');
      const joinedUr = summaryLinesUr.join('\n\n');

      for (const student of students) {
        if (!student.parents || student.parents.length === 0) { skipped++; continue; }

        const message = `*FUSION COLLEGE NAROWAL - END-OF-DAY ACADEMIC REPORT* 🏫
----------------------------------------
*Student:* ${student.name} (${student.rollNumber})
*Date:* ${formattedDate}

*English:*
Assalamu Alaikum,
Here is the daily academic summary of topics taught in your child's class today:

${joinedEn}

*اردو:*
السلام علیکم
آپ کے بچے کی کلاس میں آج پڑھائے گئے موضوعات کی تعلیمی رپورٹ درج ذیل ہے:

${joinedUr}
----------------------------------------
JazakAllah Khair,
Fusion College Narowal Administration`;

      // Helper to delay executions (anti-spam block measure)
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const targetNumbers = await getTargetNumbers(student);
      for (const phone of targetNumbers) {
        // Wait 5-8 seconds randomly before sending next message
        const randomDelay = Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;
        await delay(randomDelay);

        const result = await sendWhatsAppMessage(phone, message);
        if (!result.skipped) {
          if (result.success) sent++;
        } else {
          skipped++;
        }

        // Log to DB
        await prisma.whatsAppLog.create({
          data: {
            studentId: student.id,
            parentPhone: phone,
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

// ─── Send Broadcast Message to All Parents ─────────────────────────────────
export async function sendBroadcastMessage(formData) {
  await verifyAdmin();
  const classId   = formData.get('classId')?.toString();
  const message   = formData.get('message')?.toString()?.trim();

  if (!message) return { error: 'Message cannot be empty.' };

  try {
    const whereClause = classId && classId !== 'ALL' ? { classId } : {};
    const students = await prisma.student.findMany({
      where: whereClause,
      include: { parents: { include: { parent: true } } },
    });

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let sent = 0, skipped = 0;

    for (const student of students) {
      const targetNumbers = await getTargetNumbers(student);
      if (targetNumbers.length === 0) { skipped++; continue; }
      for (const phone of targetNumbers) {
        const randomDelay = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
        await delay(randomDelay);
        const result = await sendWhatsAppMessage(phone, message);
        if (result.skipped) { skipped++; } else if (result.success) { sent++; }
        await prisma.whatsAppLog.create({
          data: {
            studentId: student.id,
            parentPhone: phone,
            messageType: 'BROADCAST',
            success: !!result.success,
            errorMessage: result.error || (result.skipped ? 'Skipped: Config disabled' : null)
          }
        });
      }
    }

    revalidatePath('/admin/whatsapp');
    return { success: true, sent, skipped };
  } catch (e) {
    console.error('[WhatsApp] Broadcast error:', e);
    return { error: e.message || 'Failed to send broadcast.' };
  }
}
