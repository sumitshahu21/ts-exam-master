import { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';
import type { Exam, Question, TestAttempt, Result } from '../services/adminService';
import { toast } from 'react-hot-toast';

// Hook for exam management
export const useExams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.exam.getAllExams();
      if (response.success) {
        setExams(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      console.error('Backend error:', err);
      setError(err.message || 'Failed to fetch exams');
      // Don't show toast for initial load errors to avoid spam
      if (err.code !== 'ERR_NETWORK' && err.code !== 'ECONNREFUSED') {
        toast.error('Failed to fetch exams');
      }
      // Set empty array as fallback
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createExam = useCallback(async (examData: any) => {
    try {
      setLoading(true);
      const response = await adminService.exam.createExam(examData);
      if (response.success) {
        toast.success('Exam created successfully');
        await fetchExams(); // Refresh list
        return response.data.examId;
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create exam');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExams]);

  const updateExam = useCallback(async (examId: number, examData: any) => {
    try {
      setLoading(true);
      const response = await adminService.exam.updateExam(examId, examData);
      if (response.success) {
        toast.success('Exam updated successfully');
        await fetchExams(); // Refresh list
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update exam');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExams]);

  const deleteExam = useCallback(async (examId: number) => {
    try {
      setLoading(true);
      const response = await adminService.exam.deleteExam(examId);
      if (response.success) {
        toast.success('Exam deleted successfully');
        await fetchExams(); // Refresh list
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete exam');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExams]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  return {
    exams,
    loading,
    error,
    fetchExams,
    createExam,
    updateExam,
    deleteExam
  };
};

// Hook for question management
export const useQuestions = (examId?: number) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (examIdParam?: number) => {
    const targetExamId = examIdParam || examId;
    if (!targetExamId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await adminService.question.getQuestionsByExam(targetExamId);
      if (response.success) {
        setQuestions(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch questions');
      toast.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const createQuestion = useCallback(async (questionData: any) => {
    try {
      setLoading(true);
      const response = await adminService.question.createQuestion(questionData);
      if (response.success) {
        toast.success('Question created successfully');
        await fetchQuestions(); // Refresh list
        return response.data.questionId;
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create question');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuestions]);

  const updateQuestion = useCallback(async (questionId: number, questionData: any) => {
    try {
      setLoading(true);
      const response = await adminService.question.updateQuestion(questionId, questionData);
      if (response.success) {
        toast.success('Question updated successfully');
        await fetchQuestions(); // Refresh list
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update question');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuestions]);

  const deleteQuestion = useCallback(async (questionId: number) => {
    try {
      setLoading(true);
      const response = await adminService.question.deleteQuestion(questionId);
      if (response.success) {
        toast.success('Question deleted successfully');
        await fetchQuestions(); // Refresh list
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete question');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuestions]);

  const reorderQuestions = useCallback(async (questionOrders: { questionId: number; orderIndex: number }[]) => {
    if (!examId) return;

    try {
      setLoading(true);
      // TODO: Implement reorderQuestions in adminService
      console.log('Reorder questions not implemented yet', questionOrders);
      toast.success('Questions reordered successfully');
      await fetchQuestions(); // Refresh list
    } catch (err: any) {
      toast.error(err.message || 'Failed to reorder questions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [examId, fetchQuestions]);

  useEffect(() => {
    if (examId) {
      fetchQuestions();
    }
  }, [examId, fetchQuestions]);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions
  };
};

// Hook for test attempts management
export const useTestAttempts = (examId?: number) => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttempts = useCallback(async (examIdParam?: number) => {
    const targetExamId = examIdParam || examId;
    if (!targetExamId) return;

    try {
      setLoading(true);
      setError(null);
      // TODO: Implement testAttempt service
      console.log('Test attempts not implemented yet');
      setAttempts([]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch test attempts');
      toast.error('Failed to fetch test attempts');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) {
      fetchAttempts();
    }
  }, [examId, fetchAttempts]);

  return {
    attempts,
    loading,
    error,
    fetchAttempts
  };
};

// Hook for results management
export const useResults = (examId?: number) => {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchResults = useCallback(async (params?: {
    examId?: number;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    append?: boolean; // For "Load More" functionality
  }) => {
    const targetExamId = params?.examId || examId;
    const isLoadMore = params?.append || false;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      
      let response;
      if (targetExamId) {
        // Fetch results for specific exam
        response = await adminService.result.getResultsByExam(targetExamId);
        // For specific exam, we don't have pagination yet, so handle as before
        if (response.success && response.data) {
          const resultsArray = Array.isArray(response.data) ? response.data : [];
          setResults(resultsArray);
          
          // Calculate basic stats locally for specific exam
          const totalResults = resultsArray.length;
          const completedResults = resultsArray.filter((r: any) => r.status === 'completed');
          const avgScore = completedResults.length > 0 
            ? completedResults.reduce((sum: number, result: any) => sum + (result.total_score || 0), 0) / completedResults.length 
            : 0;
          setStats({
            totalAttempts: totalResults,
            completed: completedResults.length,
            avgScore: avgScore,
            passRate: completedResults.length > 0 
              ? (resultsArray.filter((r: any) => r.is_passed).length / completedResults.length) * 100 
              : 0
          });
        }
      } else {
        // Fetch all results with pagination support
        response = await adminService.result.getAllResults({
          page: params?.page || 1,
          limit: params?.limit || 10,
          search: params?.search || '',
          status: params?.status || 'all'
        });
        
        if (response.success && response.data) {
          const resultsArray = Array.isArray(response.data) ? response.data : [];
          
          if (isLoadMore) {
            // Append new results to existing ones
            setResults(prevResults => [...prevResults, ...resultsArray]);
          } else {
            // Replace results with new data
            setResults(resultsArray);
          }
          
          // Set pagination info and statistics from server response
          setPagination(response.pagination);
          setStats(response.statistics);
        } else {
          // Set empty array if no data or unsuccessful
          if (!isLoadMore) {
            setResults([]);
            setStats({
              totalAttempts: 0,
              completed: 0,
              avgScore: 0,
              passRate: 0
            });
            setPagination(null);
          }
        }
      }
    } catch (err: any) {
      console.error('Backend error:', err);
      setError(err.message || 'Failed to fetch results');
      if (!isLoadMore) {
        setResults([]); // Set empty array on error only for initial load
        setStats({
          totalAttempts: 0,
          completed: 0,
          avgScore: 0,
          passRate: 0
        });
        setPagination(null);
      }
      toast.error('Failed to fetch results');
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [examId]);

  // Load more results (pagination)
  const loadMoreResults = useCallback(async (params?: {
    search?: string;
    status?: string;
  }) => {
    if (!pagination || !pagination.hasNextPage || loadingMore) return;
    
    await fetchResults({
      page: pagination.currentPage + 1,
      limit: pagination.recordsPerPage,
      search: params?.search,
      status: params?.status,
      append: true
    });
  }, [pagination, loadingMore, fetchResults]);

  // Search and filter results
  const searchAndFilterResults = useCallback(async (params: {
    search?: string;
    status?: string;
  }) => {
    await fetchResults({
      page: 1, // Reset to first page for new search/filter
      limit: 10,
      search: params.search,
      status: params.status,
      append: false
    });
  }, [fetchResults]);

  useEffect(() => {
    // Always fetch results on mount - either for specific exam or all results
    fetchResults();
  }, [examId, fetchResults]);

  return {
    results,
    stats,
    pagination,
    loading,
    loadingMore,
    error,
    fetchResults,
    loadMoreResults,
    searchAndFilterResults
  };
};

// Hook for dashboard statistics
export const useDashboardStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardStats = await adminService.stats.getDashboardStats();
      setStats(dashboardStats);
    } catch (err: any) {
      console.error('Backend error:', err);
      setError(err.message || 'Failed to fetch dashboard statistics');
      // Don't show toast for initial load errors to avoid spam
      if (err.code !== 'ERR_NETWORK' && err.code !== 'ECONNREFUSED') {
        toast.error('Failed to fetch dashboard statistics');
      }
      // Set default stats as fallback
      setStats({
        totalExams: 0,
        publishedExams: 0,
        totalAttempts: 0,
        avgScore: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats
  };
};

// Hook for single exam details
export const useExamDetails = (examId: number | undefined) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExam = useCallback(async () => {
    if (!examId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await adminService.exam.getExamById(examId);
      if (response.success) {
        setExam(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch exam details');
      toast.error('Failed to fetch exam details');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  return {
    exam,
    loading,
    error,
    refreshExam: fetchExam
  };
};

// Hook for recent exams (lightweight, limited to 3)
export const useRecentExams = (limit = 3) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all exams but only process the first few
      const response = await adminService.exam.getAllExams();
      if (response.success) {
        // Only take the first 'limit' exams and strip heavy data
        const lightweightExams = response.data.slice(0, limit).map((exam: any) => ({
          examId: exam.id,
          id: exam.id,
          title: exam.title,
          subject: exam.subject,
          is_published: exam.is_published,
          isPublished: exam.is_published, // Add both formats for compatibility
          total_questions: exam.total_questions,
          duration: exam.duration,
          created_at: exam.created_at,
          // Add required fields with defaults
          passing_score: exam.passing_score || 0,
          created_by: exam.created_by || '',
          updated_at: exam.updated_at || exam.created_at,
          // Remove heavy question_data field
        }));
        setExams(lightweightExams);
      } else {
        throw new Error(response.message || 'Failed to fetch recent exams');
      }
    } catch (err: any) {
      console.error('Error fetching recent exams:', err);
      setError(err.message || 'Failed to fetch recent exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentExams();
  }, [fetchRecentExams]);

  return {
    exams,
    loading,
    error,
    refresh: fetchRecentExams
  };
};
