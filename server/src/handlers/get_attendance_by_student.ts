
import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type GetAttendanceByStudentInput, type Attendance } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getAttendanceByStudent(input: GetAttendanceByStudentInput): Promise<Attendance[]> {
  try {
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by student_id
    conditions.push(eq(attendanceTable.student_id, input.student_id));

    // Add date range filters if provided - convert Date to string format
    if (input.start_date) {
      conditions.push(gte(attendanceTable.date, input.start_date.toISOString().split('T')[0]));
    }

    if (input.end_date) {
      conditions.push(lte(attendanceTable.date, input.end_date.toISOString().split('T')[0]));
    }

    // Add subject filter if provided
    if (input.subject_id) {
      conditions.push(eq(attendanceTable.subject_id, input.subject_id));
    }

    // Build the final query
    const results = await db.select()
      .from(attendanceTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(attendanceTable.date)
      .execute();

    return results.map(record => ({
      ...record,
      date: new Date(record.date), // Convert string date back to Date object
      created_at: record.created_at,
      updated_at: record.updated_at
    }));
  } catch (error) {
    console.error('Failed to get attendance by student:', error);
    throw error;
  }
}
