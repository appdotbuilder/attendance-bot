
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { studentsTable, usersTable, classesTable } from '../db/schema';
import { type CreateStudentInput } from '../schema';
import { createStudent } from '../handlers/create_student';
import { eq } from 'drizzle-orm';

describe('createStudent', () => {
  beforeEach(async () => {
    await resetDB();
    await createDB();
  });
  
  afterEach(async () => {
    await resetDB();
  });

  it('should create a student', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const testInput: CreateStudentInput = {
      user_id: userId,
      student_id: 'STU001',
      class_id: classId
    };

    const result = await createStudent(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.student_id).toEqual('STU001');
    expect(result.class_id).toEqual(classId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save student to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student2@example.com',
        name: 'Test Student 2',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10B',
        grade: '10',
        section: 'B'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const testInput: CreateStudentInput = {
      user_id: userId,
      student_id: 'STU002',
      class_id: classId
    };

    const result = await createStudent(testInput);

    // Query using proper drizzle syntax
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, result.id))
      .execute();

    expect(students).toHaveLength(1);
    expect(students[0].user_id).toEqual(userId);
    expect(students[0].student_id).toEqual('STU002');
    expect(students[0].class_id).toEqual(classId);
    expect(students[0].created_at).toBeInstanceOf(Date);
    expect(students[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique student_id constraint', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student3@example.com',
        name: 'Test Student 3',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create prerequisite class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10C',
        grade: '10',
        section: 'C'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const testInput: CreateStudentInput = {
      user_id: userId,
      student_id: 'STU_UNIQUE_TEST',
      class_id: classId
    };

    // Create first student
    await createStudent(testInput);

    // Create another user for second student
    const userResult2 = await db.insert(usersTable)
      .values({
        email: 'student4@example.com',
        name: 'Test Student 4',
        role: 'student'
      })
      .returning()
      .execute();

    const duplicateInput: CreateStudentInput = {
      user_id: userResult2[0].id,
      student_id: 'STU_UNIQUE_TEST', // Same student_id
      class_id: classId
    };

    // Should throw error due to unique constraint
    await expect(createStudent(duplicateInput)).rejects.toThrow(/unique/i);
  });
});
