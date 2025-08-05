
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teachersTable, subjectsTable, classesTable, teacherSubjectsTable } from '../db/schema';
import { type CreateTeacherSubjectInput } from '../schema';
import { assignTeacherSubject } from '../handlers/assign_teacher_subject';
import { eq } from 'drizzle-orm';

describe('assignTeacherSubject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should assign teacher to subject for a class', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create teacher
    const teacher = await db.insert(teachersTable)
      .values({
        user_id: user[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    // Create subject
    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    // Create class
    const classRecord = await db.insert(classesTable)
      .values({
        name: 'Grade 1A',
        grade: '1',
        section: 'A'
      })
      .returning()
      .execute();

    const testInput: CreateTeacherSubjectInput = {
      teacher_id: teacher[0].id,
      subject_id: subject[0].id,
      class_id: classRecord[0].id
    };

    const result = await assignTeacherSubject(testInput);

    // Basic field validation
    expect(result.teacher_id).toEqual(teacher[0].id);
    expect(result.subject_id).toEqual(subject[0].id);
    expect(result.class_id).toEqual(classRecord[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save assignment to database', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create teacher
    const teacher = await db.insert(teachersTable)
      .values({
        user_id: user[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    // Create subject
    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    // Create class
    const classRecord = await db.insert(classesTable)
      .values({
        name: 'Grade 1A',
        grade: '1',
        section: 'A'
      })
      .returning()
      .execute();

    const testInput: CreateTeacherSubjectInput = {
      teacher_id: teacher[0].id,
      subject_id: subject[0].id,
      class_id: classRecord[0].id
    };

    const result = await assignTeacherSubject(testInput);

    // Query database to verify assignment was saved
    const assignments = await db.select()
      .from(teacherSubjectsTable)
      .where(eq(teacherSubjectsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].teacher_id).toEqual(teacher[0].id);
    expect(assignments[0].subject_id).toEqual(subject[0].id);
    expect(assignments[0].class_id).toEqual(classRecord[0].id);
    expect(assignments[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when teacher does not exist', async () => {
    // Create subject and class without teacher
    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    const classRecord = await db.insert(classesTable)
      .values({
        name: 'Grade 1A',
        grade: '1',
        section: 'A'
      })
      .returning()
      .execute();

    const testInput: CreateTeacherSubjectInput = {
      teacher_id: 999, // Non-existent teacher
      subject_id: subject[0].id,
      class_id: classRecord[0].id
    };

    expect(assignTeacherSubject(testInput)).rejects.toThrow(/teacher with id 999 not found/i);
  });

  it('should throw error when subject does not exist', async () => {
    // Create user and teacher without subject
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = await db.insert(teachersTable)
      .values({
        user_id: user[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    const classRecord = await db.insert(classesTable)
      .values({
        name: 'Grade 1A',
        grade: '1',
        section: 'A'
      })
      .returning()
      .execute();

    const testInput: CreateTeacherSubjectInput = {
      teacher_id: teacher[0].id,
      subject_id: 999, // Non-existent subject
      class_id: classRecord[0].id
    };

    expect(assignTeacherSubject(testInput)).rejects.toThrow(/subject with id 999 not found/i);
  });

  it('should throw error when class does not exist', async () => {
    // Create user, teacher and subject without class
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = await db.insert(teachersTable)
      .values({
        user_id: user[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    const testInput: CreateTeacherSubjectInput = {
      teacher_id: teacher[0].id,
      subject_id: subject[0].id,
      class_id: 999 // Non-existent class
    };

    expect(assignTeacherSubject(testInput)).rejects.toThrow(/class with id 999 not found/i);
  });
});
