
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, classesTable, studentsTable, subjectsTable, attendanceTable } from '../db/schema';
import { type UpdateAttendanceInput } from '../schema';
import { updateAttendance } from '../handlers/update_attendance';
import { eq } from 'drizzle-orm';

describe('updateAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testData: {
    userId: number;
    classId: number;
    studentId: number;
    subjectId: number;
    attendanceId: number;
  };

  beforeEach(async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    const class1 = await db.insert(classesTable)
      .values({
        name: 'Math Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    const student = await db.insert(studentsTable)
      .values({
        user_id: user[0].id,
        student_id: 'STU001',
        class_id: class1[0].id
      })
      .returning()
      .execute();

    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    const attendance = await db.insert(attendanceTable)
      .values({
        student_id: student[0].id,
        subject_id: subject[0].id,
        class_id: class1[0].id,
        date: '2024-01-15',
        status: 'present',
        notes: 'Original notes',
        marked_by: user[0].id
      })
      .returning()
      .execute();

    testData = {
      userId: user[0].id,
      classId: class1[0].id,
      studentId: student[0].id,
      subjectId: subject[0].id,
      attendanceId: attendance[0].id
    };
  });

  it('should update attendance status', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: testData.attendanceId,
      status: 'absent',
      updated_by: testData.userId
    };

    const result = await updateAttendance(updateInput);

    expect(result.id).toEqual(testData.attendanceId);
    expect(result.status).toEqual('absent');
    expect(result.notes).toEqual('Original notes'); // Should remain unchanged
    expect(result.date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update attendance notes', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: testData.attendanceId,
      notes: 'Updated notes',
      updated_by: testData.userId
    };

    const result = await updateAttendance(updateInput);

    expect(result.id).toEqual(testData.attendanceId);
    expect(result.status).toEqual('present'); // Should remain unchanged
    expect(result.notes).toEqual('Updated notes');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both status and notes', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: testData.attendanceId,
      status: 'sick',
      notes: 'Student was sick',
      updated_by: testData.userId
    };

    const result = await updateAttendance(updateInput);

    expect(result.id).toEqual(testData.attendanceId);
    expect(result.status).toEqual('sick');
    expect(result.notes).toEqual('Student was sick');
    expect(result.date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set notes to null', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: testData.attendanceId,
      notes: null,
      updated_by: testData.userId
    };

    const result = await updateAttendance(updateInput);

    expect(result.id).toEqual(testData.attendanceId);
    expect(result.notes).toBeNull();
    expect(result.date).toBeInstanceOf(Date);
  });

  it('should persist changes in database', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: testData.attendanceId,
      status: 'late',
      notes: 'Student arrived late',
      updated_by: testData.userId
    };

    await updateAttendance(updateInput);

    // Verify changes were persisted
    const attendanceRecords = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, testData.attendanceId))
      .execute();

    expect(attendanceRecords).toHaveLength(1);
    expect(attendanceRecords[0].status).toEqual('late');
    expect(attendanceRecords[0].notes).toEqual('Student arrived late');
    expect(attendanceRecords[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent attendance record', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: 99999,
      status: 'absent',
      updated_by: testData.userId
    };

    await expect(updateAttendance(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const updateInput: UpdateAttendanceInput = {
      id: testData.attendanceId,
      updated_by: testData.userId
    };

    const result = await updateAttendance(updateInput);

    expect(result.id).toEqual(testData.attendanceId);
    expect(result.status).toEqual('present'); // Original value
    expect(result.notes).toEqual('Original notes'); // Original value
    expect(result.date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});
