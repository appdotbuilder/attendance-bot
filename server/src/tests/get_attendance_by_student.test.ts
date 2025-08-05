
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, classesTable, subjectsTable, attendanceTable } from '../db/schema';
import { type GetAttendanceByStudentInput } from '../schema';
import { getAttendanceByStudent } from '../handlers/get_attendance_by_student';

describe('getAttendanceByStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testStudentId: number;
  let testClassId: number;
  let testSubject1Id: number;
  let testSubject2Id: number;
  let testTeacherId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test teacher user
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    testTeacherId = teacher[0].id;

    // Create test class
    const testClass = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    testClassId = testClass[0].id;

    // Create test student
    const student = await db.insert(studentsTable)
      .values({
        user_id: testUserId,
        student_id: 'STU001',
        class_id: testClassId
      })
      .returning()
      .execute();
    testStudentId = student[0].id;

    // Create test subjects
    const subject1 = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();
    testSubject1Id = subject1[0].id;

    const subject2 = await db.insert(subjectsTable)
      .values({
        name: 'Science',
        code: 'SCI101',
        description: 'Basic Science'
      })
      .returning()
      .execute();
    testSubject2Id = subject2[0].id;
  });

  it('should return all attendance records for a student', async () => {
    // Create test attendance records - using string dates
    await db.insert(attendanceTable)
      .values([
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-15',
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        },
        {
          student_id: testStudentId,
          subject_id: testSubject2Id,
          class_id: testClassId,
          date: '2024-01-14',
          status: 'absent',
          notes: 'Sick',
          marked_by: testTeacherId
        }
      ])
      .execute();

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(2);
    expect(result[0].student_id).toEqual(testStudentId);
    expect(result[0].status).toEqual('absent');
    expect(result[0].date).toBeInstanceOf(Date);
    expect(result[1].student_id).toEqual(testStudentId);
    expect(result[1].status).toEqual('present');
  });

  it('should filter by date range', async () => {
    // Create attendance records across different dates
    const dates = ['2024-01-10', '2024-01-15', '2024-01-20'];

    for (const date of dates) {
      await db.insert(attendanceTable)
        .values({
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: date,
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        })
        .execute();
    }

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId,
      start_date: new Date('2024-01-12'),
      end_date: new Date('2024-01-18')
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual(new Date('2024-01-15'));
  });

  it('should filter by subject', async () => {
    // Create attendance records for different subjects
    await db.insert(attendanceTable)
      .values([
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-15',
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        },
        {
          student_id: testStudentId,
          subject_id: testSubject2Id,
          class_id: testClassId,
          date: '2024-01-15',
          status: 'absent',
          notes: null,
          marked_by: testTeacherId
        }
      ])
      .execute();

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId,
      subject_id: testSubject1Id
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].subject_id).toEqual(testSubject1Id);
    expect(result[0].status).toEqual('present');
  });

  it('should combine date range and subject filters', async () => {
    // Create attendance records with different dates and subjects
    await db.insert(attendanceTable)
      .values([
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-10',
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        },
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-15',
          status: 'absent',
          notes: null,
          marked_by: testTeacherId
        },
        {
          student_id: testStudentId,
          subject_id: testSubject2Id,
          class_id: testClassId,
          date: '2024-01-15',
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        }
      ])
      .execute();

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId,
      start_date: new Date('2024-01-12'),
      end_date: new Date('2024-01-18'),
      subject_id: testSubject1Id
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].subject_id).toEqual(testSubject1Id);
    expect(result[0].date).toEqual(new Date('2024-01-15'));
    expect(result[0].status).toEqual('absent');
  });

  it('should return empty array when no records match', async () => {
    const input: GetAttendanceByStudentInput = {
      student_id: 999 // Non-existent student
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(0);
  });

  it('should return records ordered by date', async () => {
    // Create attendance records in random order
    const dates = ['2024-01-20', '2024-01-10', '2024-01-15'];

    for (const date of dates) {
      await db.insert(attendanceTable)
        .values({
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: date,
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        })
        .execute();
    }

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(3);
    // Should be ordered by date ascending
    expect(result[0].date).toEqual(new Date('2024-01-10'));
    expect(result[1].date).toEqual(new Date('2024-01-15'));
    expect(result[2].date).toEqual(new Date('2024-01-20'));
  });

  it('should filter by start date only', async () => {
    // Create attendance records
    await db.insert(attendanceTable)
      .values([
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-10',
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        },
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-20',
          status: 'absent',
          notes: null,
          marked_by: testTeacherId
        }
      ])
      .execute();

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId,
      start_date: new Date('2024-01-15')
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual(new Date('2024-01-20'));
  });

  it('should filter by end date only', async () => {
    // Create attendance records
    await db.insert(attendanceTable)
      .values([
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-10',
          status: 'present',
          notes: null,
          marked_by: testTeacherId
        },
        {
          student_id: testStudentId,
          subject_id: testSubject1Id,
          class_id: testClassId,
          date: '2024-01-20',
          status: 'absent',
          notes: null,
          marked_by: testTeacherId
        }
      ])
      .execute();

    const input: GetAttendanceByStudentInput = {
      student_id: testStudentId,
      end_date: new Date('2024-01-15')
    };

    const result = await getAttendanceByStudent(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual(new Date('2024-01-10'));
  });
});
