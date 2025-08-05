
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { attendanceTable, usersTable, studentsTable, classesTable, subjectsTable } from '../db/schema';
import { type MarkAttendanceInput } from '../schema';
import { markAttendance } from '../handlers/mark_attendance';
import { eq, and } from 'drizzle-orm';

describe('markAttendance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark attendance for a student', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: userId,
        student_id: 'STU001',
        class_id: classId
      })
      .returning()
      .execute();
    const studentId = studentResult[0].id;

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();
    const subjectId = subjectResult[0].id;

    const testInput: MarkAttendanceInput = {
      student_id: studentId,
      subject_id: subjectId,
      class_id: classId,
      date: new Date('2024-01-15'),
      status: 'present',
      notes: 'On time',
      marked_by: teacherId
    };

    const result = await markAttendance(testInput);

    // Basic field validation
    expect(result.student_id).toEqual(studentId);
    expect(result.subject_id).toEqual(subjectId);
    expect(result.class_id).toEqual(classId);
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.status).toEqual('present');
    expect(result.notes).toEqual('On time');
    expect(result.marked_by).toEqual(teacherId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save attendance to database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: userId,
        student_id: 'STU001',
        class_id: classId
      })
      .returning()
      .execute();
    const studentId = studentResult[0].id;

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();
    const subjectId = subjectResult[0].id;

    const testInput: MarkAttendanceInput = {
      student_id: studentId,
      subject_id: subjectId,
      class_id: classId,
      date: new Date('2024-01-15'),
      status: 'absent',
      notes: 'No excuse provided',
      marked_by: teacherId
    };

    const result = await markAttendance(testInput);

    // Query database to verify attendance was saved
    const attendance = await db.select()
      .from(attendanceTable)
      .where(eq(attendanceTable.id, result.id))
      .execute();

    expect(attendance).toHaveLength(1);
    expect(attendance[0].student_id).toEqual(studentId);
    expect(attendance[0].subject_id).toEqual(subjectId);
    expect(attendance[0].class_id).toEqual(classId);
    expect(new Date(attendance[0].date)).toEqual(new Date('2024-01-15'));
    expect(attendance[0].status).toEqual('absent');
    expect(attendance[0].notes).toEqual('No excuse provided');
    expect(attendance[0].marked_by).toEqual(teacherId);
    expect(attendance[0].created_at).toBeInstanceOf(Date);
    expect(attendance[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when student does not exist', async () => {
    const testInput: MarkAttendanceInput = {
      student_id: 999,
      subject_id: 1,
      class_id: 1,
      date: new Date('2024-01-15'),
      status: 'present',
      notes: null,
      marked_by: 1
    };

    await expect(markAttendance(testInput)).rejects.toThrow(/student with id 999 not found/i);
  });

  it('should throw error when subject does not exist', async () => {
    // Create prerequisite user and student
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: userId,
        student_id: 'STU001',
        class_id: classId
      })
      .returning()
      .execute();
    const studentId = studentResult[0].id;

    const testInput: MarkAttendanceInput = {
      student_id: studentId,
      subject_id: 999,
      class_id: classId,
      date: new Date('2024-01-15'),
      status: 'present',
      notes: null,
      marked_by: 1
    };

    await expect(markAttendance(testInput)).rejects.toThrow(/subject with id 999 not found/i);
  });

  it('should throw error when attendance already exists for same student, subject, class, and date', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: userId,
        student_id: 'STU001',
        class_id: classId
      })
      .returning()
      .execute();
    const studentId = studentResult[0].id;

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();
    const subjectId = subjectResult[0].id;

    const testInput: MarkAttendanceInput = {
      student_id: studentId,
      subject_id: subjectId,
      class_id: classId,
      date: new Date('2024-01-15'),
      status: 'present',
      notes: 'First marking',
      marked_by: teacherId
    };

    // Mark attendance first time
    await markAttendance(testInput);

    // Try to mark attendance again for same student, subject, class, and date
    const duplicateInput: MarkAttendanceInput = {
      ...testInput,
      status: 'absent',
      notes: 'Second marking attempt'
    };

    await expect(markAttendance(duplicateInput)).rejects.toThrow(/attendance already marked for student/i);
  });

  it('should handle different attendance statuses correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        name: 'Test Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();
    const teacherId = teacherResult[0].id;

    const classResult = await db.insert(classesTable)
      .values({
        name: 'Test Class',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    const classId = classResult[0].id;

    const studentResult = await db.insert(studentsTable)
      .values({
        user_id: userId,
        student_id: 'STU001',
        class_id: classId
      })
      .returning()
      .execute();
    const studentId = studentResult[0].id;

    const subjectResult = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();
    const subjectId = subjectResult[0].id;

    const testInput: MarkAttendanceInput = {
      student_id: studentId,
      subject_id: subjectId,
      class_id: classId,
      date: new Date('2024-01-15'),
      status: 'sick',
      notes: 'Medical certificate provided',
      marked_by: teacherId
    };

    const result = await markAttendance(testInput);

    expect(result.status).toEqual('sick');
    expect(result.notes).toEqual('Medical certificate provided');
  });
});
