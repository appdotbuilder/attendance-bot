
import { db } from '../db';
import { teacherSubjectsTable, teachersTable, subjectsTable, classesTable } from '../db/schema';
import { type CreateTeacherSubjectInput, type TeacherSubject } from '../schema';
import { eq } from 'drizzle-orm';

export const assignTeacherSubject = async (input: CreateTeacherSubjectInput): Promise<TeacherSubject> => {
  try {
    // Verify teacher exists
    const teacher = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, input.teacher_id))
      .execute();
    
    if (teacher.length === 0) {
      throw new Error(`Teacher with id ${input.teacher_id} not found`);
    }

    // Verify subject exists
    const subject = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, input.subject_id))
      .execute();
    
    if (subject.length === 0) {
      throw new Error(`Subject with id ${input.subject_id} not found`);
    }

    // Verify class exists
    const classRecord = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, input.class_id))
      .execute();
    
    if (classRecord.length === 0) {
      throw new Error(`Class with id ${input.class_id} not found`);
    }

    // Insert teacher subject assignment
    const result = await db.insert(teacherSubjectsTable)
      .values({
        teacher_id: input.teacher_id,
        subject_id: input.subject_id,
        class_id: input.class_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Teacher subject assignment failed:', error);
    throw error;
  }
};
