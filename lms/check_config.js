import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkConfig() {
  try {
    const config = await prisma.whatsAppConfig.findUnique({ where: { id: 'default' } });
    console.log('--- WHATSAPP CONFIG ---');
    console.log(JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig();
