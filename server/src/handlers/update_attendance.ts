
import { db } from '../db';
import { attendanceTable } from '../db/schema';
import { type UpdateAttendanceInput, type Attendance } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAttendance = async (input: UpdateAttendanceInput): Promise<Attendance> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update attendance record
    const result = await db.update(attendanceTable)
      .set(updateData)
      .where(eq(attendanceTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Attendance record with id ${input.id} not found`);
    }

    // Convert date string to Date object for the return type
    const attendance = result[0];
    return {
      ...attendance,
      date: new Date(attendance.date)
    };
  } catch (error) {
    console.error('Attendance update failed:', error);
    throw error;
  }
};
