
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, classesTable } from '../db/schema';
import { type CreateUserInput, type CreateStudentInput, type CreateClassInput } from '../schema';
import { getStudentsByClass } from '../handlers/get_students_by_class';

describe('getStudentsByClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no students in class', async () => {
    // Create a class first
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    const result = await getStudentsByClass(classResult[0].id);
    expect(result).toEqual([]);
  });

  it('should return students for a specific class', async () => {
    // Create class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    const classId = classResult[0].id;

    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        { email: 'student1@test.com', name: 'Student One', role: 'student' },
        { email: 'student2@test.com', name: 'Student Two', role: 'student' }
      ])
      .returning()
      .execute();

    // Create students
    const studentResults = await db.insert(studentsTable)
      .values([
        { user_id: userResults[0].id, student_id: 'S001', class_id: classId },
        { user_id: userResults[1].id, student_id: 'S002', class_id: classId }
      ])
      .returning()
      .execute();

    const result = await getStudentsByClass(classId);

    expect(result).toHaveLength(2);
    
    // Check first student
    expect(result[0].id).toEqual(studentResults[0].id);
    expect(result[0].user_id).toEqual(userResults[0].id);
    expect(result[0].student_id).toEqual('S001');
    expect(result[0].class_id).toEqual(classId);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second student
    expect(result[1].id).toEqual(studentResults[1].id);
    expect(result[1].user_id).toEqual(userResults[1].id);
    expect(result[1].student_id).toEqual('S002');
    expect(result[1].class_id).toEqual(classId);
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should only return students from the specified class', async () => {
    // Create two classes
    const classResults = await db.insert(classesTable)
      .values([
        { name: 'Class A', grade: '10', section: 'A' },
        { name: 'Class B', grade: '10', section: 'B' }
      ])
      .returning()
      .execute();

    const class1Id = classResults[0].id;
    const class2Id = classResults[1].id;

    // Create users
    const userResults = await db.insert(usersTable)
      .values([
        { email: 'student1@test.com', name: 'Student One', role: 'student' },
        { email: 'student2@test.com', name: 'Student Two', role: 'student' },
        { email: 'student3@test.com', name: 'Student Three', role: 'student' }
      ])
      .returning()
      .execute();

    // Create students in different classes
    await db.insert(studentsTable)
      .values([
        { user_id: userResults[0].id, student_id: 'S001', class_id: class1Id },
        { user_id: userResults[1].id, student_id: 'S002', class_id: class1Id },
        { user_id: userResults[2].id, student_id: 'S003', class_id: class2Id }
      ])
      .execute();

    // Get students from class 1 only
    const result = await getStudentsByClass(class1Id);

    expect(result).toHaveLength(2);
    result.forEach(student => {
      expect(student.class_id).toEqual(class1Id);
    });

    // Verify that we don't get students from class 2
    const class1StudentIds = result.map(s => s.student_id);
    expect(class1StudentIds).toContain('S001');
    expect(class1StudentIds).toContain('S002');
    expect(class1StudentIds).not.toContain('S003');
  });

  it('should return empty array for non-existent class', async () => {
    const result = await getStudentsByClass(999);
    expect(result).toEqual([]);
  });
});
