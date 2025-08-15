import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  BookOpen,
  Timer,
  Award,
  RotateCcw
} from 'lucide-react';

interface ExamStatus {
  examId: number;
  examTitle: string;
  subject: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  isPublished: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  allowMultipleAttempts: boolean;
  status: 'available' | 'not_started' | 'in_progress' | 'completed' | 'ended' | 'retake_available' | 'unpublished';
  canStart: boolean;
  statusMessage: string;
  statusColor: 'green' | 'blue' | 'orange' | 'red' | 'gray';
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

interface EnhancedExamCardProps {
  examStatus: ExamStatus;
  onStartExam: (examId: number) => void;
  onResumeExam: (examId: number) => void;
}

const EnhancedExamCard: React.FC<EnhancedExamCardProps> = ({ 
  examStatus, 
  onStartExam, 
  onResumeExam 
}) => {
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [timeUntilEnd, setTimeUntilEnd] = useState<string>('');

  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      
      if (examStatus.scheduledStart) {
        const startTime = new Date(examStatus.scheduledStart);
        if (startTime > now) {
          const diff = startTime.getTime() - now.getTime();
          setTimeUntilStart(formatDuration(diff));
        }
      }
      
      if (examStatus.scheduledEnd) {
        const endTime = new Date(examStatus.scheduledEnd);
        if (endTime > now) {
          const diff = endTime.getTime() - now.getTime();
          setTimeUntilEnd(formatDuration(diff));
        }
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [examStatus.scheduledStart, examStatus.scheduledEnd]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusIcon = () => {
    switch (examStatus.status) {
      case 'available':
      case 'retake_available':
        return <Play className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Pause className="h-5 w-5 text-orange-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'ended':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'not_started':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'unpublished':
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = () => {
    switch (examStatus.statusColor) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'gray': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionButton = () => {
    if (!examStatus.canStart) {
      return (
        <button
          disabled
          className="w-full px-4 py-3 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
        >
          {getStatusIcon()}
          {examStatus.statusMessage}
        </button>
      );
    }

    if (examStatus.status === 'in_progress') {
      return (
        <button
          onClick={() => onResumeExam(examStatus.examId)}
          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Pause className="h-4 w-4" />
          Resume Test
        </button>
      );
    }

    if (examStatus.status === 'retake_available') {
      return (
        <button
          onClick={() => onStartExam(examStatus.examId)}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <RotateCcw className="h-4 w-4" />
          Retake Test
        </button>
      );
    }

    return (
      <button
        onClick={() => onStartExam(examStatus.examId)}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Play className="h-4 w-4" />
        Start Test
      </button>
    );
  };

  const getLatestAttemptInfo = () => {
    if (examStatus.attempts.length === 0) return null;
    
    const latest = examStatus.attempts[0];
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Latest Attempt
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-600">Status: </span>
            <span className={`font-medium ${
              latest.status === 'completed' ? 'text-blue-600' :
              latest.status === 'in_progress' ? 'text-orange-600' :
              latest.status === 'ended' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {latest.status === 'completed' && latest.isAutoExpired ? 'Time Expired' :
               latest.status === 'ended' && latest.isAutoEnded ? 'Schedule Ended' :
               latest.status.charAt(0).toUpperCase() + latest.status.slice(1)}
            </span>
          </div>
          {latest.score !== null && (
            <div>
              <span className="text-gray-600">Score: </span>
              <span className="font-medium text-blue-600">
                {latest.score}/{examStatus.totalMarks} ({latest.percentage}%)
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Date: </span>
            <span className="font-medium">
              {new Date(latest.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Time: </span>
            <span className="font-medium">
              {new Date(latest.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {examStatus.examTitle}
          </h3>
          <p className="text-gray-600 text-sm">
            {examStatus.subject}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor()}`}>
          {examStatus.statusMessage}
        </div>
      </div>

      {/* Exam Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Timer className="h-4 w-4" />
          <span>{examStatus.duration} minutes</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Award className="h-4 w-4" />
          <span>{examStatus.totalMarks} marks</span>
        </div>
      </div>

      {/* Schedule Information */}
      {(examStatus.scheduledStart || examStatus.scheduledEnd) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </div>
          {examStatus.scheduledStart && (
            <div className="text-xs text-blue-700">
              <strong>Starts:</strong> {new Date(examStatus.scheduledStart).toLocaleString()}
              {timeUntilStart && examStatus.status === 'not_started' && (
                <span className="ml-2 font-medium">({timeUntilStart} remaining)</span>
              )}
            </div>
          )}
          {examStatus.scheduledEnd && (
            <div className="text-xs text-blue-700 mt-1">
              <strong>Ends:</strong> {new Date(examStatus.scheduledEnd).toLocaleString()}
              {timeUntilEnd && examStatus.status !== 'ended' && (
                <span className="ml-2 font-medium">({timeUntilEnd} remaining)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Attempt History Badge */}
      {examStatus.attempts.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Attempts: {examStatus.attempts.length}
          </span>
          {examStatus.allowMultipleAttempts && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              Multiple attempts allowed
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      {getActionButton()}

      {/* Latest Attempt Info */}
      {getLatestAttemptInfo()}
    </div>
  );
};

export default EnhancedExamCard;
