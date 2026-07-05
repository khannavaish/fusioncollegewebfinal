# Fusion College LMS - Complete Guide

## Overview
The Fusion College Learning Management System (LMS) is a comprehensive educational platform built with Next.js 16, React 19, Prisma ORM, PostgreSQL, and Supabase Authentication. It supports four user roles: Admin, Teacher, Student, and Parent.

## Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with custom dark theme

## Project Structure

```
lms/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.js          # Login page
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   └── page.js          # Admin dashboard
│   │   ├── teacher/
│   │   │   └── page.js          # Teacher dashboard
│   │   ├── student/
│   │   │   └── page.js          # Student dashboard
│   │   ├── parent/
│   │   │   └── page.js          # Parent dashboard
│   │   └── layout.js            # Dashboard layout with sidebar
│   ├── api/
│   │   ├── enquiry/
│   │   │   └── route.js         # Contact form API
│   │   ├── students/
│   │   │   ├── route.js         # GET/POST students
│   │   │   └── [id]/route.js    # GET/PUT/DELETE student
│   │   ├── teachers/
│   │   │   ├── route.js         # GET/POST teachers
│   │   │   └── [id]/route.js    # GET/PUT/DELETE teacher
│   │   ├── classes/
│   │   │   └── route.js         # GET/POST classes
│   │   ├── subjects/
│   │   │   └── route.js         # GET/POST subjects
│   │   └── class-subjects/
│   │       └── route.js         # GET/POST class-subject assignments
│   ├── layout.js                # Root layout
│   ├── page.js                  # Home page (redirects based on role)
│   └── globals.css             # Global styles
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.js                  # Database seeding script
├── utils/
│   ├── db.js                    # Prisma client singleton
│   └── supabase/
│       ├── client.js            # Supabase browser client
│       ├── server.js            # Supabase server client
│       └── middleware.js        # Supabase session middleware
├── middleware.js                # Next.js middleware
├── next.config.mjs              # Next.js configuration
└── package.json                 # Dependencies

```

## Database Schema

### User Roles
- **ADMIN**: Full system access, manage users, classes, subjects
- **TEACHER**: Manage assigned classes, grade assignments, take attendance
- **STUDENT**: View courses, submit assignments, view grades
- **PARENT**: View child's performance, attendance, grades

### Core Models

#### User
- Links Supabase auth ID to database
- Contains role (ADMIN, TEACHER, STUDENT, PARENT)
- Status (ACTIVE, INACTIVE, PENDING)

#### Admin
- System administrator profile
- Can manage all entities

#### Teacher
- Teacher profile with qualification
- Assigned to multiple class-subject combinations

#### Student
- Student profile with roll number
- Linked to a class
- Has submissions, attendance, exam results

#### Parent
- Parent profile
- Linked to multiple students via ParentStudent join table

#### Class
- Academic class (e.g., "F.Sc Pre-Medical Part I")
- Has academic year
- Contains multiple students and subjects

#### Subject
- Subject (e.g., "Biology", "Chemistry")
- Can be taught in multiple classes

#### ClassSubject
- Intersection of Class, Subject, and Teacher
- Contains materials, exams, lectures

#### Material
- Learning materials uploaded by teachers
- Linked to ClassSubject

#### Assignment
- Assignments created by teachers
- Has deadline and file attachment
- Students submit work via Submission model

#### Submission
- Student assignment submissions
- Contains grade and remarks

#### Lecture
- Scheduled lectures
- Has attendance records

#### Attendance
- Student attendance per lecture
- Status: PRESENT, ABSENT, LEAVE, LATE

#### Exam
- Exams created by teachers
- Has total marks and date
- Results stored in ExamResult

#### ExamResult
- Student exam results
- Contains marks obtained and status

#### ContactEnquiry
- Landing page contact form submissions
- Status: UNREAD, REVIEWED, ARCHIVED

## Authentication Flow

1. User logs in via `/login` page using Supabase Auth
2. Middleware checks authentication status
3. User role is fetched from database using `authId`
4. User is redirected to appropriate dashboard based on role:
   - `/admin` for ADMIN
   - `/teacher` for TEACHER
   - `/student` for STUDENT
   - `/parent` for PARENT

## Role-Based Access Control

### Middleware Protection
- Protected routes: `/admin`, `/teacher`, `/student`, `/parent`
- Users can only access their role-specific dashboard
- Role is fetched from database, not metadata
- Each dashboard page verifies its own role for additional security

### Dashboard Layout
- Shared sidebar with navigation
- User profile display with avatar
- Sign out functionality
- Mobile-responsive header

## API Routes

### Students API
- `GET /api/students` - List all students (with class info)
- `POST /api/students` - Create new student
- `GET /api/students/[id]` - Get single student (with submissions, attendance, exams)
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student

### Teachers API
- `GET /api/teachers` - List all teachers (with assigned subjects)
- `POST /api/teachers` - Create new teacher
- `GET /api/teachers/[id]` - Get single teacher
- `PUT /api/teachers/[id]` - Update teacher
- `DELETE /api/teachers/[id]` - Delete teacher

### Classes API
- `GET /api/classes` - List all classes (with students and subjects)
- `POST /api/classes` - Create new class

### Subjects API
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create new subject

### Class-Subjects API
- `GET /api/class-subjects` - List all class-subject assignments
- `POST /api/class-subjects` - Assign subject to class with teacher

