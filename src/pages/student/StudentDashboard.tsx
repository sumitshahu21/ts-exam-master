import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, BookOpen, Play, CheckCircle, Eye, BarChart3 } from 'lucide-react';
import { useStudentResults } from '../../hooks/useStudent';

interface Exam {
  id: number;
  title: string;
  subject: string;
  description: string;
  duration: number;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  created_at: string;
}

interface ExamStatus {
  status: string;
  canStart: boolean;
  statusMessage: string;
  statusColor: string;
  attempts: Array<{
    id: number;
    status: string;
    startTime: string;
    endTime: string | null;
    score: number | null;
    percentage: number | null;
    isSubmitted: boolean;
    isAutoExpired: boolean;
    isAutoEnded: boolean;
    createdAt: string;
  }>;
}

export default function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examStatuses, setExamStatuses] = useState<Record<number, ExamStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Get student results for recent results section
  const { results: recentResults } = useStudentResults();

  useEffect(() => {
    fetchPublishedExams();
  }, []);

  const fetchExamStatuses = async (examIds: number[]) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }

      const statusPromises = examIds.map(async (examId) => {
        try {
          const response = await fetch(`http://localhost:5000/api/exams/${examId}/status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            return { examId, status: data.data };
          } else {
            console.warn(`Failed to fetch status for exam ${examId}`);
            return { examId, status: null };
          }
        } catch (error) {
          console.warn(`Error fetching status for exam ${examId}:`, error);
          return { examId, status: null };
        }
      });

      const results = await Promise.all(statusPromises);
      const statusMap: Record<number, ExamStatus> = {};
      
      results.forEach(({ examId, status }) => {
        if (status) {
          statusMap[examId] = status;
        }
      });

      setExamStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching exam statuses:', error);
    }
  };

  const fetchPublishedExams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, test if the server is reachable
      const testResponse = await fetch('http://localhost:5000/api/test-db', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!testResponse.ok) {
        throw new Error(`Backend server not responding (${testResponse.status})`);
      }

      // Now fetch the exams
      const response = await fetch('http://localhost:5000/api/exams/published', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch exams`);
      }

      const data = await response.json();
      console.log('📊 Exams API Response:', data);
      
      // Handle different response formats
      let examsData = data;
      if (data.data && Array.isArray(data.data)) {
        examsData = data.data;
      } else if (Array.isArray(data)) {
        examsData = data;
      } else if (data.recordset && Array.isArray(data.recordset)) {
        examsData = data.recordset;
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        examsData = [];
      }
      
      console.log(`✅ Successfully loaded ${examsData.length} exams`);
      setExams(Array.isArray(examsData) ? examsData : []);
      setRetryCount(0); // Reset retry count on success
      
      // Fetch exam statuses for authenticated users
      if (examsData.length > 0) {
        const examIds = examsData.map((exam: Exam) => exam.id);
        await fetchExamStatuses(examIds);
      }
      
    } catch (error) {
      console.error('❌ Error fetching exams:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('fetch')) {
        setError('🔌 Cannot connect to server. Please ensure the backend server is running on port 5000.');
      } else if (errorMessage.includes('500')) {
        setError('🗄️ Database connection error. Please check the database connection.');
      } else {
        setError(`⚠️ Failed to load exams: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchPublishedExams();
  };

  const isExamAvailable = (exam: Exam) => {
    const examStatus = examStatuses[exam.id];
    
    // If we have exam status from the API, use it
    if (examStatus) {
      return examStatus.canStart;
    }
    
    // Fallback to old logic for unauthenticated users
    const now = new Date();
    const startTime = exam.scheduled_start_time ? new Date(exam.scheduled_start_time) : null;
    const endTime = exam.scheduled_end_time ? new Date(exam.scheduled_end_time) : null;

    if (startTime && now < startTime) {
      return false; // Not started yet
    }
    
    if (endTime && now > endTime) {
      return false; // Already ended
    }

    return true; // Available now
  };

  const getExamStatus = (exam: Exam) => {
    const examStatus = examStatuses[exam.id];
    
    // If we have exam status from the API (authenticated user), use it
    if (examStatus) {
      // Convert backend status to display format
      switch (examStatus.status) {
        case 'completed':
          // Check if it was auto-expired
          const latestAttempt = examStatus.attempts[0];
          if (latestAttempt?.isAutoExpired) {
            return {
              status: 'ended',
              message: 'Ended',
              color: 'text-red-600 bg-red-50'
            };
          } else {
            return {
              status: 'completed',
              message: 'Completed',
              color: 'text-orange-600 bg-orange-50'
            };
          }
        case 'in_progress':
          return {
            status: 'in_progress',
            message: 'In Progress',
            color: 'text-blue-600 bg-blue-50'
          };
        case 'ended':
          return {
            status: 'ended',
            message: 'Ended',
            color: 'text-red-600 bg-red-50'
          };
        case 'not_started':
          return {
            status: 'upcoming',
            message: examStatus.statusMessage,
            color: 'text-blue-600 bg-blue-50'
          };
        case 'retake_available':
          return {
            status: 'retake_available',
            message: 'Retake Available',
            color: 'text-green-600 bg-green-50'
          };
        default:
          return {
            status: 'available',
            message: 'Available now',
            color: 'text-green-600 bg-green-50'
          };
      }
    }
    
    // Fallback to old logic for unauthenticated users or when status is not available
    const now = new Date();
    const startTime = exam.scheduled_start_time ? new Date(exam.scheduled_start_time) : null;
    const endTime = exam.scheduled_end_time ? new Date(exam.scheduled_end_time) : null;

    if (startTime && now < startTime) {
      return {
        status: 'upcoming',
        message: `Starts ${formatDateTime(startTime)}`,
        color: 'text-blue-600 bg-blue-50'
      };
    }
    
    if (endTime && now > endTime) {
      return {
        status: 'ended',
        message: `Ended ${formatDateTime(endTime)}`,
        color: 'text-gray-600 bg-gray-50'
      };
    }

    if (endTime) {
      return {
        status: 'active',
        message: `Available until ${formatDateTime(endTime)}`,
        color: 'text-green-600 bg-green-50'
      };
    }

    return {
      status: 'available',
      message: 'Available now',
      color: 'text-green-600 bg-green-50'
    };
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Exams</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            
            {retryCount > 0 && (
              <p className="text-gray-600 text-xs mb-4">
                Retry attempt: {retryCount}
              </p>
            )}
            
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              
              <details className="text-left">
                <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                  Troubleshooting Steps
                </summary>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <p>1. Ensure backend server is running: <code className="bg-gray-100 px-1">node backend/working-server.js</code></p>
                  <p>2. Check if port 5000 is available</p>
                  <p>3. Verify database connection</p>
                  <p>4. Check browser network tab for detailed errors</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light-gray font-nunito min-h-screen">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Let's continue your learning journey.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Exams</p>
                <p className="text-2xl font-bold text-dark">{exams.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Available Now</p>
                <p className="text-2xl font-bold text-dark">
                  {exams.filter(exam => {
                    const status = getExamStatus(exam);
                    return status.status === 'available' || status.status === 'active' || status.status === 'retake_available';
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Completed</p>
                <p className="text-2xl font-bold text-dark">
                  {exams.filter(exam => {
                    const status = getExamStatus(exam);
                    return status.status === 'completed';
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Test Results */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark">Recent Results</h2>
              <Link 
                to="/student/results" 
                className="text-primary hover:text-primary-dark text-sm font-medium"
              >
                View all
              </Link>
            </div>
            <div className="p-6">
              {recentResults.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No test results yet</p>
                  <p className="text-gray-400 text-xs mt-1">Complete a test to see your results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentResults.slice(0, 3).map((result) => {
                    const score = result.percentage || result.total_score || 0;
                    const isPassed = result.is_passed;

                    return (
                      <div key={result.attempt_id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{result.exam_title}</h3>
                            <p className="text-sm text-gray-500">{result.subject}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-medium text-gray-900">
                                {score.toFixed(1)}%
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {isPassed ? 'Pass' : 'Fail'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {new Date(result.start_time).toLocaleDateString()}
                            </p>
                            <Link
                              to={`/student/results`}
                              className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 mt-1"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Performance Summary</h2>
            </div>
            <div className="p-6">
              {recentResults.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No performance data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tests Completed</span>
                    <span className="text-gray-900 font-medium">{recentResults.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Average Score</span>
                    <span className="text-gray-900 font-medium">
                      {recentResults.length > 0 
                        ? (recentResults.reduce((sum, r) => sum + (r.percentage || r.total_score || 0), 0) / recentResults.length).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pass Rate</span>
                    <span className="text-gray-900 font-medium">
                      {recentResults.length > 0 
                        ? ((recentResults.filter(r => r.is_passed).length / recentResults.length) * 100).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tests Passed</span>
                    <span className="text-green-600 font-medium">
                      {recentResults.filter(r => r.is_passed).length}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/student/results"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block"
                    >
                      View Detailed Analysis
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exams List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-dark">Available Exams</h2>
          </div>

          {exams.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Available</h3>
              <p className="text-gray-600">
                No published exams are currently available. Check back later.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {exams.map((exam) => {
                const status = getExamStatus(exam);
                const available = isExamAvailable(exam);

                return (
                  <div key={exam.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {exam.title}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.message}
                          </span>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-600">
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            {exam.subject}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDuration(exam.duration)}
                          </span>
                          {exam.scheduled_start_time && (
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDateTime(new Date(exam.scheduled_start_time))}
                            </span>
                          )}
                        </div>

                        {exam.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {exam.description}
                          </p>
                        )}
                      </div>

                      <div className="ml-6">
                        {available ? (
                          <Link
                            to={`/student/exam/${exam.id}`}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {status.status === 'in_progress' ? 'Resume Exam' : 
                             status.status === 'retake_available' ? 'Retake Exam' : 'Start Exam'}
                          </Link>
                        ) : status.status === 'completed' ? (
                          <button
                            disabled
                            className="flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-md cursor-not-allowed"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completed
                          </button>
                        ) : status.status === 'ended' ? (
                          <button
                            disabled
                            className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md cursor-not-allowed"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Ended
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Not Available
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
