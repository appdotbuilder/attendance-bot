
import { serial, text, pgTable, timestamp, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'sick', 'permitted_leave', 'absent', 'late']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Classes table
export const classesTable = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  grade: text('grade').notNull(),
  section: text('section'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Students table
export const studentsTable = pgTable('students', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  student_id: text('student_id').notNull().unique(),
  class_id: integer('class_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Teachers table
export const teachersTable = pgTable('teachers', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  employee_id: text('employee_id').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Subjects table
export const subjectsTable = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Teacher Subject Assignment table
export const teacherSubjectsTable = pgTable('teacher_subjects', {
  id: serial('id').primaryKey(),
  teacher_id: integer('teacher_id').notNull(),
  subject_id: integer('subject_id').notNull(),
  class_id: integer('class_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Attendance table
export const attendanceTable = pgTable('attendance', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull(),
  subject_id: integer('subject_id').notNull(),
  class_id: integer('class_id').notNull(),
  date: date('date').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  notes: text('notes'),
  marked_by: integer('marked_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [usersTable.id],
    references: [studentsTable.user_id],
  }),
  teacher: one(teachersTable, {
    fields: [usersTable.id],
    references: [teachersTable.user_id],
  }),
}));

export const studentsRelations = relations(studentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [studentsTable.user_id],
    references: [usersTable.id],
  }),
  class: one(classesTable, {
    fields: [studentsTable.class_id],
    references: [classesTable.id],
  }),
  attendance: many(attendanceTable),
}));

export const teachersRelations = relations(teachersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [teachersTable.user_id],
    references: [usersTable.id],
  }),
  teacherSubjects: many(teacherSubjectsTable),
}));

export const classesRelations = relations(classesTable, ({ many }) => ({
  students: many(studentsTable),
  teacherSubjects: many(teacherSubjectsTable),
  attendance: many(attendanceTable),
}));

export const subjectsRelations = relations(subjectsTable, ({ many }) => ({
  teacherSubjects: many(teacherSubjectsTable),
  attendance: many(attendanceTable),
}));

export const teacherSubjectsRelations = relations(teacherSubjectsTable, ({ one }) => ({
  teacher: one(teachersTable, {
    fields: [teacherSubjectsTable.teacher_id],
    references: [teachersTable.id],
  }),
  subject: one(subjectsTable, {
    fields: [teacherSubjectsTable.subject_id],
    references: [subjectsTable.id],
  }),
  class: one(classesTable, {
    fields: [teacherSubjectsTable.class_id],
    references: [classesTable.id],
  }),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  student: one(studentsTable, {
    fields: [attendanceTable.student_id],
    references: [studentsTable.id],
  }),
  subject: one(subjectsTable, {
    fields: [attendanceTable.subject_id],
    references: [subjectsTable.id],
  }),
  class: one(classesTable, {
    fields: [attendanceTable.class_id],
    references: [classesTable.id],
  }),
  markedBy: one(usersTable, {
    fields: [attendanceTable.marked_by],
    references: [usersTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  students: studentsTable,
  teachers: teachersTable,
  classes: classesTable,
  subjects: subjectsTable,
  teacherSubjects: teacherSubjectsTable,
  attendance: attendanceTable,
};
