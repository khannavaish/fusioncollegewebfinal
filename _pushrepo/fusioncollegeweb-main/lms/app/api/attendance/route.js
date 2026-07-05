import { createClient } from '@/utils/supabase/server';
import prisma from '@/utils/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classSubjectId, date, attendance } = body;

    // Verify user is a teacher
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { teacher: true },
    });

    if (!dbUser || dbUser.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify teacher is assigned to this class
    const classSubject = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { students: true },
    });

    if (!classSubject || classSubject.teacherId !== dbUser.teacher.id) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 });
    }

    // Create lecture record
    const lecture = await prisma.lecture.create({
      data: {
        classSubjectId,
        date: new Date(date),
        topic: 'Class Lecture',
      },
    });

    // Create attendance records
    const attendanceRecords = await Promise.all(
      attendance.map((record) =>
        prisma.attendance.create({
          data: {
            lectureId: lecture.id,
            studentId: record.studentId,
            status: record.status,
          },
        })
      )
    );

    return NextResponse.json({ 
      success: true, 
      lectureId: lecture.id,
      attendanceCount: attendanceRecords.length 
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classSubjectId = searchParams.get('classSubjectId');

    if (!classSubjectId) {
      return NextResponse.json({ error: 'Class subject ID required' }, { status: 400 });
    }

    // Verify user is a teacher
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: { teacher: true },
    });

    if (!dbUser || dbUser.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch attendance records
    const attendance = await prisma.attendance.findMany({
      where: {
        lecture: {
          classSubjectId,
        },
      },
      include: {
        lecture: {
          include: {
            classSubject: {
              include: {
                subject: true,
              },
            },
          },
        },
        student: true,
      },
      orderBy: { lecture: { date: 'desc' } },
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
