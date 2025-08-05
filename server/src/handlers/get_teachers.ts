
import { db } from '../db';
import { teachersTable, usersTable } from '../db/schema';
import { type Teacher } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTeachers(): Promise<Teacher[]> {
  try {
    // Join teachers with users to get complete teacher information
    const results = await db.select()
      .from(teachersTable)
      .innerJoin(usersTable, eq(teachersTable.user_id, usersTable.id))
      .execute();

    // Transform joined results to Teacher format
    return results.map(result => ({
      id: result.teachers.id,
      user_id: result.teachers.user_id,
      employee_id: result.teachers.employee_id,
      created_at: result.teachers.created_at,
      updated_at: result.teachers.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch teachers:', error);
    throw error;
  }
}
