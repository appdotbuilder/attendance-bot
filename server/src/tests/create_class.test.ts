
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { classesTable } from '../db/schema';
import { type CreateClassInput } from '../schema';
import { createClass } from '../handlers/create_class';
import { eq } from 'drizzle-orm';

const testInput: CreateClassInput = {
  name: 'Mathematics Class',
  grade: '10',
  section: 'A'
};

const testInputWithNullSection: CreateClassInput = {
  name: 'Science Class',
  grade: '9',
  section: null
};

describe('createClass', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a class with section', async () => {
    const result = await createClass(testInput);

    expect(result.name).toEqual('Mathematics Class');
    expect(result.grade).toEqual('10');
    expect(result.section).toEqual('A');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a class with null section', async () => {
    const result = await createClass(testInputWithNullSection);

    expect(result.name).toEqual('Science Class');
    expect(result.grade).toEqual('9');
    expect(result.section).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save class to database', async () => {
    const result = await createClass(testInput);

    const classes = await db.select()
      .from(classesTable)
      .where(eq(classesTable.id, result.id))
      .execute();

    expect(classes).toHaveLength(1);
    expect(classes[0].name).toEqual('Mathematics Class');
    expect(classes[0].grade).toEqual('10');
    expect(classes[0].section).toEqual('A');
    expect(classes[0].created_at).toBeInstanceOf(Date);
    expect(classes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple classes with different grades', async () => {
    const class1 = await createClass({ name: 'Math', grade: '10', section: 'A' });
    const class2 = await createClass({ name: 'Physics', grade: '11', section: 'B' });

    expect(class1.id).not.toEqual(class2.id);
    expect(class1.grade).toEqual('10');
    expect(class2.grade).toEqual('11');

    const allClasses = await db.select().from(classesTable).execute();
    expect(allClasses).toHaveLength(2);
  });
});
