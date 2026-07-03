const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

const defaultSeed = [
  // Boys Medical
  { section: 'BOYS', className: 'Medical', timeSlot: '7:30-8:10', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'BOYS', className: 'Medical', timeSlot: '8:10-8:50', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'Medical', timeSlot: '8:50-9:30', subject: 'Biology', teacher: 'Sir Abrar' },
  { section: 'BOYS', className: 'Medical', timeSlot: '9:50-10:30', subject: 'Chemistry', teacher: 'Sir Tahir' },
  { section: 'BOYS', className: 'Medical', timeSlot: '10:30-11:10', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'BOYS', className: 'Medical', timeSlot: '11:10-11:50', subject: 'Islamiat', teacher: 'Sir Akhtar' },

  // Boys I.C.S I
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '7:30-8:10', subject: 'Computer', teacher: 'Sir Faizan' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '8:10-8:50', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '8:50-9:30', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '9:50-10:30', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '10:30-11:10', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'BOYS', className: 'I.C.S I', timeSlot: '11:10-11:50', subject: 'Urdu', teacher: 'Sir Naeem' },

  // Boys I.C.S II
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '7:30-8:10', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '8:10-8:50', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '8:50-9:30', subject: 'English', teacher: 'Sir Shams' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '9:50-10:30', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '10:30-11:10', subject: 'Computer', teacher: 'Sir Nawaish' },
  { section: 'BOYS', className: 'I.C.S II', timeSlot: '11:10-11:50', subject: 'Physics', teacher: 'Sir Shafique' },

  // Girls Medical
  { section: 'GIRLS', className: 'Medical', timeSlot: '7:30-8:10', subject: 'Biology', teacher: 'Sir Abrar' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '8:10-8:50', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '8:50-9:30', subject: 'Physics', teacher: 'Sir Asif' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '9:50-10:30', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '10:30-11:10', subject: 'English', teacher: 'Sir Shams' },
  { section: 'GIRLS', className: 'Medical', timeSlot: '11:10-11:50', subject: 'Chemistry', teacher: 'Sir Tahir' },

  // Girls I.C.S
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '7:30-8:10', subject: 'Math', teacher: 'Sir Farasat' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '8:10-8:50', subject: 'Urdu', teacher: 'Sir Naeem' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '8:50-9:30', subject: 'Islamiat', teacher: 'Sir Akhtar' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '9:50-10:30', subject: 'Computer', teacher: 'Mam Sania' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '10:30-11:10', subject: 'Physics', teacher: 'Sir Shafique' },
  { section: 'GIRLS', className: 'I.C.S', timeSlot: '11:10-11:50', subject: 'English', teacher: 'Sir Shams' },
];

async function main() {
  console.log('Starting seed process from Timetable Data...');

  // 1. Extract Unique Classes
  const uniqueClasses = [...new Set(defaultSeed.map(s => `${s.section} ${s.className}`))];
  for (const c of uniqueClasses) {
    await prisma.class.upsert({
      where: { name: c },
      update: {},
      create: { name: c, academicYr: '2026' }
    });
  }
  console.log(`Ensured ${uniqueClasses.length} classes.`);

  // 2. Extract Unique Subjects
  const uniqueSubjects = [...new Set(defaultSeed.map(s => s.subject))];
  for (const s of uniqueSubjects) {
    await prisma.subject.upsert({
      where: { name: s },
      update: {},
      create: { name: s }
    });
  }
  console.log(`Ensured ${uniqueSubjects.length} subjects.`);

  // 3. Extract Unique Teachers and Create Accounts
  const uniqueTeachers = [...new Set(defaultSeed.map(s => s.teacher))];
  for (const t of uniqueTeachers) {
    const emailPrefix = t.toLowerCase().replace(/[^a-z]/g, '');
    const email = `${emailPrefix}@fusionlms.edu`;
    
    let dbUser = await prisma.user.findUnique({ where: { email } });
    
    if (!dbUser) {
      const password = generatePassword(8);
      console.log(`Creating teacher account for ${t} (${email})...`);
      
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'TEACHER' },
      });

      if (authError) {
        console.error(`Auth error for ${t}:`, authError.message);
        continue;
      }

      const authId = authData.user.id;
      await prisma.user.create({
        data: {
          id: authId,
          authId,
          email,
          role: 'TEACHER',
          status: 'ACTIVE',
          plainPassword: password,
          teacher: {
            create: { id: authId, name: t, qualification: 'Subject Specialist' },
          },
        },
      });
      console.log(`✅ Teacher ${t} created with password: ${password}`);
    }
  }

  // 4. Create ClassSubject assignments
  console.log('Assigning teachers to classes based on timetable...');
  const dbClasses = await prisma.class.findMany();
  const dbSubjects = await prisma.subject.findMany();
  const dbTeachers = await prisma.teacher.findMany();

  // Deduplicate timetable rows into unique [class, subject, teacher]
  const assignments = [];
  const seen = new Set();
  
  for (const s of defaultSeed) {
    const clsName = `${s.section} ${s.className}`;
    const key = `${clsName}|${s.subject}|${s.teacher}`;
    if (!seen.has(key)) {
      seen.add(key);
      assignments.push({ clsName, subjName: s.subject, teachName: s.teacher });
    }
  }

  for (const a of assignments) {
    const classId = dbClasses.find(c => c.name === a.clsName)?.id;
    const subjectId = dbSubjects.find(s => s.name === a.subjName)?.id;
    const teacherId = dbTeachers.find(t => t.name === a.teachName)?.id;

    if (classId && subjectId && teacherId) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId, subjectId } },
        update: { teacherId },
        create: { classId, subjectId, teacherId },
      });
    }
  }
  
  console.log('✅ Teacher assignments completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
