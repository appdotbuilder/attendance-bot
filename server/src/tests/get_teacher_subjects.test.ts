
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teachersTable, subjectsTable, classesTable, teacherSubjectsTable } from '../db/schema';
import { getTeacherSubjects } from '../handlers/get_teacher_subjects';

describe('getTeacherSubjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for teacher with no subjects', async () => {
    // Create user and teacher first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherResult = await db.insert(teachersTable)
      .values({
        user_id: userResult[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    const result = await getTeacherSubjects(teacherResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return teacher subjects for teacher with assignments', async () => {
    // Create user and teacher
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherResult = await db.insert(teachersTable)
      .values({
        user_id: userResult[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    // Create subject
    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    // Create class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    // Create teacher subject assignment
    const assignmentResult = await db.insert(teacherSubjectsTable)
      .values({
        teacher_id: teacherResult[0].id,
        subject_id: subjectResult[0].id,
        class_id: classResult[0].id
      })
      .returning()
      .execute();

    const result = await getTeacherSubjects(teacherResult[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(assignmentResult[0].id);
    expect(result[0].teacher_id).toEqual(teacherResult[0].id);
    expect(result[0].subject_id).toEqual(subjectResult[0].id);
    expect(result[0].class_id).toEqual(classResult[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple assignments for teacher with multiple subjects', async () => {
    // Create user and teacher
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherResult = await db.insert(teachersTable)
      .values({
        user_id: userResult[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    // Create subjects
    const mathSubject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    const scienceSubject = await db.insert(subjectsTable)
      .values({
        name: 'Science',
        code: 'SCI101',
        description: 'Basic Science'
      })
      .returning()
      .execute();

    // Create classes
    const class10A = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    const class10B = await db.insert(classesTable)
      .values({
        name: 'Grade 10B',
        grade: '10',
        section: 'B'
      })
      .returning()
      .execute();

    // Create multiple teacher subject assignments
    await db.insert(teacherSubjectsTable)
      .values([
        {
          teacher_id: teacherResult[0].id,
          subject_id: mathSubject[0].id,
          class_id: class10A[0].id
        },
        {
          teacher_id: teacherResult[0].id,
          subject_id: scienceSubject[0].id,
          class_id: class10B[0].id
        }
      ])
      .execute();

    const result = await getTeacherSubjects(teacherResult[0].id);

    expect(result).toHaveLength(2);
    expect(result.every(assignment => assignment.teacher_id === teacherResult[0].id)).toBe(true);
    
    const subjectIds = result.map(assignment => assignment.subject_id).sort();
    const expectedSubjectIds = [mathSubject[0].id, scienceSubject[0].id].sort();
    expect(subjectIds).toEqual(expectedSubjectIds);
  });

  it('should not return assignments for other teachers', async () => {
    // Create first teacher
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'teacher1@test.com',
        name: 'Teacher One',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1Result = await db.insert(teachersTable)
      .values({
        user_id: user1Result[0].id,
        employee_id: 'T001'
      })
      .returning()
      .execute();

    // Create second teacher
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'teacher2@test.com',
        name: 'Teacher Two',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2Result = await db.insert(teachersTable)
      .values({
        user_id: user2Result[0].id,
        employee_id: 'T002'
      })
      .returning()
      .execute();

    // Create subject and class
    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    const classResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    // Create assignment for teacher 2 only
    await db.insert(teacherSubjectsTable)
      .values({
        teacher_id: teacher2Result[0].id,
        subject_id: subjectResult[0].id,
        class_id: classResult[0].id
      })
      .execute();

    const result = await getTeacherSubjects(teacher1Result[0].id);

    expect(result).toEqual([]);
  });
});
