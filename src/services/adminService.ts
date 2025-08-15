import { apiClient } from './authService';

// Types for API responses
export interface Exam {
  id: number;
  title: string;
  subject: string;
  description?: string;
  duration: number;
  total_questions: number;
  passing_score: number;
  is_published: boolean;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: number;
  exam_id: number;
  question_type: 'single-choice' | 'multiple-choice' | 'drag-drop' | 'case-study' | 'short-answer';
  question_text: string;
  marks: number;
  order_index: number;
  explanation?: string;
  question_data: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestAttempt {
  id: number;
  user_id: number;
  exam_id: number;
  start_time: string;
  end_time?: string;
  status: 'in_progress' | 'completed';
  total_score?: number;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  exam_title?: string;
  subject?: string;
  duration?: number;
  passing_score?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface Result {
  id: number;
  attempt_id: number;
  total_score: number;
  percentage: number;
  grade: string;
  is_passed: boolean;
  detailed_results: any;
  created_at: string;
  // Joined fields from attempt and exam
  user_id?: number;
  exam_id?: number;
  exam_title?: string;
  subject?: string;
  passing_score?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  // Test attempt fields
  start_time?: string;
  end_time?: string;
  status?: 'in_progress' | 'completed';
  duration?: number;
}

// Exam Management Service
export const examService = {
  // Get all exams (admin only)
  async getAllExams(): Promise<{ success: boolean; data: Exam[]; message: string }> {
    const response = await apiClient.get('/exams');
    return {
      success: true,
      data: response.data,
      message: 'Exams fetched successfully'
    };
  },

  // Get published exams for students
  async getPublishedExams(): Promise<{ success: boolean; data: Exam[]; message: string }> {
    const response = await apiClient.get('/exams/published');
    return {
      success: true,
      data: response.data,
      message: 'Published exams fetched successfully'
    };
  },

  // Get single exam by ID
  async getExamById(examId: number): Promise<{ success: boolean; data: Exam; message: string }> {
    const response = await apiClient.get(`/exams/${examId}`);
    return {
      success: response.data.success,
      data: response.data.data,
      message: 'Exam fetched successfully'
    };
  },

  // Create new exam
  async createExam(examData: {
    title: string;
    subject: string;
    description?: string;
    duration: number;
    totalQuestions: number;
    totalMarks: number;
    passingScore: number;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    isPublished: boolean;
  }): Promise<{ success: boolean; data: { examId: number }; message: string }> {
    console.log('🚀 AdminService: Creating exam with data:', examData);
    console.log('🚀 AdminService: isPublished value:', examData.isPublished, typeof examData.isPublished);
    try {
      const response = await apiClient.post('/exams', examData);
      console.log('🚀 AdminService: Exam creation response:', response.data);
      return {
        success: true,
        data: { examId: response.data.examId },
        message: 'Exam created successfully'
      };
    } catch (error) {
      console.error('❌ AdminService: Exam creation error:', error);
      throw error;
    }
  },

  // Update exam
  async updateExam(examId: number, examData: Partial<{
    title: string;
    subject: string;
    description: string;
    duration: number;
    totalQuestions: number;
    totalMarks: number;
    passingScore: number;
    scheduledStartTime: string;
    scheduledEndTime: string;
    isPublished: boolean;
  }>): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/exams/${examId}`, examData);
    return {
      success: true,
      message: 'Exam updated successfully'
    };
  },

  // Delete exam
  async deleteExam(examId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/exams/${examId}`);
    return {
      success: true,
      message: 'Exam deleted successfully'
    };
  }
};

// Question Management Service
export const questionService = {
  // Get all questions for an exam
  async getQuestionsByExam(examId: number): Promise<{ success: boolean; data: Question[]; message: string }> {
    const response = await apiClient.get(`/questions/exam/${examId}`);
    return {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message || 'Questions fetched successfully'
    };
  },

  // Get questions by type for an exam
  async getQuestionsByType(examId: number, questionType: string): Promise<{ success: boolean; data: Question[]; message: string }> {
    const response = await apiClient.get(`/questions/exam/${examId}/type/${questionType}`);
    return {
      success: true,
      data: response.data,
      message: 'Questions fetched successfully'
    };
  },

  // Get single question
  async getQuestionById(questionId: number): Promise<{ success: boolean; data: Question; message: string }> {
    const response = await apiClient.get(`/questions/${questionId}`);
    return {
      success: true,
      data: response.data,
      message: 'Question fetched successfully'
    };
  },

  // Create new question
  async createQuestion(questionData: {
    examId: number;
    questionType: string;
    questionText: string;
    marks: number;
    explanation?: string;
    questionData: any;
  }): Promise<{ success: boolean; data: { questionId: number }; message: string }> {
    console.log('🚀 AdminService: Creating question with data:', questionData);
    try {
      const response = await apiClient.post('/questions', {
        examId: questionData.examId,
        questionType: questionData.questionType,
        questionText: questionData.questionText,
        marks: questionData.marks,
        explanation: questionData.explanation,
        questionData: questionData.questionData
      });
      console.log('🚀 AdminService: Question creation response:', response.data);
      return {
        success: true,
        data: { questionId: response.data.questionId },
        message: 'Question created successfully'
      };
    } catch (error) {
      console.error('❌ AdminService: Question creation error:', error);
      throw error;
    }
  },

  // Update question
  async updateQuestion(questionId: number, questionData: {
    questionText: string;
    marks: number;
    explanation?: string;
    questionData: any;
  }): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/questions/${questionId}`, {
      ...questionData,
      points: questionData.marks // Backend expects 'points' not 'marks'
    });
    return {
      success: true,
      message: 'Question updated successfully'
    };
  },

  // Delete question
  async deleteQuestion(questionId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/questions/${questionId}`);
    return {
      success: true,
      message: 'Question deleted successfully'
    };
  }
};

