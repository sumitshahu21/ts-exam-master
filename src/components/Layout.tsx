import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  BarChart3,
  PlusCircle,
  FileText,
  Clock
} from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
  role: 'student' | 'admin';
}

export default function Layout({ children, role }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  const studentNavItems = [
    { label: 'Dashboard', href: '/student', icon: BookOpen },
    { label: 'My Results', href: '/student/results', icon: BarChart3 },
    { label: 'Settings', href: '/student/settings', icon: Settings },
  ];

  const adminNavItems = [
    { label: 'Dashboard', href: '/admin', icon: BarChart3 },
    { label: 'Create Exam', href: '/admin/create-exam', icon: PlusCircle },
    { label: 'Manage Exams', href: '/admin/exams', icon: FileText },
    { label: 'Student Results', href: '/admin/results', icon: Clock },
  ];

  const navItems = role === 'student' ? studentNavItems : adminNavItems;

  return (
    <div className="flex h-screen bg-light-gray font-nunito">
      {/* EduMate Style Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-dark">ExamMaster</h2>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-dark hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="mt-6 px-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-dark rounded-xl transition-all duration-200 group font-medium"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center mb-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold text-dark">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200 group font-medium"
          >
            <LogOut className="h-4 w-4 mr-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-gray-100 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:text-dark hover:bg-gray-50 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold text-dark">ExamMaster</h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-light-gray">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
