import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AnimatedSection from '@/app/components/AnimatedSection';
import prisma from '@/utils/db';
import Link from 'next/link';

export default async function StudentCourseDetailPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user has STUDENT role
  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Error fetching user role:', err);
  }

  if (!dbUser || dbUser.role !== 'STUDENT') {
    if (dbUser) {
      redirect(`/${dbUser.role.toLowerCase()}`);
    } else {
      redirect('/login');
    }
  }

  const student = dbUser.student;

  // Fetch class subject details along with materials & lectures
  let classSubject = null;
  try {
    classSubject = await prisma.classSubject.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        teacher: true,
        materials: {
          orderBy: { createdAt: 'desc' },
        },
        lectures: {
          orderBy: { date: 'desc' },
        },
      },
    });
  } catch (err) {
    console.error('Error fetching student course details:', err);
  }

  // Verify this class subject belongs to the student's class
  if (!classSubject || classSubject.classId !== student.classId) {
    redirect('/student/courses');
  }

  return (
    <div className="space-y-8 font-sans">
      <AnimatedSection delay={0.1}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e233d] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{classSubject.subject.name}</h1>
            <p className="text-zinc-400 text-sm mt-1">Instructor: {classSubject.teacher.name} | Class: {classSubject.class.name}</p>
          </div>
          <Link href="/student/courses" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            &larr; Back to My Courses
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Lecture Notes / Board Photos Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Lecture Logs & Whiteboard Notes</h2>
            
            {classSubject.lectures.length === 0 ? (
              <div className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-8 text-center text-zinc-500 text-sm">
                No lecture logs or whiteboard pictures uploaded by the teacher yet.
              </div>
            ) : (
              <div className="space-y-4">
                {classSubject.lectures.map((lecture) => (
                  <div key={lecture.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-start gap-2 border-b border-[#1e233d] pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 font-mono">
                          {new Date(lecture.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <h3 className="font-semibold text-sm text-zinc-100 mt-1 whitespace-pre-line leading-relaxed">
                          {lecture.topic}
                        </h3>
                      </div>
                    </div>
  
                    {lecture.pictureUrl ? (
                      <div className="border border-[#1e233d] rounded-lg overflow-hidden bg-black/40">
                        <div className="px-4 py-2 border-b border-[#1e233d] bg-[#16192b]/30 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                          Whiteboard Photo / Lecture Notes
                        </div>
                        <div className="p-4 flex justify-center">
                          <img
                            src={lecture.pictureUrl}
                            alt="Whiteboard Note"
                            className="max-h-[500px] w-auto object-contain rounded shadow-lg"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 italic bg-[#16192b]/20 border border-[#1e233d] rounded-lg px-3 py-2">
                        No board photo was uploaded for this class log.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
  
          {/* Right Column: Course Materials */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Course Materials</h2>
            
            {classSubject.materials.length === 0 ? (
              <div className="bg-[#0d0f1a]/50 border border-[#1e233d] rounded-xl p-6 text-center text-zinc-500 text-xs">
                No materials shared yet for this course.
              </div>
            ) : (
              <div className="space-y-3">
                {classSubject.materials.map((mat) => (
                  <div key={mat.id} className="bg-[#0d0f1a] border border-[#1e233d] rounded-xl p-4 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-white">{mat.title}</h4>
                      {mat.description && <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{mat.description}</p>}
                      <span className="text-[8px] font-mono text-zinc-500 block mt-2">
                        Uploaded: {new Date(mat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full py-1.5 bg-[#16192b] border border-[#2b3052] text-center text-[10px] font-semibold text-cyan-400 rounded hover:bg-cyan-950/20 transition-colors"
                    >
                      View Document
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
