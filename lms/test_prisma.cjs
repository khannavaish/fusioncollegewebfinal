const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  try { 
    const bill = await prisma.feeBill.findFirst(); 
    console.log(bill); 
    await prisma.feeBill.update({ 
      where: { id: bill.id }, 
      data: { status: 'PAID', paidAmount: 5000, paidAt: new Date(), remarks: 'Online Payment', paymentReceipt: '/uploads/receipt_123.jpg' } 
    }); 
    console.log('Update success'); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    await prisma.$disconnect(); 
  } 
} 
main();
