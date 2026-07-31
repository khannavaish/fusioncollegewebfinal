'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import prisma from '@/utils/db';

// Auth helper
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

// Password + Credential helpers
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

function classPrefix(className) {
  const trimmed = className.trim();
  const upper = trimmed.toUpperCase();

  let section = '';
  let rest = '';

  if (upper.startsWith('BOYS ')) {
    section = 'BOYS';
    rest = trimmed.slice(5);
  } else if (upper.startsWith('GIRLS ')) {
    section = 'GIRLS';
    rest = trimmed.slice(6);
  } else if (upper.startsWith('OTHER ')) {
    section = 'OTHER';
    rest = trimmed.slice(6);
  } else {
    return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'STU';
  }

  const cleanRest = rest.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${section}-${cleanRest}`;
}

async function generateRollNumber(classId) {
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  const prefix = classPrefix(cls?.name || 'STU');
  const count = await prisma.student.count({ where: { classId } });
  const next = count + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

// CLASSES
export async function createClass(formData) {
  await verifyAdmin();
  const name = formData.get('name')?.toString().trim();
  const academicYr = formData.get('academicYr')?.toString().trim();
  if (!name || !academicYr) return { error: 'Name and academic year are required.' };
  try {
    await prisma.class.create({ data: { name, academicYr } });
    revalidatePath('/admin/classes');
    return { success: true };
  } catch (e) {
    if (e.code === 'P2002') return { error: 'A class with that name already exists.' };
    return { error: 'Failed to create class.' };
  }
}

export async function updateClass(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const academicYr = formData.get('academicYr')?.toString().trim();
  if (!id || !name || !academicYr) return { error: 'All fields are required.' };
  try {
    await prisma.class.update({ where: { id }, data: { name, academicYr } });
    revalidatePath('/admin/classes');
    return { success: true };
  } catch (e) {
    if (e.code === 'P2002') return { error: 'A class with that name already exists.' };
    return { error: 'Failed to update class.' };
  }
}

export async function deleteClass(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Class ID required.' };
  try {
    // 1. Get all students of this class to delete their Auth accounts
    const students = await prisma.student.findMany({
      where: { classId: id },
      include: { user: true }
    });

    const admin = adminClient();

    // 2. Perform deletion inside a Prisma transaction
    await prisma.$transaction(async (tx) => {
      if (students.length > 0) {
        const studentUserIds = students.map(s => s.userId);
        // Delete parent links for these students
        await tx.parentStudent.deleteMany({
          where: { studentId: { in: studentUserIds } }
        });
        // Delete users (which cascade deletes Student rows)
        await tx.user.deleteMany({
          where: { id: { in: studentUserIds } }
        });
      }

      // Delete ClassSubject associations (which cascade deletes materials, assignments, etc.)
      await tx.classSubject.deleteMany({
        where: { classId: id }
      });

      // Delete the class itself
      await tx.class.delete({
        where: { id }
      });
    });

    // 3. Delete from Supabase Auth
    for (const student of students) {
      if (student.user?.authId) {
        try {
          await admin.auth.admin.deleteUser(student.user.authId);
        } catch (authErr) {
          console.error(`Auth deletion failed for student auth ID ${student.user.authId}:`, authErr);
        }
      }
    }

    revalidatePath('/admin/classes');
    revalidatePath('/admin/students');
    return { success: true };
  } catch (e) {
    console.error('Failed to delete class:', e);
    return { error: `Failed to delete class: ${e.message || e}` };
  }
}

// SUBJECTS
export async function createSubject(formData) {
  await verifyAdmin();
  const name = formData.get('name')?.toString().trim();
  if (!name) return { error: 'Subject name is required.' };
  try {
    await prisma.subject.create({ data: { name } });
    revalidatePath('/admin/subjects');
    return { success: true };
  } catch (e) {
    if (e.code === 'P2002') return { error: 'A subject with that name already exists.' };
    return { error: 'Failed to create subject.' };
  }
}

export async function updateSubject(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  if (!id || !name) return { error: 'All fields are required.' };
  try {
    await prisma.subject.update({ where: { id }, data: { name } });
    revalidatePath('/admin/subjects');
    return { success: true };
  } catch (e) {
    if (e.code === 'P2002') return { error: 'A subject with that name already exists.' };
    return { error: 'Failed to update subject.' };
  }
}

export async function deleteSubject(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Subject ID required.' };
  try {
    await prisma.subject.delete({ where: { id } });
    revalidatePath('/admin/subjects');
    return { success: true };
  } catch {
    return { error: 'Failed to delete subject.' };
  }
}

// CLASS-SUBJECTS
export async function assignTeacherToSubject(formData) {
  await verifyAdmin();
  const classId = formData.get('classId')?.toString();
  const subjectId = formData.get('subjectId')?.toString();
  const teacherId = formData.get('teacherId')?.toString();
  if (!classId || !subjectId || !teacherId) return { error: 'All fields are required.' };
  try {
    const assigned = await prisma.classSubject.upsert({
      where: { classId_subjectId: { classId, subjectId } },
      update: { teacherId },
      create: { classId, subjectId, teacherId },
      include: { class: true, subject: true, teacher: true }
    });

    // ── Auto-sync to Timetable ─────────────────────────────────────────────
    // Since TimetableSlot.subject is free-text, we need to match it case-insensitively
    const classSlots = await prisma.timetableSlot.findMany({
      where: { className: assigned.class.name }
    });

    const slotsToUpdate = classSlots.filter(
      s => s.subject.trim().toLowerCase() === assigned.subject.name.trim().toLowerCase()
    );

    if (slotsToUpdate.length > 0) {
      const slotIds = slotsToUpdate.map(s => s.id);
      await prisma.timetableSlot.updateMany({
        where: { id: { in: slotIds } },
        data: {
          teacherId: assigned.teacherId,
          teacher: assigned.teacher?.name || '',
        }
      });
    }

    revalidatePath('/admin/classes');
    revalidatePath('/admin/timetable');
    revalidatePath('/timetable');
    return { success: true };
  } catch {
    return { error: 'Failed to assign teacher to subject.' };
  }
}

export async function removeClassSubject(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Assignment ID required.' };
  try {
    const unassigned = await prisma.classSubject.delete({ 
      where: { id },
      include: { class: true, subject: true } 
    });

    // ── Auto-sync to Timetable ─────────────────────────────────────────────
    const classSlots = await prisma.timetableSlot.findMany({
      where: { className: unassigned.class.name }
    });

    const slotsToUpdate = classSlots.filter(
      s => s.subject.trim().toLowerCase() === unassigned.subject.name.trim().toLowerCase()
    );

    if (slotsToUpdate.length > 0) {
      const slotIds = slotsToUpdate.map(s => s.id);
      await prisma.timetableSlot.updateMany({
        where: { id: { in: slotIds } },
        data: {
          teacherId: null,
          teacher: '',
        }
      });
    }

    revalidatePath('/admin/classes');
    revalidatePath('/admin/timetable');
    revalidatePath('/timetable');
    return { success: true };
  } catch {
    return { error: 'Failed to remove subject.' };
  }
}

// TEACHERS
export async function createTeacher(_prev, formData) {
  await verifyAdmin();
  const email = formData.get('email')?.toString().trim();
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim() || null;
  const qualification = formData.get('qualification')?.toString().trim() || null;

  if (!email || !name) return { error: 'Email and name are required.' };

  const password = generatePassword(10);

  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'TEACHER' },
  });
  if (authError) return { error: `Auth error: ${authError.message}` };

  const authId = authData.user.id;
  try {
    await prisma.user.create({
      data: {
        id: authId,
        authId,
        email,
        role: 'TEACHER',
        status: 'ACTIVE',
        plainPassword: password,
        teacher: {
          create: { id: authId, name, phone, qualification },
        },
      },
    });
    revalidatePath('/admin/teachers');
    return { success: true, credentials: { email, password, name } };
  } catch (e) {
    await admin.auth.admin.deleteUser(authId);
    return { error: `DB error: ${e.message}` };
  }
}

export async function updateTeacher(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim() || null;
  const qualification = formData.get('qualification')?.toString().trim() || null;
  const status = formData.get('status')?.toString();
  if (!id || !name) return { error: 'ID and name are required.' };
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
    if (!teacher) return { error: 'Teacher not found.' };
    await prisma.teacher.update({ where: { id }, data: { name, phone, qualification } });
    if (status) await prisma.user.update({ where: { id: teacher.userId }, data: { status } });
    revalidatePath('/admin/teachers');
    return { success: true };
  } catch {
    return { error: 'Failed to update teacher.' };
  }
}

export async function deleteTeacher(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Teacher ID required.' };
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
    if (!teacher) return { error: 'Teacher not found.' };

    await prisma.$transaction(async (tx) => {
      // 1. Delete all class subject mappings for this teacher
      await tx.classSubject.deleteMany({
        where: { teacherId: id }
      });
      // 2. Blank out all timetable slots that referenced this teacher
      await tx.timetableSlot.updateMany({
        where: { teacherId: id },
        data: { teacher: '', teacherId: null },
      });
      // 3. Remove teacher as Class Incharge from any class they were assigned to
      await tx.class.updateMany({
        where: { inchargeTeacherId: id },
        data: { inchargeTeacherId: null },
      });
      // 4. Set the User status to INACTIVE
      await tx.user.update({
        where: { id: teacher.userId },
        data: { status: 'INACTIVE' }
      });
    });

    revalidatePath('/admin/teachers');
    revalidatePath('/admin/timetable');
    revalidatePath('/timetable');
    revalidatePath('/teacher');
    return { success: true };
  } catch (e) {
    console.error('Failed to delete teacher:', e);
    return { error: 'Failed to deactivate teacher.' };
  }
}


// STUDENTS
export async function createStudent(_prev, formData) {
  await verifyAdmin();
  const name = formData.get('name')?.toString().trim();
  const fatherName = formData.get('fatherName')?.toString().trim();
  const classId = formData.get('classId')?.toString();
  const guardianName = formData.get('guardianName')?.toString().trim();
  const guardianPhone = formData.get('guardianPhone')?.toString().trim();
  const cnic = formData.get('cnic')?.toString().trim() || null;
  const fatherCnic = formData.get('fatherCnic')?.toString().trim() || null;
  const admissionPercentageRaw = formData.get('admissionPercentage')?.toString().trim();
  const admissionPercentage = admissionPercentageRaw ? parseFloat(admissionPercentageRaw) : null;
  const feePackageId = formData.get('feePackageId')?.toString().trim() || null;
  const feeMonthlyOverrideRaw = formData.get('feeMonthlyOverride')?.toString().trim();
  const feeMonthlyOverride = feeMonthlyOverrideRaw ? parseFloat(feeMonthlyOverrideRaw) : null;

  if (!name || !fatherName || !classId || !guardianName || !guardianPhone) {
    return { error: 'Name, father\'s name, class, guardian name, and guardian phone are required.' };
  }

  // Auto-generate roll number + credentials
  const rollNumber = await generateRollNumber(classId);
  const email = `${rollNumber.toLowerCase().replace('-', '')}@fusionlms.edu`;
  const password = generatePassword(8);

  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'STUDENT' },
  });
  if (authError) return { error: `Auth error: ${authError.message}` };

  const authId = authData.user.id;
  let parentAuthId = null;
  let parentEmail = '';
  let parentPassword = '';
  let isExistingParent = false;
  let parentDbId = '';

  try {
    const existingParent = await prisma.parent.findFirst({
      where: { phone: guardianPhone },
    });

    if (existingParent) {
      isExistingParent = true;
      parentDbId = existingParent.id;
    } else {
      parentEmail = `parent_${rollNumber.toLowerCase().replace('-', '')}@fusionlms.edu`;
      parentPassword = generatePassword(8);

      const { data: parentAuthData, error: parentAuthError } = await admin.auth.admin.createUser({
        email: parentEmail,
        password: parentPassword,
        email_confirm: true,
        user_metadata: { role: 'PARENT' },
      });

      if (parentAuthError) {
        await admin.auth.admin.deleteUser(authId);
        return { error: `Parent Auth error: ${parentAuthError.message}` };
      }

      parentAuthId = parentAuthData.user.id;
      parentDbId = parentAuthId;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create student
      await tx.user.create({
        data: {
          id: authId,
          authId,
          email,
          role: 'STUDENT',
          status: 'ACTIVE',
          plainPassword: password,
          student: {
            create: {
              id: authId,
              name,
              rollNumber,
              fatherName,
              classId,
              cnic,
              fatherCnic,
              admissionPercentage: admissionPercentage ?? undefined,
              feePackageId: feePackageId || undefined,
              feeMonthlyOverride: feeMonthlyOverride ?? undefined,
            },
          },
        },
      });

      // 2. If new parent, create parent
      if (!isExistingParent) {
        await tx.user.create({
          data: {
            id: parentAuthId,
            authId: parentAuthId,
            email: parentEmail,
            role: 'PARENT',
            status: 'ACTIVE',
            plainPassword: parentPassword,
            parent: {
              create: { id: parentAuthId, name: guardianName, phone: guardianPhone },
            },
          },
        });
      }

      // 3. Link them
      await tx.parentStudent.create({
        data: {
          parentId: parentDbId,
          studentId: authId,
        },
      });
    });

    revalidatePath('/admin/students');
    revalidatePath('/admin/parents');

    return {
      success: true,
      credentials: {
        name,
        rollNumber,
        loginId: rollNumber,
        email,
        password,
        parent: {
          name: guardianName,
          phone: guardianPhone,
          email: isExistingParent ? '' : parentEmail,
          password: isExistingParent ? '' : parentPassword,
          isExisting: isExistingParent,
        },
      },
    };
  } catch (e) {
    await admin.auth.admin.deleteUser(authId);
    if (parentAuthId) {
      await admin.auth.admin.deleteUser(parentAuthId);
    }
    if (e.code === 'P2002') return { error: 'Roll number conflict. Please try again.' };
    return { error: `DB error: ${e.message}` };
  }
}

export async function updateStudent(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const fatherName = formData.get('fatherName')?.toString().trim();
  const classId = formData.get('classId')?.toString();
  const status = formData.get('status')?.toString();
  if (!id || !name || !fatherName || !classId) return { error: 'All fields are required.' };
  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return { error: 'Student not found.' };
    await prisma.student.update({ where: { id }, data: { name, fatherName, classId } });
    if (status) await prisma.user.update({ where: { id: student.userId }, data: { status } });
    revalidatePath('/admin/students');
    return { success: true };
  } catch {
    return { error: 'Failed to update student.' };
  }
}

export async function deleteStudent(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Student ID required.' };
  try {
    const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
    if (!student) return { error: 'Student not found.' };
    const authId = student.user.authId;
    await prisma.user.delete({ where: { id: student.userId } });
    const admin = adminClient();
    await admin.auth.admin.deleteUser(authId);
    revalidatePath('/admin/students');
    return { success: true };
  } catch {
    return { error: 'Failed to delete student.' };
  }
}

export async function transferStudent(formData) {
  await verifyAdmin();
  const studentId = formData.get('studentId')?.toString();
  const classId = formData.get('classId')?.toString();
  if (!studentId || !classId) return { error: 'Student and Class are required.' };
  try {
    await prisma.student.update({
      where: { id: studentId },
      data: { classId },
    });
    revalidatePath('/admin/students');
    return { success: true };
  } catch (e) {
    return { error: `Failed to transfer student: ${e.message}` };
  }
}

// PARENTS
export async function createParent(formData) {
  await verifyAdmin();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim();
  const studentIds = formData.getAll('studentIds');

  if (!email || !password || !name || !phone) return { error: 'Email, password, name and phone are required.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };

  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'PARENT' },
  });
  if (authError) return { error: authError.message };

  const authId = authData.user.id;
  try {
    const created = await prisma.user.create({
      data: {
        id: authId,
        authId,
        email,
        role: 'PARENT',
        status: 'ACTIVE',
        plainPassword: password,
        parent: { create: { id: authId, name, phone } },
      },
      include: { parent: true },
    });
    if (studentIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: studentIds.map((sid) => ({ parentId: created.parent.id, studentId: sid })),
        skipDuplicates: true,
      });
    }
    revalidatePath('/admin/parents');
    return { success: true };
  } catch {
    await admin.auth.admin.deleteUser(authId);
    return { error: 'Failed to create parent profile.' };
  }
}

export async function updateParent(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const phone = formData.get('phone')?.toString().trim();
  const status = formData.get('status')?.toString();
  const studentIds = formData.getAll('studentIds');
  if (!id || !name || !phone) return { error: 'All fields are required.' };
  try {
    const parent = await prisma.parent.findUnique({ where: { id } });
    if (!parent) return { error: 'Parent not found.' };
    await prisma.parent.update({ where: { id }, data: { name, phone } });
    if (status) await prisma.user.update({ where: { id: parent.userId }, data: { status } });
    await prisma.parentStudent.deleteMany({ where: { parentId: id } });
    if (studentIds.length > 0) {
      await prisma.parentStudent.createMany({
        data: studentIds.map((sid) => ({ parentId: id, studentId: sid })),
        skipDuplicates: true,
      });
    }
    revalidatePath('/admin/parents');
    return { success: true };
  } catch {
    return { error: 'Failed to update parent.' };
  }
}

export async function deleteParent(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Parent ID required.' };
  try {
    const parent = await prisma.parent.findUnique({ where: { id }, include: { user: true } });
    if (!parent) return { error: 'Parent not found.' };
    const authId = parent.user.authId;
    await prisma.user.delete({ where: { id: parent.userId } });
    const admin = adminClient();
    await admin.auth.admin.deleteUser(authId);
    revalidatePath('/admin/parents');
    return { success: true };
  } catch {
    return { error: 'Failed to delete parent.' };
  }
}

// ENQUIRIES
export async function updateEnquiryStatus(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const status = formData.get('status')?.toString();
  if (!id || !status) return { error: 'Missing fields.' };
  try {
    await prisma.contactEnquiry.update({ where: { id }, data: { status } });
    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { error: 'Failed to update enquiry.' };
  }
}

// ADMIN CREDENTIALS
export async function updateUserPassword(formData) {
  await verifyAdmin();
  const userId = formData.get('userId')?.toString();
  const newPassword = formData.get('newPassword')?.toString();
  if (!userId || !newPassword) return { error: 'User ID and new password are required.' };
  if (newPassword.length < 6) return { error: 'Password must be at least 6 characters.' };

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: 'User not found.' };

    const admin = adminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(user.authId, { password: newPassword });
    if (authError) return { error: authError.message };

    await prisma.user.update({
      where: { id: userId },
      data: { plainPassword: newPassword },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/teachers');
    revalidatePath('/admin/students');
    revalidatePath('/admin/parents');

    return { success: true };
  } catch (e) {
    return { error: 'Failed to update password.' };
  }
}


export async function resetSchoolData(formData) {
  await verifyAdmin();

  const confirmText = formData.get('confirmText')?.toString().trim();
  if (confirmText !== 'RESET') {
    return { error: 'Type RESET to confirm the reset.' };
  }

  try {
    const authUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['STUDENT', 'TEACHER', 'PARENT'],
        },
      },
      select: { authId: true, role: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.classSubject.deleteMany();
      await tx.assignment.deleteMany();
      await tx.user.deleteMany({
        where: {
          role: {
            in: ['STUDENT', 'TEACHER', 'PARENT'],
          },
        },
      });
    });

    const admin = adminClient();
    for (const user of authUsers) {
      if (!user.authId) continue;
      try {
        await admin.auth.admin.deleteUser(user.authId);
      } catch (authErr) {
        console.error(`Auth deletion failed for ${user.role} auth ID ${user.authId}:`, authErr);
      }
    }

    revalidatePath('/admin');
    revalidatePath('/admin/students');
    revalidatePath('/admin/teachers');
    revalidatePath('/admin/parents');
    revalidatePath('/admin/classes');
    revalidatePath('/teacher');
    revalidatePath('/student');
    revalidatePath('/parent');

    return { success: true };
  } catch (e) {
    console.error('Failed to reset school data:', e);
    return { error: e.message || 'Failed to reset teachers and students.' };
  }
}

export async function checkGuardianName(name) {
  try {
    await verifyAdmin();
    if (!name || name.trim().length < 3) return [];
    const parents = await prisma.parent.findMany({
      where: {
        name: {
          contains: name.trim(),
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        user: {
          select: {
            email: true
          }
        }
      },
      take: 5
    });
    return parents;
  } catch {
    return [];
  }
}

