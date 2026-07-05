import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStudent() {
  const STUDENT_ID = 'fcc1e48f-63dd-4569-af9a-74bee63d9b87';
  
  const student = await prisma.student.findUnique({
    where: { id: STUDENT_ID },
    include: {
      parents: {
        include: { parent: true }
      }
    }
  });

  console.log('--- STUDENT ---');
  console.log('Name:', student?.name);
  console.log('Roll No:', student?.rollNumber);
  
  console.log('\n--- LINKED PARENTS ---');
  for (const ps of (student?.parents || [])) {
    console.log('Parent Name:', ps.parent?.name);
    console.log('Parent Phone:', ps.parent?.phone);
    console.log('---');
  }

  await prisma.$disconnect();
}

checkStudent();
