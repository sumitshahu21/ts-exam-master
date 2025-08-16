import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { KeyRound, Mail, ArrowLeft, Shield, Lock, CheckCircle, Clock } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmail(data.email);
        setEmailSent(true);
        toast.success('Password reset instructions sent to your email!');
      } else {
        toast.error(result.message || 'Failed to send reset instructions');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToReset = () => {
    navigate('/reset-password', { state: { email } });
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex">
        {/* Left Side - Educational Content */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 relative overflow-hidden">
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
                    <Mail className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">ExamMaster</h1>
                    <p className="text-green-100">Email Sent Successfully</p>
                  </div>
                </div>
                <h2 className="text-4xl font-bold mb-4">
                  Check Your Inbox!
                </h2>
                <p className="text-xl text-green-100 mb-8">
                  We've sent password reset instructions to your email. Follow the link or use the verification code to reset your password securely.
                </p>
              </div>

              {/* Security Features */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Secure Reset Process
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <CheckCircle className="h-5 w-5 text-green-300" />
                    <span>Email verification required</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Clock className="h-5 w-5 text-blue-300" />
                    <span>Time-limited reset code</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Lock className="h-5 w-5 text-purple-300" />
                    <span>Encrypted transmission</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <h4 className="font-semibold mb-2">What to do next:</h4>
                <ul className="space-y-1 text-sm text-green-100">
                  <li>• Check your email inbox</li>
                  <li>• Look for a 6-digit verification code</li>
                  <li>• Code expires in 10 minutes</li>
                  <li>• Check spam folder if needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Email Sent Confirmation */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Mail className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Check Your Email</h2>
              <p className="mt-2 text-sm text-gray-600">
                We've sent password reset instructions to
              </p>
              <p className="mt-1 text-sm font-medium text-blue-600">{email}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">What's next?</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Check your email inbox for a 6-digit verification code</li>
                    <li>• The code will expire in 10 minutes</li>
                    <li>• Don't forget to check your spam folder</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleProceedToReset}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                I Have the Code - Reset Password
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the email?{' '}
                  <button
                    onClick={() => onSubmit({ email })}
                    disabled={isLoading}
                    className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                  >
                    Resend Instructions
                  </button>
                </p>
              </div>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex">
      {/* Left Side - Educational Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 relative overflow-hidden">
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
                  <KeyRound className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">ExamMaster</h1>
                  <p className="text-orange-100">Password Recovery</p>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4">
                Forgot Your Password?
              </h2>
              <p className="text-xl text-orange-100 mb-8">
                No worries! It happens to everyone. Enter your email address and we'll send you secure instructions to reset your password.
              </p>
            </div>

            {/* Security Features */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Secure Recovery Process
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Mail className="h-5 w-5 text-blue-300" />
                  <span>Email verification required</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Clock className="h-5 w-5 text-green-300" />
                  <span>Time-limited reset codes</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Lock className="h-5 w-5 text-purple-300" />
                  <span>Encrypted data protection</span>
                </div>
              </div>
            </div>

            {/* Recovery Stats */}
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold">2min</div>
                  <div className="text-sm text-orange-100">Avg Recovery Time</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-orange-100">Secure Process</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Password Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <KeyRound className="h-12 w-12 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Forgot Password?</h2>
            <p className="mt-2 text-sm text-gray-600">
              No worries! Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your email address"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Instructions...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reset Instructions
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
