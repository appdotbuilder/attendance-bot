
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, teachersTable, classesTable, subjectsTable, attendanceTable } from '../db/schema';
import { type GetAttendanceByDateInput } from '../schema';
import { getAttendanceByDate } from '../handlers/get_attendance_by_date';

describe('getAttendanceByDate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testData: {
    userId: number;
    teacherId: number;
    studentId: number;
    classId: number;
    subjectId: number;
    testDate: Date;
  };

  beforeEach(async () => {
    // Create test date
    const testDate = new Date('2024-01-15');

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();

    // Create teacher user
    const teacherUserResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    // Create class
    const classResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();

    // Create student
    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: userResult[0].id,
        student_id: 'STU001',
        class_id: classResult[0].id
      })
      .returning()
      .execute();

    // Create teacher
    const teacherResult = await db.insert(teachersTable)
      .values({
        user_id: teacherUserResult[0].id,
        employee_id: 'TCH001'
      })
      .returning()
      .execute();

    // Create subject
    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();

    testData = {
      userId: userResult[0].id,
      teacherId: teacherResult[0].id,
      studentId: studentResult[0].id,
      classId: classResult[0].id,
      subjectId: subjectResult[0].id,
      testDate
    };
  });

  it('should fetch attendance records for a specific date', async () => {
    // Create attendance record - date field expects string
    await db.insert(attendanceTable)
      .values({
        student_id: testData.studentId,
        subject_id: testData.subjectId,
        class_id: testData.classId,
        date: testData.testDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD string
        status: 'present',
        notes: 'Test attendance',
        marked_by: testData.teacherId
      })
      .execute();

    const input: GetAttendanceByDateInput = {
      date: testData.testDate
    };

    const result = await getAttendanceByDate(input);

    expect(result).toHaveLength(1);
    expect(result[0].student_id).toEqual(testData.studentId);
    expect(result[0].subject_id).toEqual(testData.subjectId);
    expect(result[0].class_id).toEqual(testData.classId);
    expect(result[0].date).toEqual(testData.testDate);
    expect(result[0].status).toEqual('present');
    expect(result[0].notes).toEqual('Test attendance');
    expect(result[0].marked_by).toEqual(testData.teacherId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter by class_id when provided', async () => {
    // Create another class
    const anotherClassResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10B',
        grade: '10',
        section: 'B'
      })
      .returning()
      .execute();

    // Create attendance for original class
    await db.insert(attendanceTable)
      .values({
        student_id: testData.studentId,
        subject_id: testData.subjectId,
        class_id: testData.classId,
        date: testData.testDate.toISOString().split('T')[0],
        status: 'present',
        notes: 'Class A attendance',
        marked_by: testData.teacherId
      })
      .execute();

    // Create attendance for another class (should be filtered out)
    await db.insert(attendanceTable)
      .values({
        student_id: testData.studentId,
        subject_id: testData.subjectId,
        class_id: anotherClassResult[0].id,
        date: testData.testDate.toISOString().split('T')[0],
        status: 'absent',
        notes: 'Class B attendance',
        marked_by: testData.teacherId
      })
      .execute();

    const input: GetAttendanceByDateInput = {
      date: testData.testDate,
      class_id: testData.classId
    };

    const result = await getAttendanceByDate(input);

    expect(result).toHaveLength(1);
    expect(result[0].class_id).toEqual(testData.classId);
    expect(result[0].status).toEqual('present');
    expect(result[0].notes).toEqual('Class A attendance');
  });

  it('should filter by subject_id when provided', async () => {
    // Create another subject
    const anotherSubjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Science',
        code: 'SCI101',
        description: 'Basic Science'
      })
      .returning()
      .execute();

    // Create attendance for original subject
    await db.insert(attendanceTable)
      .values({
        student_id: testData.studentId,
        subject_id: testData.subjectId,
        class_id: testData.classId,
        date: testData.testDate.toISOString().split('T')[0],
        status: 'present',
        notes: 'Math attendance',
        marked_by: testData.teacherId
      })
      .execute();

    // Create attendance for another subject (should be filtered out)
    await db.insert(attendanceTable)
      .values({
        student_id: testData.studentId,
        subject_id: anotherSubjectResult[0].id,
        class_id: testData.classId,
        date: testData.testDate.toISOString().split('T')[0],
        status: 'late',
        notes: 'Science attendance',
        marked_by: testData.teacherId
      })
      .execute();

    const input: GetAttendanceByDateInput = {
      date: testData.testDate,
      subject_id: testData.subjectId
    };

    const result = await getAttendanceByDate(input);

    expect(result).toHaveLength(1);
    expect(result[0].subject_id).toEqual(testData.subjectId);
    expect(result[0].status).toEqual('present');
    expect(result[0].notes).toEqual('Math attendance');
  });

  it('should filter by both class_id and subject_id when provided', async () => {
    // Create another class and subject
    const anotherClassResult = await db.insert(classesTable)
      .values({
        name: 'Grade 10B',
        grade: '10',
        section: 'B'
      })
      .returning()
      .execute();

    const anotherSubjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Science',
        code: 'SCI101',
        description: 'Basic Science'
      })
      .returning()
      .execute();

    // Create attendance records
    const dateString = testData.testDate.toISOString().split('T')[0];
    await db.insert(attendanceTable)
      .values([
        {
          student_id: testData.studentId,
          subject_id: testData.subjectId,
          class_id: testData.classId,
          date: dateString,
          status: 'present',
          notes: 'Target record',
          marked_by: testData.teacherId
        },
        {
          student_id: testData.studentId,
          subject_id: anotherSubjectResult[0].id,
          class_id: testData.classId,
          date: dateString,
          status: 'absent',
          notes: 'Different subject',
          marked_by: testData.teacherId
        },
        {
          student_id: testData.studentId,
          subject_id: testData.subjectId,
          class_id: anotherClassResult[0].id,
          date: dateString,
          status: 'late',
          notes: 'Different class',
          marked_by: testData.teacherId
        }
      ])
      .execute();

    const input: GetAttendanceByDateInput = {
      date: testData.testDate,
      class_id: testData.classId,
      subject_id: testData.subjectId
    };

    const result = await getAttendanceByDate(input);

    expect(result).toHaveLength(1);
    expect(result[0].class_id).toEqual(testData.classId);
    expect(result[0].subject_id).toEqual(testData.subjectId);
    expect(result[0].status).toEqual('present');
    expect(result[0].notes).toEqual('Target record');
  });

  it('should return empty array when no attendance records exist for date', async () => {
    const input: GetAttendanceByDateInput = {
      date: new Date('2024-12-25') // Different date with no records
    };

    const result = await getAttendanceByDate(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when filters match no records', async () => {
    // Create attendance record
    await db.insert(attendanceTable)
      .values({
        student_id: testData.studentId,
        subject_id: testData.subjectId,
        class_id: testData.classId,
        date: testData.testDate.toISOString().split('T')[0],
        status: 'present',
        notes: 'Test attendance',
        marked_by: testData.teacherId
      })
      .execute();

    const input: GetAttendanceByDateInput = {
      date: testData.testDate,
      class_id: 999 // Non-existent class
    };

    const result = await getAttendanceByDate(input);

    expect(result).toHaveLength(0);
  });
});
