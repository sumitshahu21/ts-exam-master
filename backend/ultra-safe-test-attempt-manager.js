// Minimal TestAttemptManager for direct status update on submit
const sql = require('mssql');

class TestAttemptManager {
  constructor(pool) {
    this.pool = pool;
    console.log('🚀 TestAttemptManager initialized (minimal mode)');
  }

  // Only used for eligibility check (no background logic)
  async canStartAttempt(userId, examId) {
    try {
      // Check if exam is published and within schedule
      const examCheck = await this.pool.request()
        .input('examId', sql.Int, examId)
        .query(`
          SELECT 
            is_published,
            scheduled_start_time,
            scheduled_end_time,
            allow_multiple_attempts
          FROM exams 
          WHERE id = @examId
        `);

      if (examCheck.recordset.length === 0) {
        return { allowed: false, reason: 'Exam not found' };
      }

      const exam = examCheck.recordset[0];
      const now = new Date();

      // Check if exam is published
      if (!exam.is_published) {
        return { allowed: false, reason: 'Exam is not published' };
      }

      // Check schedule constraints
      if (exam.scheduled_start_time && new Date(exam.scheduled_start_time) > now) {
        return { allowed: false, reason: 'Exam has not started yet' };
      }

      if (exam.scheduled_end_time && new Date(exam.scheduled_end_time) < now) {
        return { allowed: false, reason: 'Exam has ended', status: 'ended' };
      }

      // Check existing attempts - only look for RECENT in_progress attempts (within last 2 hours)
      const existingAttempts = await this.pool.request()
        .input('userId', sql.Int, userId)
        .input('examId', sql.Int, examId)
        .input('cutoffTime', sql.DateTime, new Date(Date.now() - 2 * 60 * 60 * 1000)) // 2 hours ago
        .query(`
          SELECT id, status, start_time FROM testAttempt 
          WHERE user_id = @userId AND exam_id = @examId 
          ORDER BY created_at DESC
        `);

      if (existingAttempts.recordset.length > 0) {
        const latestAttempt = existingAttempts.recordset[0];
        
        // Only resume if it's in_progress AND was started within the last 2 hours
        if (latestAttempt.status === 'in_progress' && 
            latestAttempt.start_time && 
            new Date(latestAttempt.start_time) > new Date(Date.now() - 2 * 60 * 60 * 1000)) {
          return { allowed: true, reason: 'Resume existing attempt', resumeAttemptId: latestAttempt.id };
        }
        if (latestAttempt.status === 'completed') {
          if (!exam.allow_multiple_attempts) {
            return { allowed: false, reason: 'Test already completed', status: 'completed' };
          }
        }
        if (latestAttempt.status === 'ended') {
          return { allowed: false, reason: 'Test has ended', status: 'ended' };
        }
      }

      return { allowed: true, reason: 'Can start new attempt' };
    } catch (error) {
      console.error('❌ Error in canStartAttempt:', error);
      return { allowed: false, reason: 'Server error checking eligibility' };
    }
  }

  stop() {
    // No background processes
  }
}

module.exports = { TestAttemptManager };
