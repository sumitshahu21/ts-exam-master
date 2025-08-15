import { apiClient } from './authService';

export interface StudentResult {
  attempt_id: number;
  exam_id: number;
  start_time: string;
  end_time: string;
  status: string;
  total_score: number;
  is_submitted: boolean;
  exam_title: string;
  subject: string;
  duration: number;
  passing_score: number;
  percentage: number;
  grade: string;
  obtained_marks: number;
  total_marks: number;
  is_passed: boolean;
}

export interface DetailedResult {
  attempt: {
    id: number;
    user_id: number;
    exam_id: number;
    start_time: string;
    end_time: string;
    status: string;
    total_score: number;
    is_submitted: boolean;
  };
  exam: {
    title: string;
    subject: string;
    duration: number;
    passing_score: number;
    total_questions: number;
  };
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  result: {
    total_score: number;
    percentage: number;
    grade: string;
    is_passed: boolean;
  };
  questions: Array<{
    id: number;
    question_text: string;
    question_type: string;
    marks: number;
    student_answer: any;
    correct_answer: any;
    is_correct: boolean;
    points_earned: number;
  }>;
}

// Student Results Service
export const studentService = {
  // Get student's completed test results
  async getMyResults(): Promise<{ success: boolean; data: StudentResult[]; message: string }> {
    try {
      const response = await apiClient.get('/test-attempts/student/results');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching student results:', error);
      throw error;
    }
  },

  // Get detailed result for a specific attempt
  async getDetailedResult(attemptId: number): Promise<{ success: boolean; data: DetailedResult; message: string }> {
    try {
      const response = await apiClient.get(`/results/attempt/${attemptId}/detailed`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching detailed result:', error);
      throw error;
    }
  },

  // Get student's test attempts (all statuses)
  async getMyTestAttempts(): Promise<{ success: boolean; data: any[]; message: string }> {
    try {
      const response = await apiClient.get('/test-attempts/student');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching test attempts:', error);
      throw error;
    }
  },

  // Export results to CSV
  exportToCSV: (results: StudentResult[], filename?: string) => {
    const csvHeader = [
      'Exam Title',
      'Subject', 
      'Attempt Date',
      'Completion Date',
      'Status',
      'Score (%)',
      'Grade',
      'Result',
      'Marks Obtained',
      'Total Marks',
      'Duration (min)'
    ].join(',');

    const csvContent = [
      csvHeader,
      ...results.map(result => [
        `"${result.exam_title}"`,
        `"${result.subject}"`,
        new Date(result.start_time).toLocaleDateString(),
        new Date(result.end_time).toLocaleDateString(),
        result.status,
        result.percentage || result.total_score || 0,
        result.grade || 'N/A',
        result.is_passed ? 'Pass' : 'Fail',
        result.obtained_marks || result.total_score || 0,
        result.total_marks || 100,
        result.duration
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `my-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // Export detailed result to PDF
  exportToPDF: async (attemptId: number, studentName?: string) => {
    try {
      // Import html2pdf dynamically to avoid build issues
      const html2pdf = (await import('html2pdf.js' as any)).default;
      
      // Get the result detail element or create a temporary one
      const element = document.getElementById('result-detail-content');
      if (!element) {
        throw new Error('Result detail content not found');
      }

      const opt = {
        margin: 1,
        filename: `result-${attemptId}-${studentName || 'student'}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }
};
