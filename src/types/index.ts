export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  profilePhoto?: string;
  createdAt: Date;
}

export interface Question {
  id: string;
  type: 'single-choice' | 'multiple-choice' | 'drag-drop' | 'case-study' | 'short-answer' | 'code';
  question: string;
  options?: string[];
  correctAnswers: (string | number)[];
  points: number;
  explanation?: string;
  caseStudyText?: string;
  subQuestions?: Question[];
  dragDropItems?: DragDropItem[];
  dragDropTargets?: DragDropTarget[];
  // Short answer fields
  expectedAnswer?: string;
  gradingRubric?: string;
  // Code question fields
  programmingLanguage?: string;
  codeTemplate?: string;
  expectedSolution?: string;
  testCases?: string;
}

export interface DragDropItem {
  id: string;
  content: string;
}

export interface DragDropTarget {
  id: string;
  content: string;
  correctItemId?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  description?: string;
  duration: number; // in minutes
  questions: Question[];
  startTime?: Date;
  endTime?: Date;
  isPublished: boolean;
  allowMultipleAttempts: boolean;
  randomizeQuestions: boolean;
  assignedStudents: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestAttempt {
  id: string;
  examId: string;
  studentId: string;
  answers: Answer[];
  startedAt: Date;
  submittedAt?: Date;
  score?: number;
  status: 'in-progress' | 'completed' | 'timeout';
  timeRemaining?: number;
}

export interface Answer {
  questionId: string;
  selectedAnswers: string[] | number[];
  textAnswer?: string;
  isMarkedForReview: boolean;
}

export interface StudentResult {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpent: number;
  submittedAt: Date;
  answers: Answer[];
}
