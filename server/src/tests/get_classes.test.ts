
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { classesTable } from '../db/schema';
import { type CreateClassInput } from '../schema';
import { getClasses } from '../handlers/get_classes';

describe('getClasses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no classes exist', async () => {
    const result = await getClasses();
    
    expect(result).toEqual([]);
  });

  it('should return all classes', async () => {
    // Create test classes
    const testClasses: CreateClassInput[] = [
      {
        name: 'Mathematics',
        grade: '10',
        section: 'A'
      },
      {
        name: 'Science',
        grade: '9',
        section: 'B'
      },
      {
        name: 'English',
        grade: '8',
        section: null
      }
    ];

    // Insert test classes
    for (const classInput of testClasses) {
      await db.insert(classesTable)
        .values(classInput)
        .execute();
    }

    const result = await getClasses();

    // Verify all classes are returned
    expect(result).toHaveLength(3);
    
    // Check each class has required fields
    result.forEach(classItem => {
      expect(classItem.id).toBeDefined();
      expect(classItem.name).toBeDefined();
      expect(classItem.grade).toBeDefined();
      expect(classItem.created_at).toBeInstanceOf(Date);
      expect(classItem.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific class data
    const mathClass = result.find(c => c.name === 'Mathematics');
    expect(mathClass).toBeDefined();
    expect(mathClass!.grade).toEqual('10');
    expect(mathClass!.section).toEqual('A');

    const englishClass = result.find(c => c.name === 'English');
    expect(englishClass).toBeDefined();
    expect(englishClass!.section).toBeNull();
  });

  it('should return classes ordered by id', async () => {
    // Create test classes in specific order
    const class1 = await db.insert(classesTable)
      .values({
        name: 'First Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    const class2 = await db.insert(classesTable)
      .values({
        name: 'Second Class',
        grade: '11',
        section: 'B'
      })
      .returning()
      .execute();

    const result = await getClasses();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[0].name).toEqual('First Class');
    expect(result[1].name).toEqual('Second Class');
  });
});
