
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, teachersTable } from '../db/schema';
import { getTeachers } from '../handlers/get_teachers';

describe('getTeachers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no teachers exist', async () => {
    const result = await getTeachers();
    expect(result).toEqual([]);
  });

  it('should return all teachers with their information', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'teacher1@school.com',
          name: 'John Smith',
          role: 'teacher'
        },
        {
          email: 'teacher2@school.com', 
          name: 'Jane Doe',
          role: 'teacher'
        }
      ])
      .returning()
      .execute();

    // Create teachers
    const teachers = await db.insert(teachersTable)
      .values([
        {
          user_id: users[0].id,
          employee_id: 'EMP001'
        },
        {
          user_id: users[1].id,
          employee_id: 'EMP002'
        }
      ])
      .returning()
      .execute();

    const result = await getTeachers();

    expect(result).toHaveLength(2);
    
    // Verify first teacher
    const teacher1 = result.find(t => t.employee_id === 'EMP001');
    expect(teacher1).toBeDefined();
    expect(teacher1!.id).toEqual(teachers[0].id);
    expect(teacher1!.user_id).toEqual(users[0].id);
    expect(teacher1!.employee_id).toEqual('EMP001');
    expect(teacher1!.created_at).toBeInstanceOf(Date);
    expect(teacher1!.updated_at).toBeInstanceOf(Date);

    // Verify second teacher
    const teacher2 = result.find(t => t.employee_id === 'EMP002');
    expect(teacher2).toBeDefined();
    expect(teacher2!.id).toEqual(teachers[1].id);
    expect(teacher2!.user_id).toEqual(users[1].id);
    expect(teacher2!.employee_id).toEqual('EMP002');
    expect(teacher2!.created_at).toBeInstanceOf(Date);
    expect(teacher2!.updated_at).toBeInstanceOf(Date);
  });

  it('should only return teachers, not other user roles', async () => {
    // Create users with different roles
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'teacher@school.com',
          name: 'Teacher User',
          role: 'teacher'
        },
        {
          email: 'student@school.com',
          name: 'Student User', 
          role: 'student'
        },
        {
          email: 'admin@school.com',
          name: 'Admin User',
          role: 'admin'
        }
      ])
      .returning()
      .execute();

    // Only create teacher record for the teacher user
    await db.insert(teachersTable)
      .values({
        user_id: users[0].id,
        employee_id: 'TEACH001'
      })
      .execute();

    const result = await getTeachers();

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(users[0].id);
    expect(result[0].employee_id).toEqual('TEACH001');
  });

  it('should handle teachers created at different times', async () => {
    // Create first teacher
    const user1 = await db.insert(usersTable)
      .values({
        email: 'early.teacher@school.com',
        name: 'Early Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1 = await db.insert(teachersTable)
      .values({
        user_id: user1[0].id,
        employee_id: 'EARLY001'
      })
      .returning()
      .execute();

    // Create second teacher later
    const user2 = await db.insert(usersTable)
      .values({
        email: 'late.teacher@school.com',
        name: 'Late Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2 = await db.insert(teachersTable)
      .values({
        user_id: user2[0].id,
        employee_id: 'LATE001'
      })
      .returning()
      .execute();

    const result = await getTeachers();

    expect(result).toHaveLength(2);
    
    // Verify both teachers are returned regardless of creation time
    const teacherIds = result.map(t => t.employee_id);
    expect(teacherIds).toContain('EARLY001');
    expect(teacherIds).toContain('LATE001');

    // Verify timestamps are preserved
    result.forEach(teacher => {
      expect(teacher.created_at).toBeInstanceOf(Date);
      expect(teacher.updated_at).toBeInstanceOf(Date);
    });
  });
});
