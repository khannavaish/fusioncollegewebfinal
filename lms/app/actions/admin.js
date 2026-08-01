'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import prisma from '@/utils/db';
import { classDisplayNameFromSlot } from '@/utils/timetable';
import { saveLocalFile } from '@/app/actions/upload';

// Auth helper
export async function verifyAdmin() {
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
    // Get the old name before updating so we can cascade it to timetable slots
    const existing = await prisma.class.findUnique({ where: { id }, select: { name: true } });
    const oldName = existing?.name;

    await prisma.$transaction(async (tx) => {
      await tx.class.update({ where: { id }, data: { name, academicYr } });
      
      // Cascade the rename to any timetable slots that reference the old class name
      if (oldName && oldName !== name) {
        // TimetableSlot stores the class name WITHOUT the 'BOYS ' or 'GIRLS ' prefix
        const oldDisplayName = oldName.replace(/^(boys|girls)\s+/i, '').trim();
        const newDisplayName = name.replace(/^(boys|girls)\s+/i, '').trim();
        
        if (oldDisplayName !== newDisplayName) {
          await tx.timetableSlot.updateMany({
            where: { className: oldDisplayName },
            data:  { className: newDisplayName },
          });
        }
      }
    });

    revalidatePath('/admin/classes');
    revalidatePath('/admin/timetable');
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
    // TimetableSlot stores: section="BOYS", className="Medical"
    // Class stores:         name="BOYS Medical"
    // We reconstruct the slot's full name inline to match.
    const allSlots = await prisma.timetableSlot.findMany();
    const targetClassName = assigned.class.name.trim().toUpperCase();
    const targetSubject = assigned.subject.name.trim().toLowerCase();

    const slotsToUpdate = allSlots.filter(s => {
      const sectionUpper = (s.section || '').trim().toUpperCase();
      const reconstructed = (sectionUpper === 'OTHER' || !sectionUpper)
        ? (s.className || '').trim().toUpperCase()
        : `${sectionUpper} ${(s.className || '').trim().toUpperCase()}`;
      return reconstructed === targetClassName &&
             (s.subject || '').trim().toLowerCase() === targetSubject;
    });

    console.log(`[Timetable Sync] Assign: class="${assigned.class.name}" subject="${assigned.subject.name}" teacher="${assigned.teacher?.name}" → ${slotsToUpdate.length} slot(s) updated`);

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
    revalidatePath('/teacher');
    return { success: true };
  } catch (e) {
    console.error('[assignTeacherToSubject error]', e);
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
    const allSlots = await prisma.timetableSlot.findMany();

    const slotsToUpdate = allSlots.filter(s => {
      const slotClassName = classDisplayNameFromSlot(s).toUpperCase();
      const targetClassName = unassigned.class.name.toUpperCase();
      const subjectMatch = s.subject.trim().toLowerCase() === unassigned.subject.name.trim().toLowerCase();
      
      return slotClassName === targetClassName && subjectMatch;
    });

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
  const department = formData.get('department')?.toString().trim() || null;
  const baseSalaryRaw = formData.get('baseSalary')?.toString().trim();
  const baseSalary = baseSalaryRaw ? parseFloat(baseSalaryRaw) : null;

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
          create: { id: authId, name, phone, qualification, department, baseSalary },
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
  const department = formData.get('department')?.toString().trim() || null;
  const baseSalaryRaw = formData.get('baseSalary')?.toString().trim();
  const baseSalary = baseSalaryRaw ? parseFloat(baseSalaryRaw) : null;
  const status = formData.get('status')?.toString();
  
  if (!id || !name) return { error: 'ID and name are required.' };
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } });
    if (!teacher) return { error: 'Teacher not found.' };
    await prisma.teacher.update({ where: { id }, data: { name, phone, qualification, department, baseSalary } });
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
  const whatsappNumber = formData.get('whatsappNumber')?.toString().trim() || null;
  const telephone = formData.get('telephone')?.toString().trim() || null;
  const address = formData.get('address')?.toString().trim() || null;
  const gender = formData.get('gender')?.toString().trim() || null;
  const photo = formData.get('photo');
  let photoUrl = null;

  if (!name || !fatherName || !classId || !guardianName || !guardianPhone) {
    return { error: 'Name, father\'s name, class, guardian name, and guardian phone are required.' };
  }

  if (photo && photo.size > 0) {
    photoUrl = await saveLocalFile(photo, 'student_photos');
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
              whatsappNumber,
              telephone,
              address,
              gender,
              photoUrl,
              admissionPercentage: admissionPercentage ?? undefined,
              feePackageId: (feePackageId && feePackageId !== 'CUSTOM') ? feePackageId : undefined,
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
  
  const cnic = formData.get('cnic')?.toString().trim() || null;
  const fatherCnic = formData.get('fatherCnic')?.toString().trim() || null;
  const whatsappNumber = formData.get('whatsappNumber')?.toString().trim() || null;
  const telephone = formData.get('telephone')?.toString().trim() || null;
  const address = formData.get('address')?.toString().trim() || null;
  const gender = formData.get('gender')?.toString().trim() || null;
  const photo = formData.get('photo');
  
  if (!id || !name || !fatherName || !classId) return { error: 'All fields are required.' };
  
  try {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return { error: 'Student not found.' };
    
    let photoUrl = student.photoUrl;
    if (photo && photo.size > 0) {
      const savedPhoto = await saveLocalFile(photo, 'student_photos');
      if (savedPhoto) photoUrl = savedPhoto;
    }

    await prisma.student.update({ 
      where: { id }, 
      data: { 
        name, 
        fatherName, 
        classId,
        cnic,
        fatherCnic,
        whatsappNumber,
        telephone,
        address,
        gender,
        photoUrl
      } 
    });
    if (status) await prisma.user.update({ where: { id: student.userId }, data: { status } });
    revalidatePath('/admin/students');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update student.' };
  }
}

