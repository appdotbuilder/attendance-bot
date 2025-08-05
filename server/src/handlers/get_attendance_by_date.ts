
import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type GetAttendanceByDateInput, type Attendance } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const getAttendanceByDate = async (input: GetAttendanceByDateInput): Promise<Attendance[]> => {
  try {
    // Start with base query
    let query = db.select().from(attendanceTable);

    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(attendanceTable.date, input.date.toISOString().split('T')[0]) // Convert Date to YYYY-MM-DD string
    ];

    // Add optional filters
    if (input.class_id !== undefined) {
      conditions.push(eq(attendanceTable.class_id, input.class_id));
    }

    if (input.subject_id !== undefined) {
      conditions.push(eq(attendanceTable.subject_id, input.subject_id));
    }

    // Apply where clause
    const finalQuery = query.where(and(...conditions));

    const results = await finalQuery.execute();

    // Return results with proper date conversion
    return results.map(record => ({
      ...record,
      date: new Date(record.date), // Convert string back to Date object
      created_at: record.created_at,
      updated_at: record.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch attendance by date:', error);
    throw error;
  }
};
