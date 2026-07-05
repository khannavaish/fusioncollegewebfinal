'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import { sendWhatsAppMessage } from './whatsapp';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { role: true },
  });
  if (!dbUser || dbUser.role !== 'ADMIN') throw new Error('Forbidden');
}

function uniqueClean(values) {
  return [...new Set(values.map(v => v?.toString().trim()).filter(Boolean))];
}

function formatAnnouncement(title, message) {
  return `*FUSION COLLEGE NAROWAL - ANNOUNCEMENT*\n\n*${title}*\n\n${message}\n\nRegards,\nFusion College Narowal Administration`;
}

export async function createAnnouncement(_prev, formData) {
  try {
    await verifyAdmin();

    const title = formData.get('title')?.toString().trim();
    const message = formData.get('message')?.toString().trim();
    const audience = formData.get('audience')?.toString() || 'ALL';
    const classIds = uniqueClean(formData.getAll('classIds'));
    const teacherIds = uniqueClean(formData.getAll('teacherIds'));
    const groupTargets = uniqueClean((formData.get('whatsappGroups')?.toString() || '').split(/[\n,]+/));
    const shareOnWhatsapp = formData.get('shareOnWhatsapp') === 'on';

    if (!title || !message) return { error: 'Title and announcement message are required.' };

    let sent = 0;
    let skipped = 0;

    if (shareOnWhatsapp) {
      const targets = [];

      if (audience === 'ALL' || audience === 'CLASSES') {
        const classWhere = classIds.length > 0 ? { id: { in: classIds } } : {};
        const classes = await prisma.class.findMany({
          where: classWhere,
          include: {
            students: {
              include: { parents: { include: { parent: true } } },
            },
          },
        });

        for (const cls of classes) {
          for (const student of cls.students) {
            for (const link of student.parents) {
              if (link.parent?.phone) targets.push(link.parent.phone);
            }
          }
        }
      }

      if (audience === 'ALL' || audience === 'TEACHERS') {
        const teacherWhere = teacherIds.length > 0 ? { id: { in: teacherIds } } : {};
        const teachers = await prisma.teacher.findMany({ where: teacherWhere });
        for (const teacher of teachers) {
          if (teacher.phone) targets.push(teacher.phone);
        }
      }

      targets.push(...groupTargets);
      const uniqueTargets = uniqueClean(targets);
      const whatsappMessage = formatAnnouncement(title, message);

      for (const target of uniqueTargets) {
        const result = await sendWhatsAppMessage(target, whatsappMessage);
        if (result?.success) sent += 1;
        else skipped += 1;
      }
    }

    await prisma.announcement.create({
      data: {
        title,
        message,
        audience,
        classIds,
        teacherIds,
        whatsappTargets: groupTargets,
        shareOnWhatsapp,
        whatsappSent: sent,
      },
    });

    revalidatePath('/admin/announcements');
    return { success: true, sent, skipped };
  } catch (e) {
    console.error('Announcement error:', e);
    return { error: e.message || 'Failed to publish announcement.' };
  }
}

// ==================== Delete Announcement ====================
export async function deleteAnnouncement(formData) {
  try {
    await verifyAdmin();
    const id = formData.get('id')?.toString();
    if (!id) return { error: 'ID required.' };
    await prisma.announcement.delete({ where: { id } });
    revalidatePath('/admin/announcements');
    return { success: true };
  } catch (e) {
    console.error('deleteAnnouncement error:', e);
    return { error: e.message || 'Failed to delete announcement.' };
  }
}

// ==================== Edit Announcement ====================
export async function editAnnouncement(formData) {
  try {
    await verifyAdmin();
    const id = formData.get('id')?.toString();
    const title = formData.get('title')?.toString().trim();
    const message = formData.get('message')?.toString().trim();
    if (!id || !title || !message) return { error: 'ID, title and message are required.' };

    await prisma.announcement.update({
      where: { id },
      data: { title, message },
    });
    revalidatePath('/admin/announcements');
    return { success: true };
  } catch (e) {
    console.error('editAnnouncement error:', e);
    return { error: e.message || 'Failed to edit announcement.' };
  }
}

