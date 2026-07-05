import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateTeacherIds() {
  console.log('Starting teacher ID population for timetable slots...');
  
  try {
    // Fetch all teachers
    const teachers = await prisma.teacher.findMany({
      select: { id: true, name: true },
    });

    // Create a map of teacher name to ID (case-insensitive)
    const teacherNameToId = new Map();
    teachers.forEach((teacher) => {
      teacherNameToId.set(teacher.name.toLowerCase(), teacher.id);
    });

    console.log(`Found ${teachers.length} teachers in database`);

    // Fetch all timetable slots
    const slots = await prisma.timetableSlot.findMany();
    console.log(`Found ${slots.length} timetable slots to process`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Update each slot with teacherId
    for (const slot of slots) {
      if (!slot.teacher || slot.teacherId) {
        // Skip if no teacher name or already has teacherId
        continue;
      }

      const teacherId = teacherNameToId.get(slot.teacher.toLowerCase());
      
      if (teacherId) {
        await prisma.timetableSlot.update({
          where: { id: slot.id },
          data: { teacherId },
        });
        updatedCount++;
        console.log(`Updated slot: ${slot.className} - ${slot.timeSlot} - ${slot.teacher} -> ${teacherId}`);
      } else {
        notFoundCount++;
        console.warn(`Teacher not found for slot: ${slot.className} - ${slot.timeSlot} - ${slot.teacher}`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total slots processed: ${slots.length}`);
    console.log(`Slots updated: ${updatedCount}`);
    console.log(`Slots with teacher not found: ${notFoundCount}`);
    console.log('Teacher ID population completed successfully!');
    
  } catch (error) {
    console.error('Error populating teacher IDs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateTeacherIds()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
