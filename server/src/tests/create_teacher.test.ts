
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { teachersTable, usersTable } from '../db/schema';
import { type CreateTeacherInput } from '../schema';
import { createTeacher } from '../handlers/create_teacher';
import { eq } from 'drizzle-orm';

describe('createTeacher', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a teacher', async () => {
    // First create a user to reference
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@school.edu',
        name: 'John Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const testInput: CreateTeacherInput = {
      user_id: user.id,
      employee_id: 'EMP001'
    };

    const result = await createTeacher(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.employee_id).toEqual('EMP001');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save teacher to database', async () => {
    // First create a user to reference
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@school.edu',
        name: 'John Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const testInput: CreateTeacherInput = {
      user_id: user.id,
      employee_id: 'EMP002' // Use different employee_id
    };

    const result = await createTeacher(testInput);

    // Query using proper drizzle syntax
    const teachers = await db.select()
      .from(teachersTable)
      .where(eq(teachersTable.id, result.id))
      .execute();

    expect(teachers).toHaveLength(1);
    expect(teachers[0].user_id).toEqual(user.id);
    expect(teachers[0].employee_id).toEqual('EMP002');
    expect(teachers[0].created_at).toBeInstanceOf(Date);
    expect(teachers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique employee_id constraint', async () => {
    // Create two users
    const userResult1 = await db.insert(usersTable)
      .values({
        email: 'teacher1@school.edu',
        name: 'John Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const userResult2 = await db.insert(usersTable)
      .values({
        email: 'teacher2@school.edu',
        name: 'Jane Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const user1 = userResult1[0];
    const user2 = userResult2[0];

    // Create first teacher
    await createTeacher({
      user_id: user1.id,
      employee_id: 'EMP003' // Use unique employee_id
    });

    // Try to create second teacher with same employee_id
    const duplicateInput: CreateTeacherInput = {
      user_id: user2.id,
      employee_id: 'EMP003' // Same employee_id to test constraint
    };

    await expect(createTeacher(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should handle database errors gracefully', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@school.edu',
        name: 'John Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create first teacher
    await createTeacher({
      user_id: user.id,
      employee_id: 'EMP004'
    });

    // Try to create another teacher with same employee_id
    const testInput: CreateTeacherInput = {
      user_id: user.id,
      employee_id: 'EMP004' // Duplicate employee_id
    };

    await expect(createTeacher(testInput)).rejects.toThrow();
  });
});
