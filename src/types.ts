export type AWSExamType = 'CLF-C02' | 'AIF-C01';

export interface ExamDomain {
  id: string;
  name: string;
  percentage: number;
  description: string;
  topics: string[];
}

export interface AWSQuestion {
  id: string;
  examType: AWSExamType;
  domainId: string; // references domain id
  scenario: string; // realistic scenario
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  referenceSyllabusSection: string;
  isAIGenerated?: boolean;
  modelUsed?: string;
}

export interface Flashcard {
  id: string;
  examType: AWSExamType;
  domainId: string;
  term: string;
  definition: string;
  explanation: string;
}

export interface StudyNote {
  id: string;
  examType: AWSExamType;
  domainId: string;
  topic: string;
  content: string;
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  examType: AWSExamType;
  score: number;
  total: number;
  timeTakenSeconds: number;
  date: string;
  answers: Record<string, { selectedIndex: number; isCorrect: boolean }>;
}

export interface UserState {
  aiCredits: number;
  totalCredits: number;
  bookmarks: string[]; // Question IDs
  wrongAnswersHistory: string[]; // Question IDs for the Review Center
  answers: Record<string, { selectedIndex: number; isCorrect: boolean; timestamp: string }>;
  notes: StudyNote[];
  attempts: ExamAttempt[];
  examType: AWSExamType;
  selectedDomainId: string | 'all';
  subscriptionStatus?: 'free' | 'pro' | 'enterprise';
  isDevModeEnabled?: boolean;
  simulate503?: boolean;
}