### Enquiry API
- `POST /api/enquiry` - Submit contact form (CORS enabled for landing page)

## Dashboard Functionalities

### Admin Dashboard
- **Overview Cards**:
  - Total enrolled students
  - Registered faculty count
  - Total system users
- **Recent Enquiries**: View contact form submissions
- **Quick Controls**: Buttons for adding students, teachers, classes (UI only, needs implementation)

### Teacher Dashboard
- **Overview Cards**:
  - Assigned classes count
  - Pending submissions to grade
  - Attendance lock status
- **Assigned Classes**: List of classes with subjects and student counts
- **Pending Submissions**: Recent submissions awaiting grading

### Student Dashboard
- **Overview Cards**:
  - Attendance rate (calculated from lectures)
  - Assignments submitted count
  - Merit position
- **Active Courses**: List of enrolled subjects with teachers
- **Recent Assignments**: Recent assignment submissions with status

### Parent Dashboard
- **Overview Cards**:
  - Child's attendance rate
  - Grade average
  - Scholarship maintenance status
- **Exam Results Table**: Recent exam results with marks and percentages

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase project

### Environment Variables
Create `.env.local` in the `lms` directory:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
DIRECT_URL="postgresql://user:password@host:port/database"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Installation

1. Navigate to LMS directory:
```bash
cd lms
```

2. Install dependencies:
```bash
npm install
```

3. Set up database:
```bash
npx prisma generate
npx prisma db push
```

4. Run development server:
```bash
npm run dev
```

5. Open http://localhost:3000

## User Management

### Creating Users
All users are managed through Supabase Authentication. The system automatically creates database profiles when users first log in.

**Simple Workflow:**
1. **Create user in Supabase Dashboard**: Go to Supabase Dashboard > Authentication > Users and create users with their email and password
2. **Set user role**: In Supabase Dashboard, set the user's role in their metadata (`role` field: ADMIN, TEACHER, STUDENT, or PARENT)
3. **User logs in**: The system automatically creates the corresponding database profile on first login

**No seed script required** for regular user creation!

### Setting User Roles in Supabase
When creating a user in Supabase Dashboard, set the user metadata:
- Key: `role`
- Value: `ADMIN`, `TEACHER`, `STUDENT`, or `PARENT`

The system will automatically create the appropriate profile (Admin, Teacher, Student, or Parent) when they first log in.

### Using the Seed Script (Optional)
The seed script is only needed if you want to pre-populate the database with specific users without them logging in first. To use it:

1. Create a user in Supabase Dashboard
2. Copy the user ID from Supabase Dashboard
3. Update `prisma/seed.js` with the user ID, email, and name
4. Run the seed script:
```bash
npm run seed
```

### Automatic Profile Creation
When a user logs in for the first time:
- The system checks if a database profile exists
- If not, it automatically creates:
  - A `User` record with their email and role from Supabase metadata
  - A role-specific profile (Admin, Teacher, Student, or Parent) with default values
- For students, a temporary roll number is generated (can be updated later)

## Common Tasks

### Add New Class
1. Create class via API: `POST /api/classes`
2. Create subjects via API: `POST /api/subjects`
3. Assign teachers: `POST /api/class-subjects`

### Add New Student
1. Create user in Supabase Auth
2. Create student via API: `POST /api/students`
3. Link to parent (if needed): Create `ParentStudent` record

### Assign Teacher to Subject
1. Ensure teacher and class-subject exist
2. Use API: `POST /api/class-subjects` with `classId`, `subjectId`, `teacherId`

## Troubleshooting

### Middleware Issues
If users are redirected incorrectly:
- Check database role matches Supabase auth ID
- Verify `authId` is correctly set in User table
- Check middleware logs for errors

### Database Connection
- Verify `DATABASE_URL` in `.env.local`
- Run `npx prisma db push` to sync schema
- Check PostgreSQL is running

### Authentication Issues
- Verify Supabase credentials in `.env.local`
- Check user exists in Supabase Auth
- Ensure User record exists in database with correct `authId`

## Future Enhancements

### UI Improvements
- Implement modal dialogs for CRUD operations
- Add loading states and error handling
- Create dedicated pages for each entity (students list, teachers list, etc.)
- Add file upload functionality for materials and assignments

### Functionality
- Implement attendance marking interface
- Create assignment grading interface
- Add exam creation and result entry
- Implement parent-child linking interface
- Add notification system
- Create reporting/analytics features

### Security
- Add rate limiting to API routes
- Implement proper role checks in API routes
- Add input validation and sanitization
- Implement CSRF protection

## Development Notes

### Database Schema Changes
When modifying `schema.prisma`:
1. Make changes to schema
2. Run `npx prisma generate`
3. Run `npx prisma db push` (development) or create migration (production)

### Adding New API Routes
1. Create route file in `app/api/[resource]/route.js`
2. Implement GET, POST, PUT, DELETE as needed
3. Add authentication check using Supabase
4. Add role-based authorization if needed
5. Include error handling and validation

### Dashboard Updates
When updating dashboards:
1. Fetch real data from database using Prisma
2. Handle empty states gracefully
3. Add loading states for better UX
4. Maintain consistent styling with existing theme

## Support
For issues or questions, refer to:
- Next.js documentation: https://nextjs.org/docs
- Prisma documentation: https://www.prisma.io/docs
- Supabase documentation: https://supabase.com/docs