export async function deleteStudent(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  if (!id) return { error: 'Student ID required.' };
  
  try {
    // 1. Fetch complete record for archiving and parent check
    const student = await prisma.student.findUnique({ 
      where: { id }, 
      include: { 
        user: true,
        parents: {
          include: {
            parent: {
              include: {
                user: true,
                _count: {
                  select: { children: true }
                }
              }
            }
          }
        },
        feeBills: true,
        attendance: true,
        examResults: true
      } 
    });
    
    if (!student) return { error: 'Student not found.' };

    // 2. Archive student data
    try {
      const fs = require('fs');
      const path = require('path');
      const archiveDir = path.join(process.cwd(), 'archives');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
      const archiveFile = path.join(archiveDir, 'deleted_students.json');
      
      const archiveData = {
        deletedAt: new Date().toISOString(),
        studentData: student
      };
      
      fs.appendFileSync(archiveFile, JSON.stringify(archiveData) + '\n');
    } catch (archiveErr) {
      console.error('Failed to archive student data:', archiveErr);
      // Proceed with deletion even if archiving fails, or return error?
      // Better to log it and proceed so it doesn't block deletion if file permissions fail.
    }

    const admin = adminClient();
    
    // 3. Process Parents
    for (const ps of student.parents) {
      const parent = ps.parent;
      // If this parent has exactly 1 child (which is the one being deleted), delete the parent completely
      if (parent._count.children <= 1) {
        if (parent.user?.authId) {
          await admin.auth.admin.deleteUser(parent.user.authId);
        }
        await prisma.user.delete({ where: { id: parent.userId } });
      }
    }

    // 4. Delete Student
    const authId = student.user.authId;
    await prisma.user.delete({ where: { id: student.userId } });
    await admin.auth.admin.deleteUser(authId);
    
    revalidatePath('/admin/students');
    return { success: true };
  } catch (e) {
    console.error(e);
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

export async function updateStudentFee(formData) {
  await verifyAdmin();
  const id = formData.get('id')?.toString();
  const admissionPercentageRaw = formData.get('admissionPercentage')?.toString().trim();
  const admissionPercentage = admissionPercentageRaw ? parseFloat(admissionPercentageRaw) : null;
  const feePackageId = formData.get('feePackageId')?.toString().trim() || null;
  const feeMonthlyOverrideRaw = formData.get('feeMonthlyOverride')?.toString().trim();
  const feeMonthlyOverride = feeMonthlyOverrideRaw ? parseFloat(feeMonthlyOverrideRaw) : null;

  if (!id) return { error: 'Student ID is required.' };

  try {
    await prisma.student.update({
      where: { id },
      data: {
        admissionPercentage: admissionPercentage ?? null,
        feePackageId: (feePackageId && feePackageId !== 'CUSTOM') ? feePackageId : null,
        feeMonthlyOverride: (feePackageId === 'CUSTOM' || !feePackageId) ? (feeMonthlyOverride ?? null) : null,
      }
    });
    revalidatePath('/admin/students');
    return { success: true };
  } catch (e) {
    return { error: `DB error: ${e.message}` };
  }
}

export async function searchGlobalUsers(query) {
  await verifyAdmin();
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return { results: [] };
  }

  const q = query.trim();

  try {
    const [students, teachers, parents] = await Promise.all([
      prisma.student.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { cnic: { contains: q, mode: 'insensitive' } },
            { fatherName: { contains: q, mode: 'insensitive' } },
            { fatherCnic: { contains: q, mode: 'insensitive' } },
            { telephone: { contains: q, mode: 'insensitive' } },
            { whatsappNumber: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { rollNumber: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { class: true },
      }),
      prisma.teacher.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { qualification: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.parent.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      })
    ]);

    const results = [
      ...students.map(s => ({
        id: s.id,
        type: 'STUDENT',
        name: s.name,
        subtitle: `Roll: ${s.rollNumber} • ${s.class.name}`,
        details: `S/O ${s.fatherName} ${s.telephone ? `• Tel: ${s.telephone}` : ''}`,
        link: `/admin/students/${s.id}`
      })),
      ...teachers.map(t => ({
        id: t.id,
        type: 'TEACHER',
        name: t.name,
        subtitle: t.department || 'Staff',
        details: `Phone: ${t.phone || 'N/A'} ${t.qualification ? `• ${t.qualification}` : ''}`,
        link: `/admin/teachers`
      })),
      ...parents.map(p => ({
        id: p.id,
        type: 'PARENT',
        name: p.name,
        subtitle: 'Parent/Guardian',
        details: `Phone: ${p.phone || 'N/A'}`,
        link: `/admin/parents`
      }))
    ];

    // Sort alphabetically by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    return { results: results.slice(0, 10) }; // Return top 10 combined
  } catch (e) {
    console.error('Search error:', e);
    return { error: 'Failed to search users' };
  }
}

