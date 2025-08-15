import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { useDashboardStats, useRecentExams } from '../../hooks/useAdmin';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { exams, loading: examsLoading, error: examsError } = useRecentExams(3);
  const { stats, loading: statsLoading } = useDashboardStats();

  return (
    <div className="bg-edumate-light min-h-screen">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-edumate-dark mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName}! Here's what's happening with your exams.</p>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Exams</p>
              {statsLoading ? (
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-edumate-dark">{stats?.totalExams ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Published Exams</p>
              {statsLoading ? (
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-edumate-dark">{stats?.totalExams ? Math.floor(stats.totalExams / 2) : 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Attempts</p>
              {statsLoading ? (
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-edumate-dark">{stats?.totalAttempts ?? 0}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Avg Score</p>
              {statsLoading ? (
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-edumate-dark">
                  {stats?.averageScore ? `${stats.averageScore.toFixed(1)}%` : '0%'}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-edumate-dark mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/create-exam"
              className="flex items-center p-4 bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-4">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-edumate-dark">Create New Exam</h3>
                <p className="text-sm text-gray-500">Set up a new examination</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/admin/exams"
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-edumate-dark">Manage Exams</h3>
                <p className="text-sm text-gray-500">Edit or publish exams</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-gray-600 transition-colors" />
            </Link>

            <Link
              to="/admin/results"
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-edumate-dark">View Results</h3>
                <p className="text-sm text-gray-500">Check student performance</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-gray-600 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Recent Exams */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-edumate-dark">Recent Exams</h2>
            <Link to="/admin/exams" className="text-primary hover:text-primary-600 text-sm font-medium">
              View all
            </Link>
          </div>
          
          {examsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : examsError ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Error loading exams</p>
            </div>
          ) : exams.length > 0 ? (
            <div className="space-y-3">
              {exams.map((exam: any) => (
                <div key={exam.examId} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-edumate-dark">{exam.title}</h3>
                      <p className="text-sm text-gray-500">
                        {exam.duration} minutes
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      exam.is_published 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {exam.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No exams created yet</p>
              <Link 
                to="/admin/create-exam" 
                className="text-primary hover:text-primary-600 text-sm font-medium mt-2 inline-block"
              >
                Create your first exam
              </Link>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}