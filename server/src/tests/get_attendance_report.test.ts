
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, studentsTable, teachersTable, classesTable, subjectsTable, attendanceTable } from '../db/schema';
import { type GetAttendanceReportInput } from '../schema';
import { getAttendanceReport } from '../handlers/get_attendance_report';

// Test data setup
let testUserId: number;
let testTeacherId: number;
let testStudentId: number;
let testClassId: number;
let testSubjectId: number;

const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
        .values({
            email: 'student@test.com',
            name: 'Test Student',
            role: 'student'
        })
        .returning()
        .execute();
    testUserId = userResult[0].id;

    // Create teacher user
    const teacherUserResult = await db.insert(usersTable)
        .values({
            email: 'teacher@test.com',
            name: 'Test Teacher',
            role: 'teacher'
        })
        .returning()
        .execute();

    const teacherResult = await db.insert(teachersTable)
        .values({
            user_id: teacherUserResult[0].id,
            employee_id: 'T001'
        })
        .returning()
        .execute();
    testTeacherId = teacherUserResult[0].id;

    // Create class
    const classResult = await db.insert(classesTable)
        .values({
            name: 'Grade 5A',
            grade: '5',
            section: 'A'
        })
        .returning()
        .execute();
    testClassId = classResult[0].id;

    // Create student
    const studentResult = await db.insert(studentsTable)
        .values({
            user_id: testUserId,
            student_id: 'S001',
            class_id: testClassId
        })
        .returning()
        .execute();
    testStudentId = studentResult[0].id;

    // Create subject
    const subjectResult = await db.insert(subjectsTable)
        .values({
            name: 'Mathematics',
            code: 'MATH101',
            description: 'Basic Mathematics'
        })
        .returning()
        .execute();
    testSubjectId = subjectResult[0].id;
};

const testInput: GetAttendanceReportInput = {
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31'),
    report_type: 'daily'
};

describe('getAttendanceReport', () => {
    beforeEach(async () => {
        await createDB();
        await setupTestData();
    });
    
    afterEach(resetDB);

    it('should return empty report when no attendance records exist', async () => {
        const result = await getAttendanceReport(testInput);

        expect(result.summary.total_days).toEqual(0);
        expect(result.summary.present_days).toEqual(0);
        expect(result.summary.absent_days).toEqual(0);
        expect(result.summary.attendance_percentage).toEqual(0);
        expect(result.details).toHaveLength(0);
    });

    it('should generate comprehensive attendance report', async () => {
        // Create attendance records in chronological order
        await db.insert(attendanceTable)
            .values([
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-01',
                    status: 'present',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-02',
                    status: 'absent',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-03',
                    status: 'late',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-04',
                    status: 'sick',
                    notes: 'Fever',
                    marked_by: testTeacherId
                }
            ])
            .execute();

        const result = await getAttendanceReport(testInput);

        // Verify summary
        expect(result.summary.total_days).toEqual(4);
        expect(result.summary.present_days).toEqual(1);
        expect(result.summary.absent_days).toEqual(1);
        expect(result.summary.late_days).toEqual(1);
        expect(result.summary.sick_days).toEqual(1);
        expect(result.summary.permitted_leave_days).toEqual(0);
        expect(result.summary.attendance_percentage).toEqual(50); // (1 present + 1 late) / 4 total = 50%

        // Verify details - now ordered by date
        expect(result.details).toHaveLength(4);
        expect(result.details[0].status).toEqual('present'); // 2024-01-01
        expect(result.details[1].status).toEqual('absent');  // 2024-01-02
        expect(result.details[2].status).toEqual('late');    // 2024-01-03
        expect(result.details[3].status).toEqual('sick');    // 2024-01-04
        expect(result.details[0].subject).toEqual('Mathematics');
        expect(result.details[0].date).toBeInstanceOf(Date);
        expect(result.details[3].notes).toEqual('Fever');
    });

    it('should filter by student_id correctly', async () => {
        // Create another student
        const anotherUserResult = await db.insert(usersTable)
            .values({
                email: 'student2@test.com',
                name: 'Another Student',
                role: 'student'
            })
            .returning()
            .execute();

        const anotherStudentResult = await db.insert(studentsTable)
            .values({
                user_id: anotherUserResult[0].id,
                student_id: 'S002',
                class_id: testClassId
            })
            .returning()
            .execute();

        // Create attendance for both students
        await db.insert(attendanceTable)
            .values([
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-01',
                    status: 'present',
                    marked_by: testTeacherId
                },
                {
                    student_id: anotherStudentResult[0].id,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-01',
                    status: 'absent',
                    marked_by: testTeacherId
                }
            ])
            .execute();

        const result = await getAttendanceReport({
            ...testInput,
            student_id: testStudentId
        });

        expect(result.summary.total_days).toEqual(1);
        expect(result.summary.present_days).toEqual(1);
        expect(result.summary.absent_days).toEqual(0);
        expect(result.details[0].status).toEqual('present');
    });

    it('should filter by class_id correctly', async () => {
        // Create another class
        const anotherClassResult = await db.insert(classesTable)
            .values({
                name: 'Grade 6A',
                grade: '6',
                section: 'A'
            })
            .returning()
            .execute();

        // Create attendance for both classes
        await db.insert(attendanceTable)
            .values([
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-01',
                    status: 'present',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: anotherClassResult[0].id,
                    date: '2024-01-01',
                    status: 'absent',
                    marked_by: testTeacherId
                }
            ])
            .execute();

        const result = await getAttendanceReport({
            ...testInput,
            class_id: testClassId
        });

        expect(result.summary.total_days).toEqual(1);
        expect(result.summary.present_days).toEqual(1);
        expect(result.summary.absent_days).toEqual(0);
    });

    it('should respect date range filters', async () => {
        // Create attendance records outside and inside date range
        await db.insert(attendanceTable)
            .values([
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2023-12-31', // Outside range
                    status: 'present',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-15', // Inside range
                    status: 'absent',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-02-01', // Outside range
                    status: 'present',
                    marked_by: testTeacherId
                }
            ])
            .execute();

        const result = await getAttendanceReport(testInput);

        expect(result.summary.total_days).toEqual(1);
        expect(result.summary.absent_days).toEqual(1);
        expect(result.details[0].date.toISOString().startsWith('2024-01-15')).toBe(true);
    });

    it('should calculate attendance percentage correctly with edge cases', async () => {
        // Test with only permitted leave (should count as absent for percentage)
        await db.insert(attendanceTable)
            .values([
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-01',
                    status: 'permitted_leave',
                    marked_by: testTeacherId
                },
                {
                    student_id: testStudentId,
                    subject_id: testSubjectId,
                    class_id: testClassId,
                    date: '2024-01-02',
                    status: 'present',
                    marked_by: testTeacherId
                }
            ])
            .execute();

        const result = await getAttendanceReport(testInput);

        expect(result.summary.total_days).toEqual(2);
        expect(result.summary.permitted_leave_days).toEqual(1);
        expect(result.summary.present_days).toEqual(1);
        expect(result.summary.attendance_percentage).toEqual(50); // Only present counts as attendance
    });
});