// ── ADMIN PROFILE MANAGEMENT ────────────────────────────────────────────────
export async function updateAdminProfile(formData) {
  const user = await verifyAdmin();
  const name = formData.get('name')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!name || !email) return { error: 'Name and email are required.' };

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { admin: true }
    });

    if (!dbUser || !dbUser.admin) return { error: 'Admin record not found.' };

    const adminClientObj = adminClient();
    if (email !== user.email) {
      await adminClientObj.auth.admin.updateUserById(user.id, { email });
    }
    if (password && password.length >= 6) {
      await adminClientObj.auth.admin.updateUserById(user.id, { password });
    }

    await prisma.admin.update({
      where: { id: dbUser.admin.id },
      data: { name },
    });

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { 
        email,
        ...(password && password.length >= 6 ? { plainPassword: password } : {})
      },
    });

    revalidatePath('/admin/profile');
    return { success: true };
  } catch (e) {
    console.error('Update profile error:', e);
    return { error: 'Failed to update profile.' };
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

export async function bulkImportStudents(formData) {
  await verifyAdmin();
  const file = formData.get('file');
  if (!file || !file.name.endsWith('.csv')) {
    return { error: 'Please upload a valid CSV file.' };
  }

  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return { error: 'CSV file is empty or has no data rows.' };
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredCols = ['name', 'rollnumber', 'fathername', 'classid'];
    const missing = requiredCols.filter(c => !headers.includes(c));
    if (missing.length > 0) {
      return { error: `Missing required columns: ${missing.join(', ')}` };
    }

    const admin = adminClient();
    let successCount = 0;
    let errors = [];

    for (let i = 1; i < lines.length; i++) {
      // Very naive split that ignores quoted commas to keep it simple, but good enough for this
      const row = lines[i].split(',').map(cell => cell.trim());
      const data = {};
      headers.forEach((h, idx) => {
        data[h] = row[idx] || '';
      });

      const { name, rollnumber, fathername, classid, cnic, fathercnic, whatsappnumber, telephone, address, gender } = data;
      
      if (!name || !rollnumber || !fathername || !classid) {
        errors.push(`Row ${i + 1}: Missing required fields.`);
        continue;
      }

      const classObj = await prisma.class.findUnique({ where: { id: classid } });
      if (!classObj) {
        errors.push(`Row ${i + 1}: Class ID ${classid} not found.`);
        continue;
      }

      const existingStudent = await prisma.student.findUnique({ where: { rollNumber: rollnumber } });
      if (existingStudent) {
        errors.push(`Row ${i + 1}: Roll number ${rollnumber} already exists.`);
        continue;
      }

      const email = `s${rollnumber.toLowerCase()}@fusion.edu.pk`;
      const password = rollnumber;
      
      try {
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: 'STUDENT' },
        });

        if (authError) {
          errors.push(`Row ${i + 1}: Auth error - ${authError.message}`);
          continue;
        }

        const authUser = authData.user;

        await prisma.user.create({
          data: {
            authId: authUser.id,
            email,
            role: 'STUDENT',
            plainPassword: password,
            student: {
              create: {
                name,
                rollNumber: rollnumber,
                fatherName: fathername,
                classId: classid,
                cnic: cnic || null,
                fatherCnic: fathercnic || null,
                whatsappNumber: whatsappnumber || null,
                telephone: telephone || null,
                address: address || null,
                gender: gender || null,
              }
            }
          }
        });

        const parentPhone = telephone || whatsappnumber || `0000000000${successCount}`;
        let parentRecord = await prisma.parent.findFirst({
          where: { phone: parentPhone }
        });

        if (!parentRecord && parentPhone !== `0000000000${successCount}`) {
          const parentEmail = `p${rollnumber.toLowerCase()}@fusion.edu.pk`;
          const pAuth = await admin.auth.admin.createUser({
            email: parentEmail,
            password: parentPhone,
            email_confirm: true,
            user_metadata: { role: 'PARENT' },
          });

          if (!pAuth.error) {
            const newParentUser = await prisma.user.create({
              data: {
                authId: pAuth.data.user.id,
                email: parentEmail,
                role: 'PARENT',
                plainPassword: parentPhone,
                parent: {
                  create: {
                    name: fathername,
                    phone: parentPhone
                  }
                }
              },
              include: { parent: true }
            });
            parentRecord = newParentUser.parent;
          }
        }

        if (parentRecord) {
          const newStudent = await prisma.student.findUnique({ where: { rollNumber: rollnumber } });
          if (newStudent) {
            await prisma.parentStudent.create({
              data: {
                parentId: parentRecord.id,
                studentId: newStudent.id
              }
            });
          }
        }

        successCount++;
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: DB Error - ${rowErr.message}`);
      }
    }

    revalidatePath('/admin/students');
    return { success: true, count: successCount, errors };
  } catch (err) {
    return { error: 'Failed to process CSV file.' };
  }
}