// Test Attempt Management Service
export const attemptService = {
  // Get attempts for an exam
  async getAttemptsByExam(examId: number): Promise<{ success: boolean; data: TestAttempt[]; message: string }> {
    const response = await apiClient.get(`/test-attempts/exam/${examId}`);
    return {
      success: true,
      data: response.data,
      message: 'Attempts fetched successfully'
    };
  },

  // Get single attempt
  async getAttemptById(attemptId: number): Promise<{ success: boolean; data: TestAttempt; message: string }> {
    const response = await apiClient.get(`/test-attempts/${attemptId}`);
    return {
      success: true,
      data: response.data,
      message: 'Attempt fetched successfully'
    };
  },

  // Get attempts by student
  async getAttemptsByStudent(userId: number): Promise<{ success: boolean; data: TestAttempt[]; message: string }> {
    const response = await apiClient.get(`/test-attempts/student/${userId}`);
    return {
      success: true,
      data: response.data,
      message: 'Attempts fetched successfully'
    };
  }
};

// Answer Management Service
export const answerService = {
  // Get answers for an attempt
  async getAnswersByAttempt(attemptId: number): Promise<{ success: boolean; data: any[]; message: string }> {
    const response = await apiClient.get(`/answers/attempt/${attemptId}`);
    return {
      success: true,
      data: response.data,
      message: 'Answers fetched successfully'
    };
  }
};

// Results Management Service
export const resultService = {
  // Get result for an attempt
  async getResultByAttempt(attemptId: number): Promise<{ success: boolean; data: Result; message: string }> {
    const response = await apiClient.get(`/results/attempt/${attemptId}`);
    return {
      success: true,
      data: response.data,
      message: 'Result fetched successfully'
    };
  },

  // Get results for an exam
  async getResultsByExam(examId: number): Promise<{ success: boolean; data: Result[]; message: string }> {
    const response = await apiClient.get(`/results/exam/${examId}`);
    return {
      success: true,
      data: response.data,
      message: 'Results fetched successfully'
    };
  },

  // Get results for a student
  async getResultsByStudent(userId: number): Promise<{ success: boolean; data: Result[]; message: string }> {
    const response = await apiClient.get(`/results/student/${userId}`);
    return {
      success: true,
      data: response.data,
      message: 'Results fetched successfully'
    };
  },

  // Get all results (admin only)
  async getAllResults(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{ 
    success: boolean; 
    data: Result[]; 
    pagination?: any;
    statistics?: any;
    message: string 
  }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
      
      const url = `/results/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('📊 getAllResults URL:', url);
      
      const response = await apiClient.get(url);
      console.log('📊 getAllResults response:', response);
      console.log('📊 getAllResults response.data:', response.data);
      
      return {
        success: true,
        data: response.data.data || [],
        pagination: response.data.pagination,
        statistics: response.data.statistics,
        message: 'All results fetched successfully'
      };
    } catch (error) {
      console.error('❌ Error in getAllResults:', error);
      throw error;
    }
  }
};

// Statistics Service
export const statsService = {
  async getDashboardStats(): Promise<{
    totalExams: number;
    publishedExams: number;
    totalAttempts: number;
    avgScore: number;
    recentExams: Exam[];
    recentAttempts: TestAttempt[];
  }> {
    // Fetch multiple endpoints concurrently
    const [examsResponse, attemptsResponse] = await Promise.all([
      examService.getAllExams(),
      // Fixed: Now uses proper /all endpoint instead of conflicting with /:attemptId
      apiClient.get('/test-attempts/all')
    ]);

    const exams = Array.isArray(examsResponse.data) ? examsResponse.data : [];
    const attempts = Array.isArray(attemptsResponse.data) ? attemptsResponse.data : [];
    const publishedExams = exams.filter(exam => exam.is_published);
    
    // Calculate basic stats
    const totalExams = exams.length;
    const publishedExamsCount = publishedExams.length;
    const totalAttempts = attempts.length;
    
    // Calculate average score from completed attempts
    const completedAttempts = attempts.filter((attempt: any) => attempt.status === 'completed' && attempt.total_score !== null);
    const avgScore = completedAttempts.length > 0 
      ? completedAttempts.reduce((sum: number, attempt: any) => sum + attempt.total_score, 0) / completedAttempts.length 
      : 0;
    
    // Get recent exams (last 5)
    const recentExams = exams
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
      
    // Get recent attempts (last 5)
    const recentAttempts = attempts
      .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 5);

    return {
      totalExams,
      publishedExams: publishedExamsCount,
      totalAttempts,
      avgScore,
      recentExams,
      recentAttempts
    };
  }
};

// Utility functions for data transformation
export const adminUtils = {
  // Transform exam data for API requests
  transformExamForAPI: (examData: any) => ({
    title: examData.title,
    subject: examData.subject,
    description: examData.description,
    duration: examData.duration,
    totalQuestions: examData.totalQuestions,
    passingScore: examData.passingScore,
    scheduledStartTime: examData.scheduledStartTime,
    scheduledEndTime: examData.scheduledEndTime,
    isPublished: examData.isPublished
  }),

  // Transform question data for API requests
  transformQuestionForAPI: (questionData: any) => ({
    examId: questionData.examId,
    questionType: questionData.questionType,
    questionText: questionData.questionText,
    points: questionData.marks, // Backend uses 'points' instead of 'marks'
    explanation: questionData.explanation,
    questionData: questionData.questionData
  })
};

// Main admin service object that consolidates all services
const adminService = {
  exam: examService,
  question: questionService,
  attempt: attemptService,
  answer: answerService,
  result: resultService,
  stats: statsService,
  utils: adminUtils
};

export { adminService };
export default adminService;
