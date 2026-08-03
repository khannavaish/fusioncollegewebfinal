import { getDailyAttendance } from '@/app/actions/attendance';
import AttendanceClient from './AttendanceClient';

export const metadata = {
  title: 'Daily Attendance | Fusion LMS',
  description: 'View daily attendance reports across all classes',
};

export default async function AttendancePage() {
  const result = await getDailyAttendance();
  const data = result.success ? result : null;

  return <AttendanceClient initialData={data} />;
}
