import { useState } from 'react';
import { 
  Download, 
  TrendingUp,
  ArrowLeft,
  Eye,
  FileText,
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useStudentResults } from '../../hooks/useStudent';
import { studentService, type StudentResult } from '../../services/studentService';
import { toast } from 'react-hot-toast';
import ResultDetailModal from '../../components/admin/ResultDetailModal';

function MyResults() {
  const { results, loading, error } = useStudentResults();
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'exam'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'score':
        comparison = (a.percentage || a.total_score || 0) - (b.percentage || b.total_score || 0);
        break;
      case 'exam':
        comparison = a.exam_title.localeCompare(b.exam_title);
        break;
      case 'date':
        comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calculate statistics
  const stats = {
    totalAttempts: results.length,
    avgScore: results.length > 0 
      ? results.reduce((sum, r) => sum + (r.percentage || r.total_score || 0), 0) / results.length 
      : 0,
    passRate: results.length > 0 
      ? (results.filter(r => r.is_passed).length / results.length) * 100 
      : 0,
    totalPassed: results.filter(r => r.is_passed).length
  };

  const handleViewDetails = (result: StudentResult) => {
    setSelectedResult(result);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedResult(null);
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }
    
    try {
      studentService.exportToCSV(results);
      toast.success('Results exported to CSV successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export results');
    }
  };

  const handleExportPDF = async (result: StudentResult) => {
    try {
      await studentService.exportToPDF(result.attempt_id, 'student');
      toast.success('Result exported to PDF successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export to PDF');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">My Test Results</h1>
          </div>
          <p className="text-gray-600">
            View your completed test results and performance analytics
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Attempts</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Passed</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPassed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.avgScore.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pass Rate</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.passRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            {/* Sorting Controls */}
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'date' | 'exam')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="date">Date</option>
                  <option value="score">Score</option>
                  <option value="exam">Exam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={results.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
          </div>

          {error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700">Failed to load results: {error}</p>
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
              <p className="text-gray-600">
                You haven't completed any tests yet. Results will appear here after you finish your first exam.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
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
                  {sortedResults.map((result) => {
                    const score = result.percentage || result.total_score || 0;
                    const isPassed = result.is_passed;

                    return (
                      <tr key={result.attempt_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {result.exam_title}
                            </div>
                            <div className="text-sm text-gray-500">{result.subject}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {score.toFixed(1)}%
                            </div>
                            {result.grade && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {result.grade}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isPassed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(result.start_time), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewDetails(result)}
                            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleExportPDF(result)}
                            className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            PDF
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

        {/* Detail Modal */}
        {selectedResult && (
          <ResultDetailModal
            isOpen={isDetailModalOpen}
            onClose={closeDetailModal}
            attemptId={Number(selectedResult.attempt_id)}
            resultData={selectedResult}
          />
        )}
      </div>
    </div>
  );
}

export default MyResults;
