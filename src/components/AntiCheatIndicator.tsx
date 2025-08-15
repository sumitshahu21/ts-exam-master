import { Shield, AlertTriangle, Eye, Lock, Maximize } from 'lucide-react';
import type { AntiCheatEvent } from '../hooks/useAntiCheat';

interface AntiCheatIndicatorProps {
  isActive: boolean;
  isFullScreen: boolean;
  violationCount: number;
  maxViolations: number;
  warningThreshold: number;
  isExamLocked: boolean;
  violations: AntiCheatEvent[];
  onForceFullScreen: () => void;
}

export default function AntiCheatIndicator({
  isActive,
  isFullScreen,
  violationCount,
  maxViolations,
  warningThreshold,
  isExamLocked,
  violations,
  onForceFullScreen
}: AntiCheatIndicatorProps) {
  if (!isActive) return null;

  const getStatusColor = () => {
    if (isExamLocked) return 'text-red-600 bg-red-50 border-red-200';
    if (violationCount >= warningThreshold) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (!isFullScreen) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (isExamLocked) return <Lock className="w-4 h-4" />;
    if (violationCount >= warningThreshold) return <AlertTriangle className="w-4 h-4" />;
    if (!isFullScreen) return <Maximize className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isExamLocked) return 'Exam Locked';
    if (!isFullScreen) return 'Not in Fullscreen';
    if (violationCount > 0) return `${violationCount}/${maxViolations} Violations`;
    return 'Secure Mode Active';
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Main Status Indicator */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        <Eye className="w-4 h-4" />
      </div>

      {/* Fullscreen Warning */}
      {!isFullScreen && !isExamLocked && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span className="text-yellow-800">Please return to fullscreen</span>
            <button
              onClick={onForceFullScreen}
              className="ml-2 px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
            >
              <Maximize className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Critical Warning */}
      {violationCount >= warningThreshold && !isExamLocked && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Security Alert!</span>
          </div>
          <p className="mt-1 text-red-700">
            {maxViolations - violationCount} more violation(s) will result in automatic submission.
          </p>
        </div>
      )}

      {/* Exam Locked Warning */}
      {isExamLocked && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-sm">
          <div className="flex items-center space-x-2 text-red-800">
            <Lock className="w-4 h-4" />
            <span className="font-bold">Exam Locked</span>
          </div>
          <p className="mt-1 text-red-700">
            Maximum security violations reached. Contact administrator to unlock.
          </p>
        </div>
      )}

      {/* Violation Log (for debugging/admin) */}
      {process.env.NODE_ENV === 'development' && violations.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs max-w-xs">
          <div className="font-medium text-gray-700 mb-1">Recent Violations:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {violations.slice(-5).map((violation, index) => (
              <div key={index} className="text-gray-600">
                <span className="font-mono">{violation.timestamp.toLocaleTimeString()}</span>
                {' - '}
                <span className="capitalize">{violation.type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Security Guidelines Modal
interface SecurityGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExam: () => void;
}

export function SecurityGuidelinesModal({ isOpen, onClose, onStartExam }: SecurityGuidelinesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl mx-4 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Exam Security Guidelines</h2>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">🔒 Security Requirements</h3>
            <ul className="space-y-1 ml-4">
              <li>• The exam will run in <strong>full screen mode</strong> for security</li>
              <li>• Switching tabs or applications is <strong>strictly prohibited</strong></li>
              <li>• Right-click and keyboard shortcuts are disabled</li>
              <li>• Copy/paste operations are blocked</li>
              <li>• Developer tools access is monitored</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">⚠️ Violation Policy</h3>
            <ul className="space-y-1 ml-4">
              <li>• <strong>3 violations:</strong> Warning message</li>
              <li>• <strong>5 violations:</strong> Automatic exam submission</li>
              <li>• All activities are logged and monitored</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">📋 Permitted Actions</h3>
            <ul className="space-y-1 ml-4">
              <li>• Navigate between questions using provided buttons</li>
              <li>• Mark questions for review</li>
              <li>• Type answers in text fields</li>
              <li>• Use drag-and-drop interactions</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Important:</span>
            </div>
            <p className="text-yellow-700 mt-1">
              Once you start the exam, you must remain in full screen mode. 
              Any attempt to exit or switch applications will be recorded as a violation.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onStartExam}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>I Understand - Start Secure Exam</span>
          </button>
        </div>
      </div>
    </div>
  );
}
