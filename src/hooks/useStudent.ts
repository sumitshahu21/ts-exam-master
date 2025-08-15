import { useState, useEffect } from 'react';
import { studentService, type StudentResult, type DetailedResult } from '../services/studentService';
import { toast } from 'react-hot-toast';

// Hook for managing student's test results
export const useStudentResults = () => {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await studentService.getMyResults();
      if (response.success) {
        setResults(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch results');
      }
    } catch (err: any) {
      console.error('Error fetching student results:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch results';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return {
    results,
    loading,
    error,
    refetch: fetchResults
  };
};

// Hook for managing detailed result for a specific attempt
export const useDetailedResult = (attemptId: number | null) => {
  const [detailedResult, setDetailedResult] = useState<DetailedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetailedResult = async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await studentService.getDetailedResult(id);
      if (response.success) {
        setDetailedResult(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch detailed result');
      }
    } catch (err: any) {
      console.error('Error fetching detailed result:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch detailed result';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attemptId) {
      fetchDetailedResult(attemptId);
    } else {
      setDetailedResult(null);
      setError(null);
    }
  }, [attemptId]);

  return {
    detailedResult,
    loading,
    error,
    refetch: () => attemptId && fetchDetailedResult(attemptId)
  };
};

// Hook for managing student's test attempts (all statuses)
export const useStudentAttempts = () => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await studentService.getMyTestAttempts();
      if (response.success) {
        setAttempts(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch test attempts');
      }
    } catch (err: any) {
      console.error('Error fetching test attempts:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch test attempts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  return {
    attempts,
    loading,
    error,
    refetch: fetchAttempts
  };
};
