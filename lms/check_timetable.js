import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSlots() {
  try {
    const slots = await prisma.timetableSlot.findMany();
    console.log('--- ALL TIMETABLE SLOTS ---');
    console.log(JSON.stringify(slots, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlots();
