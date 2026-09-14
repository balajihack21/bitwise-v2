export enum ViewState {
  HOME = 'HOME',
  COURSES = 'COURSES',
  PLAYGROUND = 'PLAYGROUND',
  PROGRESS = 'PROGRESS',
  ABOUT = 'ABOUT',
  AUTH = 'AUTH',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR'
}

export type SupportedLanguage = 'en' | 'ta' | 'te' | 'hi' | 'es' | 'fr';

export interface CourseInstructorAssignment {
  courseId: string;
  instructorId: string;
  instructorEmail?: string;
  assignedAt: string;
}

export interface User {
  username: string;
  role: 'student' | 'admin' | 'instructor';
  email?: string;
  uid?: string;
  assignedCourseIds?: string[];
  courseInstructorAssignments?: CourseInstructorAssignment[];
  regNo?: string;
  dob?: string;
  section?: string;
  dept?: string;
  year?: string;
}

export interface InstructorAccount {
  uid: string;
  email: string;
  name: string;
  assignedCourseIds: string[];
  createdAt?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  explanation?: string;
}

export interface ProblemMetadata {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  points?: number;
  testCases: TestCase[];
  starterTemplates?: Record<string, string>;
  solutionCode?: Record<string, string>;
  constraints?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  hints?: string[];
  acceptanceRate?: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'article' | 'problem';
  isPro?: boolean;
  content?: string;
  codeSnippet?: string;
  language?: string;
  problem?: ProblemMetadata;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  startDate?: string;
  endDate?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: string;
  modules: Module[];
  tags: string[];
  isLive?: boolean; // Flag for Live courses
  isPro?: boolean; // Flag for Paid/Pro courses
  assignedInstructors?: { uid: string; email: string; name: string }[];
  assignedInstructorEmail?: string;
  assignedInstructorName?: string;
  assignedInstructorId?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface TestCaseResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  time?: string;
  memory?: string;
  isHidden?: boolean;
  statusDescription?: string;
}

export interface CourseProgressDetail {
  courseId: string;
  courseTitle: string;
  level: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  problemsSolved: number;
  totalProblems: number;
  isCompleted: boolean;
  isEnrolled: boolean;
}

export type ProctorStatus = 'CLEAN' | 'WARNING' | 'FLAGGED' | 'EXCUSED';

export interface ProctorLogEntry {
  id: string;
  timestamp: string;
  type: 'tab_switch' | 'focus_loss' | 'exit_attempt' | 'admin_mark';
  details?: string;
  problemTitle?: string;
}

export interface SubmissionRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  courseId: string;
  courseTitle?: string;
  language: string;
  code: string;
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  passedTests: number;
  totalTests: number;
  executionTime?: string;
  memory?: string;
  timestamp: string;
  testResults?: TestCaseResult[];
  tabSwitchesDuringTest?: number;
  proctorFlag?: ProctorStatus;
  proctorNote?: string;
}

export interface UserProgress {
  completedLessonIds: string[];
  unlockedLessonIds: string[];
  submissions: SubmissionRecord[];
  xp: number;
  streakDays: number;
  lastActiveDate: string;
  tabSwitchCount?: number;
  focusLossCount?: number;
  testExitAttempts?: number;
  proctorStatus?: ProctorStatus;
  proctorNotes?: string;
  proctorReviewedAt?: string;
  proctorReviewedBy?: string;
}

export interface Judge0Config {
  apiUrl: string;
  apiKey?: string;
  useRapidApi: boolean;
  mode: 'judge0-free' | 'judge0-custom' | 'ai-fallback';
}