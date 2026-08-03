import { getEnquiries } from '@/app/actions/enquiries';
import EnquiriesClient from './EnquiriesClient';

export const metadata = {
  title: 'Enquiries | Fusion LMS',
  description: 'Manage website contact enquiries',
};

export default async function EnquiriesPage() {
  const result = await getEnquiries();
  const enquiries = result.data || [];

  return <EnquiriesClient initialEnquiries={enquiries} />;
}
