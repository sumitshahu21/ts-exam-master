import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import AuthProvider from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentDashboard from './pages/student/StudentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import InteractiveExamInterface from './pages/student/InteractiveExamInterface';
import MyResults from './pages/student/MyResults';
import ExamCreator from './pages/admin/ExamCreator';
import ManageExams from './pages/admin/ManageExams';
import EditExam from './pages/admin/EditExam';
import StudentResults from './pages/admin/StudentResults';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import TestPage from './pages/TestPage';

function App() {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/test" element={<TestPage />} />
                
                {/* Student routes */}
                <Route 
                  path="/student/*" 
                element={
                  <ProtectedRoute role="student">
                    <Layout role="student">
                      <Routes>
                        <Route index element={<StudentDashboard />} />
                        <Route path="dashboard" element={<StudentDashboard />} />
                        <Route path="results" element={<MyResults />} />
                        <Route path="exam/:examId" element={<InteractiveExamInterface />} />
                        <Route path="test/:testId" element={<InteractiveExamInterface />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute role="admin">
                    <Layout role="admin">
                      <Routes>
                        <Route index element={<AdminDashboard />} />
                        <Route path="exams" element={<ManageExams />} />
                        <Route path="exams/create" element={<ExamCreator />} />
                        <Route path="exams/:examId/edit" element={<EditExam />} />
                        <Route path="create-exam" element={<ExamCreator />} />
                        <Route path="edit-exam/:examId" element={<ExamCreator />} />
                        <Route path="results" element={<StudentResults />} />
                        <Route path="results/:examId" element={<StudentResults />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </Provider>
    </ErrorBoundary>
  );
}

export default App;
