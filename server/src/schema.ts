
import { z } from 'zod';

// Enums
export const userRoleSchema = z.enum(['student', 'teacher', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const attendanceStatusSchema = z.enum(['present', 'sick', 'permitted_leave', 'absent', 'late']);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  student_id: z.string(),
  class_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Student = z.infer<typeof studentSchema>;

// Teacher schema
export const teacherSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  employee_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Teacher = z.infer<typeof teacherSchema>;

// Class schema
export const classSchema = z.object({
  id: z.number(),
  name: z.string(),
  grade: z.string(),
  section: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Class = z.infer<typeof classSchema>;

// Subject schema
export const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Subject = z.infer<typeof subjectSchema>;

// Teacher Subject Assignment schema
export const teacherSubjectSchema = z.object({
  id: z.number(),
  teacher_id: z.number(),
  subject_id: z.number(),
  class_id: z.number(),
  created_at: z.coerce.date()
});

export type TeacherSubject = z.infer<typeof teacherSubjectSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  subject_id: z.number(),
  class_id: z.number(),
  date: z.coerce.date(),
  status: attendanceStatusSchema,
  notes: z.string().nullable(),
  marked_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Attendance = z.infer<typeof attendanceSchema>;

// Input schemas for creating records
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createStudentInputSchema = z.object({
  user_id: z.number(),
  student_id: z.string().min(1),
  class_id: z.number()
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;

export const createTeacherInputSchema = z.object({
  user_id: z.number(),
  employee_id: z.string().min(1)
});

export type CreateTeacherInput = z.infer<typeof createTeacherInputSchema>;

export const createClassInputSchema = z.object({
  name: z.string().min(1),
  grade: z.string().min(1),
  section: z.string().nullable()
});

export type CreateClassInput = z.infer<typeof createClassInputSchema>;

export const createSubjectInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable()
});

export type CreateSubjectInput = z.infer<typeof createSubjectInputSchema>;

export const createTeacherSubjectInputSchema = z.object({
  teacher_id: z.number(),
  subject_id: z.number(),
  class_id: z.number()
});

export type CreateTeacherSubjectInput = z.infer<typeof createTeacherSubjectInputSchema>;

export const markAttendanceInputSchema = z.object({
  student_id: z.number(),
  subject_id: z.number(),
  class_id: z.number(),
  date: z.coerce.date(),
  status: attendanceStatusSchema,
  notes: z.string().nullable(),
  marked_by: z.number()
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceInputSchema>;

// Update schemas
export const updateAttendanceInputSchema = z.object({
  id: z.number(),
  status: attendanceStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  updated_by: z.number()
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceInputSchema>;

// Query schemas
export const getAttendanceByDateInputSchema = z.object({
  date: z.coerce.date(),
  class_id: z.number().optional(),
  subject_id: z.number().optional()
});

export type GetAttendanceByDateInput = z.infer<typeof getAttendanceByDateInputSchema>;

export const getAttendanceByStudentInputSchema = z.object({
  student_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  subject_id: z.number().optional()
});

export type GetAttendanceByStudentInput = z.infer<typeof getAttendanceByStudentInputSchema>;

export const getAttendanceReportInputSchema = z.object({
  class_id: z.number().optional(),
  subject_id: z.number().optional(),
  student_id: z.number().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  report_type: z.enum(['daily', 'weekly', 'monthly', 'per_subject', 'per_student'])
});

export type GetAttendanceReportInput = z.infer<typeof getAttendanceReportInputSchema>;

// Chatbot interaction schemas
export const chatbotMessageInputSchema = z.object({
  student_id: z.number(),
  message: z.string().min(1),
  session_id: z.string().optional()
});

export type ChatbotMessageInput = z.infer<typeof chatbotMessageInputSchema>;

export const chatbotResponseSchema = z.object({
  message: z.string(),
  action_required: z.boolean(),
  attendance_marked: z.boolean().optional(),
  session_id: z.string()
});

export type ChatbotResponse = z.infer<typeof chatbotResponseSchema>;
