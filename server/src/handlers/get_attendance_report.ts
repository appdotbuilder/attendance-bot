
import { db } from '../db';
import { attendanceTable, studentsTable, subjectsTable, classesTable, usersTable } from '../db/schema';
import { type GetAttendanceReportInput } from '../schema';
import { eq, and, gte, lte, SQL, asc } from 'drizzle-orm';

export interface AttendanceReport {
    summary: {
        total_days: number;
        present_days: number;
        absent_days: number;
        late_days: number;
        sick_days: number;
        permitted_leave_days: number;
        attendance_percentage: number;
    };
    details: {
        date: Date;
        status: string;
        subject?: string;
        notes?: string;
    }[];
}

export async function getAttendanceReport(input: GetAttendanceReportInput): Promise<AttendanceReport> {
    try {
        // Build base query with joins
        let query = db.select({
            date: attendanceTable.date,
            status: attendanceTable.status,
            notes: attendanceTable.notes,
            subject_name: subjectsTable.name,
        })
        .from(attendanceTable)
        .innerJoin(subjectsTable, eq(attendanceTable.subject_id, subjectsTable.id))
        .innerJoin(studentsTable, eq(attendanceTable.student_id, studentsTable.id))
        .innerJoin(classesTable, eq(attendanceTable.class_id, classesTable.id));

        // Build conditions array
        const conditions: SQL<unknown>[] = [];

        // Date range filter - convert Date objects to ISO date strings
        const startDateStr = input.start_date.toISOString().split('T')[0];
        const endDateStr = input.end_date.toISOString().split('T')[0];
        
        conditions.push(gte(attendanceTable.date, startDateStr));
        conditions.push(lte(attendanceTable.date, endDateStr));

        // Optional filters
        if (input.class_id) {
            conditions.push(eq(attendanceTable.class_id, input.class_id));
        }

        if (input.subject_id) {
            conditions.push(eq(attendanceTable.subject_id, input.subject_id));
        }

        if (input.student_id) {
            conditions.push(eq(attendanceTable.student_id, input.student_id));
        }

        // Apply where conditions and order by date
        const finalQuery = query
            .where(and(...conditions))
            .orderBy(asc(attendanceTable.date));

        const results = await finalQuery.execute();

        // Process results for summary
        const summary = {
            total_days: results.length,
            present_days: results.filter(r => r.status === 'present').length,
            absent_days: results.filter(r => r.status === 'absent').length,
            late_days: results.filter(r => r.status === 'late').length,
            sick_days: results.filter(r => r.status === 'sick').length,
            permitted_leave_days: results.filter(r => r.status === 'permitted_leave').length,
            attendance_percentage: 0
        };

        // Calculate attendance percentage
        const presentAndLate = summary.present_days + summary.late_days;
        summary.attendance_percentage = summary.total_days > 0 
            ? Math.round((presentAndLate / summary.total_days) * 100 * 100) / 100 
            : 0;

        // Process details
        const details = results.map(result => ({
            date: new Date(result.date),
            status: result.status,
            subject: result.subject_name,
            notes: result.notes || undefined
        }));

        return {
            summary,
            details
        };
    } catch (error) {
        console.error('Attendance report generation failed:', error);
        throw error;
    }
}
