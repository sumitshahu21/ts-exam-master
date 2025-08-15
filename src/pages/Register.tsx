import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff, Users, Award, Target, BookCheck, UserPlus, Shield, CheckCircle, Lock, UserCheck } from 'lucide-react';
import OTPVerification from '../components/auth/OTPVerification';
import { toast } from 'react-hot-toast';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['student', 'admin'] as const),
  adminCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.role === 'admin' && (!data.adminCode || data.adminCode.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Admin invite code is required for administrator accounts',
  path: ['adminCode'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationStep, setRegistrationStep] = useState<'form' | 'otp'>('form');
  const [registrationData, setRegistrationData] = useState<any>(null);
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
    },
  });

  // Watch the selected role to show/hide admin code field
  const selectedRole = watch('role');

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin' : '/student');
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { confirmPassword, ...registerData } = data;
      // Send OTP to email instead of creating account immediately
      const response = await authService.register(registerData);
      
      if (response.message === 'Registration initiated. Please check your email for OTP verification.' || response.message === 'OTP sent to email') {
        setRegistrationData(registerData);
        setRegistrationStep('otp');
        toast.success('OTP sent to your email! Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSuccess = (user: any, token: string) => {
    authService.saveAuth(user, token);
    login(user);
    toast.success('Registration successful! Welcome to ExamMaster.');
    navigate(user.role === 'admin' ? '/admin' : '/student');
  };

  const handleBackToForm = () => {
    setRegistrationStep('form');
    setRegistrationData(null);
    setError(null);
  };

  // Show OTP verification screen
  if (registrationStep === 'otp' && registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex">
        {/* Left Side - Educational Content */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center p-12 text-white">
            <div className="space-y-8">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <UserPlus className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">ExamMaster</h1>
                    <p className="text-blue-100">Email Verification</p>
                  </div>
                </div>
                <h2 className="text-4xl font-bold mb-4">
                  Almost There!
                </h2>
                <p className="text-xl text-blue-100 mb-8">
                  We've sent a verification code to your email. Please check your inbox and enter the 6-digit code to complete your registration.
                </p>
              </div>

              {/* Security Features */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Secure Registration Process
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span>Email verification required</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Lock className="h-5 w-5 text-blue-300" />
                    <span>Encrypted data transmission</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <UserCheck className="h-5 w-5 text-purple-300" />
                    <span>Account protection enabled</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-sm text-blue-100">Email Delivery</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                    <div className="text-2xl font-bold">10min</div>
                    <div className="text-sm text-blue-100">Code Validity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - OTP Verification Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <OTPVerification
              email={registrationData.email}
              onVerificationSuccess={handleOTPSuccess}
              onBack={handleBackToForm}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex">
      {/* Left Side - Educational Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 relative overflow-hidden">
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
                <UserPlus className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Join ExamMaster</h1>
                <p className="text-purple-100 text-lg">Start Your Learning Journey</p>
              </div>
            </div>
            <p className="text-xl text-purple-100 leading-relaxed">
              Create your account and unlock the power of modern assessment technology. Join thousands of learners worldwide.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center mb-3">
                <Shield className="h-8 w-8 text-green-200 mr-3" />
                <h3 className="text-lg font-semibold">Secure & Reliable</h3>
              </div>
              <p className="text-purple-100 text-sm">
                Your data is protected with enterprise-grade security. Take exams with confidence knowing your privacy is our priority.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center mb-3">
                <BookCheck className="h-8 w-8 text-blue-200 mr-3" />
                <h3 className="text-lg font-semibold">Comprehensive Testing</h3>
              </div>
              <p className="text-purple-100 text-sm">
                Access a wide variety of question types including multiple choice, drag & drop, case studies, and more.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center mb-3">
                <Target className="h-8 w-8 text-yellow-200 mr-3" />
                <h3 className="text-lg font-semibold">Track Your Progress</h3>
              </div>
              <p className="text-purple-100 text-sm">
                Monitor your performance with detailed analytics and insights to improve your learning outcomes.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <Users className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-2xl font-bold">50K+</div>
              <div className="text-purple-200 text-sm">Active Users</div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2">
                <Award className="h-8 w-8 text-yellow-300" />
              </div>
              <div className="text-2xl font-bold">95%</div>
              <div className="text-purple-200 text-sm">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
            {/* Header Section */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <UserPlus className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">Create Account</h2>
                <p className="mt-2 text-indigo-100">
                  Join ExamMaster to start your learning journey
                </p>
              </div>
            </div>

            {/* Form Section */}
            <div className="px-8 py-6">
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    {...register('role')}
                  >
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                {/* Admin Code Field - Only show when admin role is selected */}
                {selectedRole === 'admin' && (
                  <div>
                    <label htmlFor="adminCode" className="block text-sm font-medium text-gray-700">
                      Admin Invite Code
                    </label>
                    <input
                      id="adminCode"
                      type="text"
                      placeholder="Enter your admin invite code"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      {...register('adminCode')}
                    />
                    {errors.adminCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.adminCode.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      You need a valid admin invite code to create an administrator account.
                    </p>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? 'Sending OTP...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer Section */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Sign in
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
