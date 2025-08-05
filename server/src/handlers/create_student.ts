
import { db } from '../db';
import { studentsTable } from '../db/schema';
import { type CreateStudentInput, type Student } from '../schema';

export const createStudent = async (input: CreateStudentInput): Promise<Student> => {
  try {
    // Insert student record
    const result = await db.insert(studentsTable)
      .values({
        user_id: input.user_id,
        student_id: input.student_id,
        class_id: input.class_id
      })
      .returning()
      .execute();

    const student = result[0];
    return student;
  } catch (error) {
    console.error('Student creation failed:', error);
    throw error;
  }
};
