import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: {
        authId: user.id,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
  }

  if (!dbUser) {
    redirect('/login');
  }

  redirect(`/${dbUser.role.toLowerCase()}`);
}
