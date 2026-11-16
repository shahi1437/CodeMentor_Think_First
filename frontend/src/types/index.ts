export type Role = 'student' | 'teacher' | 'admin';

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export type ProblemMode = 'normal' | 'debugging';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean; // false = hidden grading test
  description?: string;
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  category: string;
  mode: ProblemMode;
  tags: string[];
  acceptanceRate: number;
  description: string;
  starterCode: {
    python: string;
    javascript: string;
    cpp: string;
  };
  sampleTestCases: TestCase[];
  // Debugging specific fields
  bugScenario?: {
    symptom: string;
    failingInput: string;
    actualOutput: string;
    expectedOutput: string;
    buggyLinesHint: string;
    hintTiers: string[];
  };
}

export interface DiagnosticQuestion {
  id: string;
  category: 'Syntax & Types' | 'Algorithmic Logic' | 'Bug Diagnosis' | 'Time Complexity';
  question: string;
  codeSnippet?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface LearningDNAProfile {
  studentId: string;
  studentName: string;
  overallMastery: number; // 0 - 100
  totalProblemsSolved: number;
  totalBugsDiagnosed: number;
  streakDays: number;
  errorArchetypes: {
    category: string;
    frequency: number; // percentage
    description: string;
    trend: 'improving' | 'stable' | 'needs_attention';
  }[];
  skillProficiency: {
    skill: string;
    level: number; // 0 - 100
    status: 'Mastered' | 'Proficient' | 'Learning' | 'Struggling';
  }[];
  recentGrowthAreas: string[];
}

export interface SubmissionRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  mode: ProblemMode;
  language: string;
  status: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Bug Found';
  runtimeMs: number;
  memoryMb: number;
  submittedAt: string;
  passedCount: number;
  totalCount: number;
}

export interface DailyTask {
  id: string;
  title: string;
  type: 'concept' | 'coding' | 'debugging' | 'quiz';
  estimatedMinutes: number;
  difficulty: ProblemDifficulty;
  completed: boolean;
  targetSkill: string;
  href: string;
}

export interface TeacherCohortMetric {
  id: string;
  courseName: string;
  totalStudents: number;
  activeToday: number;
  averageMastery: number;
  stuckStudentsCount: number;
  topClassErrors: { errorType: string; studentCount: number }[];
  strugglingStudents: {
    id: string;
    name: string;
    currentProblem: string;
    timeSpentMinutes: number;
    failedAttempts: number;
    recommendedIntervention: string;
  }[];
}
