
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, classesTable } from '../db/schema';
import { getStudents } from '../handlers/get_students';

describe('getStudents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no students exist', async () => {
    const result = await getStudents();
    expect(result).toEqual([]);
  });

  it('should fetch all students with complete information', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [classRecord] = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    const [student] = await db.insert(studentsTable)
      .values({
        user_id: user.id,
        student_id: 'STU001',
        class_id: classRecord.id
      })
      .returning()
      .execute();

    const result = await getStudents();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: student.id,
      user_id: user.id,
      student_id: 'STU001',
      class_id: classRecord.id,
      created_at: expect.any(Date),
      updated_at: expect.any(Date)
    });
  });

  it('should fetch multiple students correctly', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        { email: 'student1@test.com', name: 'Student One', role: 'student' },
        { email: 'student2@test.com', name: 'Student Two', role: 'student' }
      ])
      .returning()
      .execute();

    // Create class
    const [classRecord] = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    // Create students
    await db.insert(studentsTable)
      .values([
        {
          user_id: users[0].id,
          student_id: 'STU001',
          class_id: classRecord.id
        },
        {
          user_id: users[1].id,
          student_id: 'STU002',
          class_id: classRecord.id
        }
      ])
      .execute();

    const result = await getStudents();

    expect(result).toHaveLength(2);
    expect(result[0].student_id).toEqual('STU001');
    expect(result[1].student_id).toEqual('STU002');
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[1].user_id).toEqual(users[1].id);
    expect(result[0].class_id).toEqual(classRecord.id);
    expect(result[1].class_id).toEqual(classRecord.id);
  });

  it('should only return students with valid user and class references', async () => {
    // Create user and class
    const [user] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [classRecord] = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    // Create student with valid references
    await db.insert(studentsTable)
      .values({
        user_id: user.id,
        student_id: 'STU001',
        class_id: classRecord.id
      })
      .execute();

    const result = await getStudents();

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toEqual('STU001');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].class_id).toEqual(classRecord.id);
  });
});
