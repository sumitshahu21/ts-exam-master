import { useState } from 'react';
import { Code, Play, RotateCcw } from 'lucide-react';
import type { Question } from '../../types';

interface CodeQuestionProps {
  question: Question;
  onAnswerChange: (code: string) => void;
}

export default function CodeQuestion({ question, onAnswerChange }: CodeQuestionProps) {
  const [code, setCode] = useState(question.codeTemplate || '');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onAnswerChange(newCode);
  };

  const resetCode = () => {
    const template = question.codeTemplate || '';
    setCode(template);
    onAnswerChange(template);
    setOutput('');
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');
    
    // Simulate code execution
    setTimeout(() => {
      setOutput('// Code execution simulated\n// In a real implementation, this would execute the code\nconsole.log("Hello, World!");');
      setIsRunning(false);
    }, 1000);
  };

  const getLanguageDisplay = () => {
    const languages: Record<string, string> = {
      javascript: 'JavaScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      csharp: 'C#',
    };
    return languages[question.programmingLanguage || 'javascript'] || 'JavaScript';
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{question.question}</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Points: {question.points}</span>
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">{getLanguageDisplay()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={resetCode}
              className="flex items-center px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </button>
            <button
              type="button"
              onClick={runCode}
              disabled={isRunning}
              className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-3 w-3 mr-1" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Code
          </label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-80 p-4 font-mono text-sm border-0 focus:ring-0 focus:outline-none resize-none"
              placeholder={`// Write your ${getLanguageDisplay()} code here...`}
              spellCheck={false}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Use the editor above to write your solution. You can run your code to test it.
          </p>
        </div>

        {/* Output Panel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Output
          </label>
          <div className="border border-gray-300 rounded-lg bg-gray-50">
            <pre className="w-full h-80 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
              {output || '// Click "Run" to execute your code\n// Output will appear here'}
            </pre>
          </div>
          {output && (
            <p className="mt-2 text-xs text-green-600">
              ✓ Code executed successfully
            </p>
          )}
        </div>
      </div>

      {question.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Instructions:</h4>
          <p className="text-sm text-blue-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
