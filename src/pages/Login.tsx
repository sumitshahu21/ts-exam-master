import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, AlertCircle, Eye, EyeOff, Mail, Users, Award, Target, TrendingUp, CheckCircle, BookCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin' : '/student');
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔑 Attempting login with backend...');
      const response = await authService.login(data);
      console.log('✅ Backend login successful:', response.user);
      
      authService.saveAuth(response.user, response.token);
      login(response.user);
      navigate(response.user.role === 'admin' ? '/admin' : '/student');
    } catch (err: any) {
      console.warn('❌ Backend login failed:', err.message);
      
      // If backend is not available, allow demo login
      console.warn('🔄 Falling back to demo login');
      
      // Demo admin user
      if (data.email === 'admin@demo.com' && data.password === 'admin') {
        const demoUser = {
          id: 1,
          email: 'admin@demo.com',
          firstName: 'Demo',
          lastName: 'Admin',
          role: 'admin' as const
        };
        
        // Create a demo JWT token for testing
        const demoToken = 'demo-jwt-token-for-testing';
        localStorage.setItem('authToken', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        login(demoUser);
        navigate('/admin');
        return;
      }
      
      // Demo student user
      if (data.email === 'student@demo.com' && data.password === 'student') {
        const demoUser = {
          id: 2,
          email: 'student@demo.com', 
          firstName: 'Demo',
          lastName: 'Student',
          role: 'student' as const
        };
        
        // Create a demo JWT token for testing
        const demoToken = 'demo-jwt-token-for-testing';
        localStorage.setItem('authToken', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        login(demoUser);
        navigate('/student');
        return;
      }
      
      // Show error for invalid credentials
      if (err.response?.status === 401) {
        setError('Invalid email or password. Try: admin@demo.com/admin or student@demo.com/student');
      } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('Cannot connect to server. Using demo mode. Try: admin@demo.com/admin or student@demo.com/student');
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex">
      {/* Left Side - Educational Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          {/* Main Brand Section */}
          <div className="mb-12">
            <div className="flex items-center mb-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl mr-4">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">ExamMaster</h1>
                <p className="text-blue-100 text-lg">Professional Testing Platform</p>
              </div>
            </div>
            <p className="text-xl text-blue-100 leading-relaxed">
              Empowering educators and students with comprehensive assessment tools for academic excellence.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center mb-3">
                <Users className="h-8 w-8 text-blue-200 mr-3" />
                <h3 className="text-lg font-semibold">For Students</h3>
              </div>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Interactive Exams
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Real-time Results
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Progress Tracking
                </li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center mb-3">
                <BookCheck className="h-8 w-8 text-purple-200 mr-3" />
                <h3 className="text-lg font-semibold">For Educators</h3>
              </div>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Exam Creation Tools
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Analytics Dashboard
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Student Management
                </li>
              </ul>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <Award className="h-8 w-8 text-yellow-300" />
              </div>
              <div className="text-2xl font-bold">98%</div>
              <div className="text-blue-200 text-sm">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <Target className="h-8 w-8 text-green-300" />
              </div>
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-blue-200 text-sm">Students</div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-2xl font-bold">1M+</div>
              <div className="text-blue-200 text-sm">Tests Taken</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
          {/* Header Section */}
          <div className="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className="mt-2 text-blue-100">
                Sign in to your account to continue
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-6">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Login Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter your email"
                    />
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Footer Section */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign up now
                </Link>
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
