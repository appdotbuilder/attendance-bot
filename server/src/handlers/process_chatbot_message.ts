
import { db } from '../db';
import { studentsTable, attendanceTable, subjectsTable, usersTable } from '../db/schema';
import { type ChatbotMessageInput, type ChatbotResponse, type AttendanceStatus } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function processChatbotMessage(input: ChatbotMessageInput): Promise<ChatbotResponse> {
  try {
    const sessionId = input.session_id || `session_${Date.now()}_${input.student_id}`;
    const message = input.message.toLowerCase().trim();
    
    // Get student details first to validate
    const students = await db.select()
      .from(studentsTable)
      .where(eq(studentsTable.id, input.student_id))
      .execute();
    
    if (students.length === 0) {
      return {
        message: "I couldn't find your student record. Please contact your teacher for assistance.",
        action_required: false,
        attendance_marked: false,
        session_id: sessionId
      };
    }
    
    const student = students[0];
    
    // Parse attendance status from message
    const attendanceStatus = parseAttendanceStatus(message);
    
    if (!attendanceStatus) {
      return {
        message: "I didn't understand your attendance status. Please tell me if you're: Present, Sick, Late, Absent, or have Permitted Leave.",
        action_required: true,
        attendance_marked: false,
        session_id: sessionId
      };
    }
    
    // For this implementation, we'll mark attendance for today's first available subject
    // In a real system, this would be more sophisticated based on current schedule
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Get the first subject for the student's class (simplified approach)
    const subjects = await db.select()
      .from(subjectsTable)
      .limit(1)
      .execute();
    
    if (subjects.length === 0) {
      return {
        message: "No subjects found. Please contact your teacher to set up subjects first.",
        action_required: false,
        attendance_marked: false,
        session_id: sessionId
      };
    }
    
    const subject = subjects[0];
    
    // Check if attendance already exists for today
    const existingAttendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.student_id, input.student_id),
        eq(attendanceTable.subject_id, subject.id),
        eq(attendanceTable.date, today.toISOString().split('T')[0]) // Convert to YYYY-MM-DD format
      ))
      .execute();
    
    let attendanceMarked = false;
    let responseMessage = "";
    
    if (existingAttendance.length > 0) {
      // Update existing attendance
      await db.update(attendanceTable)
        .set({
          status: attendanceStatus,
          notes: `Updated via chatbot: ${input.message}`,
          updated_at: new Date()
        })
        .where(eq(attendanceTable.id, existingAttendance[0].id))
        .execute();
      
      attendanceMarked = true;
      responseMessage = `Your attendance has been updated to "${attendanceStatus}" for today. Thank you!`;
    } else {
      // Create new attendance record
      await db.insert(attendanceTable)
        .values({
          student_id: input.student_id,
          subject_id: subject.id,
          class_id: student.class_id,
          date: today.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          status: attendanceStatus,
          notes: `Marked via chatbot: ${input.message}`,
          marked_by: input.student_id // Using student_id as marker for self-marking
        })
        .execute();
      
      attendanceMarked = true;
      responseMessage = `Your attendance has been marked as "${attendanceStatus}" for today. Thank you!`;
    }
    
    // Add contextual message based on status
    if (attendanceStatus === 'sick') {
      responseMessage += " I hope you feel better soon. Please rest and take care of yourself.";
    } else if (attendanceStatus === 'late') {
      responseMessage += " Please try to arrive on time for future classes.";
    } else if (attendanceStatus === 'present') {
      responseMessage += " Great to have you in class today!";
    }
    
    return {
      message: responseMessage,
      action_required: false,
      attendance_marked: attendanceMarked,
      session_id: sessionId
    };
    
  } catch (error) {
    console.error('Chatbot message processing failed:', error);
    throw error;
  }
}

function parseAttendanceStatus(message: string): AttendanceStatus | null {
  // Check in order of specificity - more specific patterns first
  if (message.includes('late') || message.includes('delayed') || message.includes('running behind')) {
    return 'late';
  }
  
  if (message.includes('permitted') || message.includes('leave') || message.includes('permission') || message.includes('excuse')) {
    return 'permitted_leave';
  }
  
  if (message.includes('sick') || message.includes('ill') || message.includes('unwell')) {
    return 'sick';
  }
  
  if (message.includes('absent') || message.includes('not coming') || message.includes('missing')) {
    return 'absent';
  }
  
  if (message.includes('present') || message.includes('here') || message.includes("i'm in")) {
    return 'present';
  }
  
  return null;
}
