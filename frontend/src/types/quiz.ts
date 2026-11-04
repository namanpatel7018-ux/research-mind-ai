/**
 * Shared Quiz Types
 */

export interface InteractiveQuizQuestion {
  id?: number | string;
  subtitle?: string;
  question: string;
  options: string[];
  correctAnswerIndex?: number;
  correct?: string;
  marks?: number;
  explanation: string;
}

export interface QuizSubmissionResponse {
  status: string;
  message: string;
  submissionId: string;
  userId: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  topic: string;
  timeSpentSeconds: number;
  createdAt: string;
}

export interface QuizHistoryItem {
  id: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  topic: string;
  time_spent_seconds: number;
  created_at: string;
}
