
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createStudentInputSchema,
  createTeacherInputSchema,
  createClassInputSchema,
  createSubjectInputSchema,
  createTeacherSubjectInputSchema,
  markAttendanceInputSchema,
  updateAttendanceInputSchema,
  getAttendanceByDateInputSchema,
  getAttendanceByStudentInputSchema,
  getAttendanceReportInputSchema,
  chatbotMessageInputSchema,
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createStudent } from './handlers/create_student';
import { createTeacher } from './handlers/create_teacher';
import { createClass } from './handlers/create_class';
import { createSubject } from './handlers/create_subject';
import { assignTeacherSubject } from './handlers/assign_teacher_subject';
import { markAttendance } from './handlers/mark_attendance';
import { updateAttendance } from './handlers/update_attendance';
import { getStudents } from './handlers/get_students';
import { getStudentsByClass } from './handlers/get_students_by_class';
import { getTeachers } from './handlers/get_teachers';
import { getClasses } from './handlers/get_classes';
import { getSubjects } from './handlers/get_subjects';
import { getAttendanceByDate } from './handlers/get_attendance_by_date';
import { getAttendanceByStudent } from './handlers/get_attendance_by_student';
import { getAttendanceReport } from './handlers/get_attendance_report';
import { processChatbotMessage } from './handlers/process_chatbot_message';
import { getTeacherSubjects } from './handlers/get_teacher_subjects';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Student management
  createStudent: publicProcedure
    .input(createStudentInputSchema)
    .mutation(({ input }) => createStudent(input)),
  
  getStudents: publicProcedure
    .query(() => getStudents()),
    
  getStudentsByClass: publicProcedure
    .input(z.object({ classId: z.number() }))
    .query(({ input }) => getStudentsByClass(input.classId)),

  // Teacher management
  createTeacher: publicProcedure
    .input(createTeacherInputSchema)
    .mutation(({ input }) => createTeacher(input)),
    
  getTeachers: publicProcedure
    .query(() => getTeachers()),
    
  getTeacherSubjects: publicProcedure
    .input(z.object({ teacherId: z.number() }))
    .query(({ input }) => getTeacherSubjects(input.teacherId)),

  // Class management
  createClass: publicProcedure
    .input(createClassInputSchema)
    .mutation(({ input }) => createClass(input)),
    
  getClasses: publicProcedure
    .query(() => getClasses()),

  // Subject management
  createSubject: publicProcedure
    .input(createSubjectInputSchema)
    .mutation(({ input }) => createSubject(input)),
    
  getSubjects: publicProcedure
    .query(() => getSubjects()),
    
  assignTeacherSubject: publicProcedure
    .input(createTeacherSubjectInputSchema)
    .mutation(({ input }) => assignTeacherSubject(input)),

  // Attendance management
  markAttendance: publicProcedure
    .input(markAttendanceInputSchema)
    .mutation(({ input }) => markAttendance(input)),
    
  updateAttendance: publicProcedure
    .input(updateAttendanceInputSchema)
    .mutation(({ input }) => updateAttendance(input)),
    
  getAttendanceByDate: publicProcedure
    .input(getAttendanceByDateInputSchema)
    .query(({ input }) => getAttendanceByDate(input)),
    
  getAttendanceByStudent: publicProcedure
    .input(getAttendanceByStudentInputSchema)
    .query(({ input }) => getAttendanceByStudent(input)),
    
  getAttendanceReport: publicProcedure
    .input(getAttendanceReportInputSchema)
    .query(({ input }) => getAttendanceReport(input)),

  // Chatbot functionality
  processChatbotMessage: publicProcedure
    .input(chatbotMessageInputSchema)
    .mutation(({ input }) => processChatbotMessage(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
