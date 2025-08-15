import { useState, useEffect } from 'react';

interface DashboardStats {
  totalExams: number;
  totalStudents: number;
  totalAttempts: number;
  averageScore: number;
}

interface Exam {
  examId: string;
  title: string;
  description: string;
  maxScore: number;
  duration: number;
  isPublished: boolean;
  createdAt: string;
  attemptCount?: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard-stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

export function useRecentExams(limit: number = 5) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentExams = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/exams/recent?limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recent exams');
        }

        const data = await response.json();
        setExams(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch exams');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentExams();
  }, [limit]);

  return { exams, loading, error };
}
