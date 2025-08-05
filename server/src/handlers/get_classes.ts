
import { db } from '../db';
import { classesTable } from '../db/schema';
import { type Class } from '../schema';

export const getClasses = async (): Promise<Class[]> => {
  try {
    const results = await db.select()
      .from(classesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Get classes failed:', error);
    throw error;
  }
};
