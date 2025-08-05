
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { getSubjects } from '../handlers/get_subjects';

describe('getSubjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no subjects exist', async () => {
    const result = await getSubjects();
    expect(result).toEqual([]);
  });

  it('should return all subjects when they exist', async () => {
    // Create test subjects
    await db.insert(subjectsTable)
      .values([
        {
          name: 'Mathematics',
          code: 'MATH101',
          description: 'Basic Mathematics'
        },
        {
          name: 'English',
          code: 'ENG101',
          description: null
        },
        {
          name: 'Science',
          code: 'SCI101',
          description: 'General Science'
        }
      ])
      .execute();

    const result = await getSubjects();

    expect(result).toHaveLength(3);
    
    // Check first subject
    const mathSubject = result.find(s => s.code === 'MATH101');
    expect(mathSubject).toBeDefined();
    expect(mathSubject!.name).toEqual('Mathematics');
    expect(mathSubject!.description).toEqual('Basic Mathematics');
    expect(mathSubject!.id).toBeDefined();
    expect(mathSubject!.created_at).toBeInstanceOf(Date);
    expect(mathSubject!.updated_at).toBeInstanceOf(Date);

    // Check subject with null description
    const englishSubject = result.find(s => s.code === 'ENG101');
    expect(englishSubject).toBeDefined();
    expect(englishSubject!.name).toEqual('English');
    expect(englishSubject!.description).toBeNull();
  });

  it('should return subjects in database order', async () => {
    // Create subjects in specific order
    const firstSubject = await db.insert(subjectsTable)
      .values({
        name: 'First Subject',
        code: 'FIRST',
        description: 'First subject created'
      })
      .returning()
      .execute();

    const secondSubject = await db.insert(subjectsTable)
      .values({
        name: 'Second Subject',
        code: 'SECOND',
        description: 'Second subject created'
      })
      .returning()
      .execute();

    const result = await getSubjects();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(firstSubject[0].id);
    expect(result[1].id).toEqual(secondSubject[0].id);
  });
});
