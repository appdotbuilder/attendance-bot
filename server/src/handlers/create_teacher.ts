
import { db } from '../db';
import { teachersTable } from '../db/schema';
import { type CreateTeacherInput, type Teacher } from '../schema';

export const createTeacher = async (input: CreateTeacherInput): Promise<Teacher> => {
  try {
    // Insert teacher record
    const result = await db.insert(teachersTable)
      .values({
        user_id: input.user_id,
        employee_id: input.employee_id
      })
      .returning()
      .execute();

    const teacher = result[0];
    return teacher;
  } catch (error) {
    console.error('Teacher creation failed:', error);
    throw error;
  }
};
