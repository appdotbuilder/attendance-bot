
import { db } from '../db';
import { attendanceTable, studentsTable, subjectsTable, classesTable, usersTable } from '../db/schema';
import { type MarkAttendanceInput, type Attendance } from '../schema';
import { eq, and } from 'drizzle-orm';

export const markAttendance = async (input: MarkAttendanceInput): Promise<Attendance> => {
  try {
    // Verify that the student exists
    const student = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();
    
    if (student.length === 0) {
      throw new Error(`Student with id ${input.student_id} not found`);
    }

    // Verify that the subject exists
    const subject = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, input.subject_id))
      .execute();
    
    if (subject.length === 0) {
      throw new Error(`Subject with id ${input.subject_id} not found`);
    }

    // Verify that the class exists
    const classRecord = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, input.class_id))
      .execute();
    
    if (classRecord.length === 0) {
      throw new Error(`Class with id ${input.class_id} not found`);
    }

    // Verify that the user marking attendance exists
    const markedByUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.marked_by))
      .execute();
    
    if (markedByUser.length === 0) {
      throw new Error(`User with id ${input.marked_by} not found`);
    }

    // Convert date to string format for comparison (YYYY-MM-DD)
    const dateString = input.date.toISOString().split('T')[0];

    // Check if attendance already exists for this student, subject, class, and date
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, input.student_id),
        eq(attendanceTable.subject_id, input.subject_id),
        eq(attendanceTable.class_id, input.class_id),
        eq(attendanceTable.date, dateString)
      ))
      .execute();

    if (existingAttendance.length > 0) {
      throw new Error(`Attendance already marked for student ${input.student_id} on ${dateString}`);
    }

    // Insert attendance record
    const result = await db.insert(attendanceTable)
      .values({
        student_id: input.student_id,
        subject_id: input.subject_id,
        class_id: input.class_id,
        date: dateString,
        status: input.status,
        notes: input.notes,
        marked_by: input.marked_by
      })
      .returning()
      .execute();

    const attendance = result[0];
    return {
      ...attendance,
      date: new Date(attendance.date) // Convert string back to Date object
    };
  } catch (error) {
    console.error('Attendance marking failed:', error);
    throw error;
  }
};
