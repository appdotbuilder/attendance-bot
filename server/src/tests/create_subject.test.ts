
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subjectsTable } from '../db/schema';
import { type CreateSubjectInput } from '../schema';
import { createSubject } from '../handlers/create_subject';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateSubjectInput = {
  name: 'Mathematics',
  code: 'MATH101',
  description: 'Basic mathematics course'
};

const testInputWithNullDescription: CreateSubjectInput = {
  name: 'Physics',
  code: 'PHY101',
  description: null
};

describe('createSubject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a subject with description', async () => {
    const result = await createSubject(testInput);

    // Basic field validation
    expect(result.name).toEqual('Mathematics');
    expect(result.code).toEqual('MATH101');
    expect(result.description).toEqual('Basic mathematics course');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a subject with null description', async () => {
    const result = await createSubject(testInputWithNullDescription);

    expect(result.name).toEqual('Physics');
    expect(result.code).toEqual('PHY101');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save subject to database', async () => {
    const result = await createSubject(testInput);

    // Query using proper drizzle syntax
    const subjects = await db.select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, result.id))
      .execute();

    expect(subjects).toHaveLength(1);
    expect(subjects[0].name).toEqual('Mathematics');
    expect(subjects[0].code).toEqual('MATH101');
    expect(subjects[0].description).toEqual('Basic mathematics course');
    expect(subjects[0].created_at).toBeInstanceOf(Date);
    expect(subjects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique code constraint', async () => {
    // Create first subject
    await createSubject(testInput);

    // Attempt to create second subject with same code
    const duplicateInput: CreateSubjectInput = {
      name: 'Advanced Mathematics',
      code: 'MATH101', // Same code as testInput
      description: 'Advanced mathematics course'
    };

    await expect(createSubject(duplicateInput)).rejects.toThrow(/duplicate key value/i);
  });

  it('should create multiple subjects with different codes', async () => {
    const mathResult = await createSubject(testInput);
    const physicsResult = await createSubject(testInputWithNullDescription);

    // Verify both subjects exist in database
    const subjects = await db.select()
      .from(subjectsTable)
      .execute();

    expect(subjects).toHaveLength(2);
    
    const mathSubject = subjects.find(s => s.id === mathResult.id);
    const physicsSubject = subjects.find(s => s.id === physicsResult.id);

    expect(mathSubject).toBeDefined();
    expect(mathSubject!.name).toEqual('Mathematics');
    expect(mathSubject!.code).toEqual('MATH101');

    expect(physicsSubject).toBeDefined();
    expect(physicsSubject!.name).toEqual('Physics');
    expect(physicsSubject!.code).toEqual('PHY101');
  });
});
