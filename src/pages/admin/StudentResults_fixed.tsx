import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Download, 
  Search, 
  BarChart3, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Eye,
  Target,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { useResults } from '../../hooks/useAdmin';
import { toast } from 'react-hot-toast';
import ResultDetailModal from '../../components/admin/ResultDetailModal';
import StatCardSkeleton from '../../components/admin/StatCardSkeleton';
import ResultsTableSkeleton from '../../components/admin/ResultsTableSkeleton';

interface StudentResult {
  id: string;
  attempt_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  exam_id: string;
  exam_title: string;
  subject: string;
  status: 'completed' | 'in_progress';
  total_score: number | null;
  passing_score: number;
  is_passed: boolean;
  start_time: string;
  end_time?: string;
  created_at: string;
}

interface FilterState {
  search: string;
  status: 'all' | 'completed' | 'in_progress';
}

function StudentResults() {
  const { examId } = useParams<{ examId: string }>();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name' | 'exam'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Applied filters (what's actually being used for API calls)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  
  // Pagination
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
  } | null>(null);

  const {
    results: apiResults,
    loading: apiLoading,
    error: apiError,
    searchAndFilterResults,
    exportResultsCSV,
    getResultsByExam
  } = useResults();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [examId]);

  // Update filtered results when API results change
  useEffect(() => {
    if (apiResults) {
      setResults(apiResults.data || []);
      setPagination(apiResults.pagination || null);
    }
  }, [apiResults]);

  // Apply local filtering and sorting
  useEffect(() => {
    applyLocalFilters();
  }, [results, appliedSearchTerm, appliedStatusFilter, sortBy, sortOrder]);

  const loadInitialData = async () => {
    try {
      setIsInitialLoading(true);
      setError(null);
      
      if (examId) {
        // Load results for specific exam
        await getResultsByExam(examId);
      } else {
        // Load all results with default filters
        await searchAndFilterResults({ 
          search: '', 
          status: 'all',
          page: 1,
          limit: 20 
        });
      }
    } catch (error: any) {
      console.error('Error loading results:', error);
      setError(error.message || 'Failed to load results');
    } finally {
      setIsInitialLoading(false);
      setLoading(false);
    }
  };

  const applyLocalFilters = () => {
    let filtered = [...results];

    // Apply search filter locally if different from applied search
    if (appliedSearchTerm !== searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(result => 
        `${result.first_name} ${result.last_name}`.toLowerCase().includes(searchLower) ||
        result.email.toLowerCase().includes(searchLower) ||
        result.exam_title.toLowerCase().includes(searchLower) ||
        result.subject.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter locally if different from applied status
    if (appliedStatusFilter !== statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(result => result.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.start_time || a.created_at).getTime() - 
                      new Date(b.start_time || b.created_at).getTime();
          break;
        case 'score':
          comparison = (a.total_score || 0) - (b.total_score || 0);
          break;
        case 'name':
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'exam':
          comparison = a.exam_title.localeCompare(b.exam_title);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredResults(filtered);
  };

  const handleSearchAndFilter = async () => {
    try {
      setLoading(true);
      setAppliedSearchTerm(searchTerm);
      setAppliedStatusFilter(statusFilter);
      
      if (examId) {
        // For specific exam, just update local filters
        applyLocalFilters();
      } else {
        // For all results, make API call
        await searchAndFilterResults({ 
          search: searchTerm, 
          status: statusFilter,
          page: 1,
          limit: 20 
        });
      }
    } catch (error: any) {
      console.error('Error filtering results:', error);
      toast.error(error.message || 'Failed to filter results');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchAndFilter();
    }
  };

  const handleLoadMore = async () => {
    if (!pagination?.hasNextPage || loadingMore) return;
    
    try {
      setLoadingMore(true);
      await searchAndFilterResults({ 
        search: appliedSearchTerm, 
        status: appliedStatusFilter,
        page: pagination.currentPage + 1,
        limit: 20 
      });
    } catch (error: any) {
      console.error('Error loading more results:', error);
      toast.error('Failed to load more results');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const filters = {
        search: appliedSearchTerm,
        status: appliedStatusFilter,
        examId: examId || undefined
      };
      
      await exportResultsCSV(filters);
      toast.success('CSV export started. Download will begin shortly.');
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error(error.message || 'Failed to export CSV');
    }
  };

  const handleViewDetails = (result: StudentResult) => {
    setSelectedResult(result);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setSelectedResult(null);
    setIsDetailModalOpen(false);
  };

  // Calculate stats
  const stats = {
    totalAttempts: results.length,
    completedAttempts: results.filter(r => r.status === 'completed').length,
    passedAttempts: results.filter(r => r.is_passed || (r.total_score && r.total_score >= (r.passing_score || 70))).length,
    averageScore: results.filter(r => r.total_score !== null).reduce((sum, r) => sum + (r.total_score || 0), 0) / results.filter(r => r.total_score !== null).length || 0
  };

  if (error) {
    return (
      <div className="bg-edumate-light min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-red-800">Error Loading Results</h3>
            </div>
            <div className="mt-2">
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={loadInitialData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-edumate-light min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
                title="Go Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {examId ? 'Exam Results' : 'Student Results'}
                </h1>
                <p className="text-gray-600">
                  {examId ? 'View detailed results for this exam' : 'Monitor student performance and analytics'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {isInitialLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completedAttempts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <Award className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Passed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.passedAttempts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isNaN(stats.averageScore) ? '0' : Math.round(stats.averageScore)}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, email, exam, or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Filters and Search Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSearchAndFilter}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Search
              </button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date-desc">Latest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="score-desc">Highest Score</option>
                <option value="score-asc">Lowest Score</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="exam-asc">Exam A-Z</option>
                <option value="exam-desc">Exam Z-A</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Results {!isInitialLoading && `(${filteredResults.length})`}
            </h2>
          </div>

          {isInitialLoading ? (
            <ResultsTableSkeleton />
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No results found</p>
              {searchTerm || statusFilter !== 'all' ? (
                <button
                  onClick={async () => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setAppliedSearchTerm('');
                    setAppliedStatusFilter('all');
                    if (!examId) {
                      // For all results, refetch all with cleared filters
                      await searchAndFilterResults({ search: '', status: 'all' });
                    }
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium mt-2"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result) => {
                    const isPassed = result.is_passed || (result.total_score || 0) >= (result.passing_score || 70);

                    return (
                      <tr key={`${result.attempt_id || result.id}-${result.user_id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {result.first_name} {result.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{result.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {result.exam_title || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{result.subject || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            result.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {result.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {result.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {result.total_score !== null ? `${result.total_score}%` : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Passing: {result.passing_score || 70}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {result.status === 'completed' && result.total_score !== null ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isPassed ? 'Pass' : 'Fail'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(result.start_time || result.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(result)}
                            className="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Load More Button - Only show for all results view (not specific exam) */}
        {!examId && pagination?.hasNextPage && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loadingMore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                'Load More Results'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {selectedResult && (
        <ResultDetailModal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          attemptId={selectedResult.attempt_id}
          resultData={selectedResult}
        />
      )}
    </div>
  );
}

export default StudentResults;
