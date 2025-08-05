
import { db } from '../db';
import { studentsTable, usersTable } from '../db/schema';
import { type Student } from '../schema';
import { eq } from 'drizzle-orm';

export const getStudentsByClass = async (classId: number): Promise<Student[]> => {
  try {
    const results = await db.select()
      .from(studentsTable)
      .innerJoin(usersTable, eq(studentsTable.user_id, usersTable.id))
      .where(eq(studentsTable.class_id, classId))
      .execute();

    return results.map(result => ({
      id: result.students.id,
      user_id: result.students.user_id,
      student_id: result.students.student_id,
      class_id: result.students.class_id,
      created_at: result.students.created_at,
      updated_at: result.students.updated_at
    }));
  } catch (error) {
    console.error('Failed to get students by class:', error);
    throw error;
  }
};
