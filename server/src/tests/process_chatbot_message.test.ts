
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, classesTable, subjectsTable, attendanceTable } from '../db/schema';
import { type ChatbotMessageInput } from '../schema';
import { processChatbotMessage } from '../handlers/process_chatbot_message';
import { eq, and } from 'drizzle-orm';

describe('processChatbotMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let classId: number;
  let subjectId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        name: 'Test Student',
        role: 'student'
      })
      .returning()
      .execute();
    
    // Create test class
    const classes = await db.insert(classesTable)
      .values({
        name: 'Grade 10A',
        grade: '10',
        section: 'A'
      })
      .returning()
      .execute();
    
    classId = classes[0].id;
    
    // Create test student
    const students = await db.insert(studentsTable)
      .values({
        user_id: users[0].id,
        student_id: 'STU001',
        class_id: classId
      })
      .returning()
      .execute();
    
    studentId = students[0].id;
    
    // Create test subject
    const subjects = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Basic Mathematics'
      })
      .returning()
      .execute();
    
    subjectId = subjects[0].id;
  });

  it('should mark present attendance for "present" message', async () => {
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'I am present today'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(true);
    expect(result.action_required).toBe(false);
    expect(result.message).toContain('present');
    expect(result.message).toContain('Great to have you in class today!');
    expect(result.session_id).toBeDefined();

    // Verify attendance was saved to database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, studentId),
        eq(attendanceTable.date, today.toISOString().split('T')[0])
      ))
      .execute();

    expect(attendance).toHaveLength(1);
    expect(attendance[0].status).toBe('present');
    expect(attendance[0].notes).toContain('Marked via chatbot');
  });

  it('should mark sick attendance for "sick" message', async () => {
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'I am sick and cannot attend'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(true);
    expect(result.action_required).toBe(false);
    expect(result.message).toContain('sick');
    expect(result.message).toContain('feel better soon');
    expect(result.session_id).toBeDefined();

    // Verify attendance was saved to database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, studentId),
        eq(attendanceTable.date, today.toISOString().split('T')[0])
      ))
      .execute();

    expect(attendance).toHaveLength(1);
    expect(attendance[0].status).toBe('sick');
  });

  it('should mark late attendance for "late" message', async () => {
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'I will be late today'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(true);
    expect(result.message).toContain('late');
    expect(result.message).toContain('arrive on time');

    // Verify attendance status in database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, studentId),
        eq(attendanceTable.date, today.toISOString().split('T')[0])
      ))
      .execute();

    expect(attendance[0].status).toBe('late');
  });

  it('should update existing attendance record', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create existing attendance record
    await db.insert(attendanceTable)
      .values({
        student_id: studentId,
        subject_id: subjectId,
        class_id: classId,
        date: today.toISOString().split('T')[0],
        status: 'present',
        notes: 'Initial marking',
        marked_by: studentId
      })
      .execute();

    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'Actually I am sick today'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(true);
    expect(result.message).toContain('updated');
    expect(result.message).toContain('sick');

    // Verify attendance was updated
    const attendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, studentId),
        eq(attendanceTable.date, today.toISOString().split('T')[0])
      ))
      .execute();

    expect(attendance).toHaveLength(1);
    expect(attendance[0].status).toBe('sick');
    expect(attendance[0].notes).toContain('Updated via chatbot');
  });

  it('should handle unrecognized message', async () => {
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'hello how are you'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(false);
    expect(result.action_required).toBe(true);
    expect(result.message).toContain("didn't understand");
    expect(result.message).toContain('Present, Sick, Late, Absent, or have Permitted Leave');
  });

  it('should handle non-existent student', async () => {
    const input: ChatbotMessageInput = {
      student_id: 99999,
      message: 'I am present'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(false);
    expect(result.action_required).toBe(false);
    expect(result.message).toContain("couldn't find your student record");
  });

  it('should generate session ID when not provided', async () => {
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'I am present'
    };

    const result = await processChatbotMessage(input);

    expect(result.session_id).toBeDefined();
    expect(result.session_id).toMatch(/^session_\d+_\d+$/);
  });

  it('should use provided session ID', async () => {
    const sessionId = 'custom_session_123';
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'I am present',
      session_id: sessionId
    };

    const result = await processChatbotMessage(input);

    expect(result.session_id).toBe(sessionId);
  });

  it('should handle permitted leave message', async () => {
    const input: ChatbotMessageInput = {
      student_id: studentId,
      message: 'I have permission to leave early today'
    };

    const result = await processChatbotMessage(input);

    expect(result.attendance_marked).toBe(true);
    expect(result.message).toContain('permitted_leave');

    // Verify attendance status in database
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, studentId),
        eq(attendanceTable.date, today.toISOString().split('T')[0])
      ))
      .execute();

    expect(attendance[0].status).toBe('permitted_leave');
  });
});
