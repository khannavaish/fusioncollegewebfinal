'use server';

import prisma from '@/utils/db';
import { revalidatePath } from 'next/cache';

export async function getEnquiries() {
  try {
    const enquiries = await prisma.contactEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { data: enquiries };
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return { error: 'Failed to fetch enquiries' };
  }
}

export async function markEnquiryStatus(id, status) {
  try {
    await prisma.contactEnquiry.update({
      where: { id },
      data: { status },
    });
    revalidatePath('/admin/enquiries');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return { error: 'Failed to update enquiry status' };
  }
}

export async function deleteEnquiry(id) {
  try {
    await prisma.contactEnquiry.delete({
      where: { id },
    });
    revalidatePath('/admin/enquiries');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    return { error: 'Failed to delete enquiry' };
  }
}
