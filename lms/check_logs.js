import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkLogs() {
  try {
    const logs = await prisma.whatsAppLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 10,
    });
    console.log('--- LATEST WHATSAPP LOGS ---');
    console.log(JSON.stringify(logs, null, 2));

    const totalLogs = await prisma.whatsAppLog.count();
    console.log('Total Logs in DB:', totalLogs);
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogs();
