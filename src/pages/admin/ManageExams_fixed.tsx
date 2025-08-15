import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  EyeOff, 
  Trash2, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  Plus,
  FileText,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { examService, type Exam as AdminExam } from '../../services/adminService';
import ExamCardSkeleton from '../../components/admin/ExamCardSkeleton';
import StatCardSkeleton from '../../components/admin/StatCardSkeleton';

interface FilterOptions {
  searchTerm: string;
  status: 'all' | 'published' | 'draft';
}

function ManageExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [filteredExams, setFilteredExams] = useState<AdminExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{ open: boolean; examId?: number; title?: string }>({ open: false });

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    status: 'all'
  });

  // Load exams on component mount
  useEffect(() => {
    loadExams();
  }, []);

  // Apply filters whenever exams or filters change
  useEffect(() => {
    applyFilters();
  }, [exams, filters]);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await examService.getAllExams();
      if (response.success) {
        setExams(response.data);
      } else {
        setError('Failed to load exams');
      }
    } catch (error: any) {
      console.error('Error loading exams:', error);
      setError(error.message || 'Failed to load exams');
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...exams];

    // Apply search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(exam => 
        exam.title.toLowerCase().includes(searchLower) ||
        exam.subject.toLowerCase().includes(searchLower) ||
        (exam.description && exam.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(exam => 
        filters.status === 'published' ? exam.is_published : !exam.is_published
      );
    }

    setFilteredExams(filtered);
  };

  const handleSearchChange = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const handleStatusFilter = (status: FilterOptions['status']) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handleEditExam = (examId: number) => {
    navigate(`/admin/exams/${examId}/edit`);
  };

  const handleDeleteExam = async () => {
    if (!deleteDialogOpen.examId) return;

    try {
      await examService.deleteExam(deleteDialogOpen.examId);
      toast.success('Exam deleted successfully');
      setDeleteDialogOpen({ open: false });
      loadExams(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting exam:', error);
      toast.error(error.message || 'Failed to delete exam');
    }
  };

  const handleTogglePublish = async (examId: number, currentStatus: boolean) => {
    try {
      await examService.updateExam(examId, { isPublished: !currentStatus });
      toast.success(`Exam ${!currentStatus ? 'published' : 'unpublished'} successfully`);
      loadExams(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating exam status:', error);
      toast.error(error.message || 'Failed to update exam status');
    }
  };

  if (loading) {
    return (
      <div className="bg-edumate-light min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-300 rounded-lg animate-pulse"></div>
                <div className="h-8 w-48 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-32 bg-gray-300 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>

          {/* Search/Filter Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 h-10 bg-gray-300 rounded-lg animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-300 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Exam Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ExamCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-edumate-light min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-red-800">Error Loading Exams</h3>
            </div>
            <div className="mt-2">
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={loadExams}
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
                onClick={() => navigate('/admin')}
                className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Exams</h1>
                <p className="text-gray-600">Create and manage your examinations</p>
              </div>
            </div>
            <Link
              to="/admin/exams/create"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg">
                <FileText className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.filter(exam => exam.is_published).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.filter(exam => !exam.is_published).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exams.reduce((sum, exam) => sum + (exam.questions?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>
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
                  placeholder="Search exams..."
                  value={filters.searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'published', label: 'Published' },
                { key: 'draft', label: 'Draft' }
              ].map((status) => (
                <button
                  key={status.key}
                  onClick={() => handleStatusFilter(status.key as FilterOptions['status'])}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filters.status === status.key
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Exams Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Exams ({filteredExams.length})
            </h2>
          </div>

          {filteredExams.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {filters.searchTerm || filters.status !== 'all' 
                  ? 'No exams match your filters' 
                  : 'No exams created yet'
                }
              </p>
              {filters.searchTerm || filters.status !== 'all' ? (
                <button
                  onClick={() => setFilters({ searchTerm: '', status: 'all' })}
                  className="text-primary-600 hover:text-primary-700 font-medium mt-2"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/admin/exams/create"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Exam
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{exam.title}</h3>
                        <p className="text-sm text-gray-600">{exam.subject}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        exam.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {exam.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{exam.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="text-gray-900">{exam.duration} minutes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Questions:</span>
                        <span className="text-gray-900">{exam.questions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Marks:</span>
                        <span className="text-gray-900">{exam.total_marks || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-900">
                          {format(new Date(exam.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTogglePublish(exam.id, exam.is_published)}
                          className={`p-2 rounded-lg transition-colors ${
                            exam.is_published 
                              ? 'text-yellow-600 hover:bg-yellow-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={exam.is_published ? 'Unpublish exam' : 'Publish exam'}
                        >
                          {exam.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleEditExam(exam.id)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit exam"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => setDeleteDialogOpen({ 
                            open: true, 
                            examId: exam.id, 
                            title: exam.title 
                          })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete exam"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteDialogOpen.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "<strong>{deleteDialogOpen.title}</strong>"? 
                This will also delete all associated questions and cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteDialogOpen({ open: false })}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteExam}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageExams;
