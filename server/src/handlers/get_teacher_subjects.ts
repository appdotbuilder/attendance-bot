
import { db } from '../db';
import { teacherSubjectsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type TeacherSubject } from '../schema';

export async function getTeacherSubjects(teacherId: number): Promise<TeacherSubject[]> {
  try {
    const results = await db.select()
      .from(teacherSubjectsTable)
      .where(eq(teacherSubjectsTable.teacher_id, teacherId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get teacher subjects:', error);
    throw error;
  }
}
