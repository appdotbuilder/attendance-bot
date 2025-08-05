
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs for different user roles
const testStudentInput: CreateUserInput = {
  email: 'student@example.com',
  name: 'Test Student',
  role: 'student'
};

const testTeacherInput: CreateUserInput = {
  email: 'teacher@example.com',
  name: 'Test Teacher',
  role: 'teacher'
};

const testAdminInput: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a student user', async () => {
    const result = await createUser(testStudentInput);

    // Basic field validation
    expect(result.email).toEqual('student@example.com');
    expect(result.name).toEqual('Test Student');
    expect(result.role).toEqual('student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a teacher user', async () => {
    const result = await createUser(testTeacherInput);

    expect(result.email).toEqual('teacher@example.com');
    expect(result.name).toEqual('Test Teacher');
    expect(result.role).toEqual('teacher');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(testAdminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Test Admin');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testStudentInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('student@example.com');
    expect(users[0].name).toEqual('Test Student');
    expect(users[0].role).toEqual('student');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testStudentInput);

    // Attempt to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'student@example.com', // Same email
      name: 'Another Student',
      role: 'teacher'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate/i);
  });

  it('should create multiple users with different emails', async () => {
    const student = await createUser(testStudentInput);
    const teacher = await createUser(testTeacherInput);
    const admin = await createUser(testAdminInput);

    // Verify all users have different IDs
    expect(student.id).not.toEqual(teacher.id);
    expect(teacher.id).not.toEqual(admin.id);
    expect(student.id).not.toEqual(admin.id);

    // Verify all users are saved to database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
    
    const emails = allUsers.map(user => user.email).sort();
    expect(emails).toEqual([
      'admin@example.com',
      'student@example.com', 
      'teacher@example.com'
    ]);
  });
});
