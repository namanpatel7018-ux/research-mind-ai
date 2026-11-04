/**
 * api.ts — Axios instance + all API calls
 * -----------------------------------------
 * Features:
 *  - Centralised base URL
 *  - Request interceptor: attaches Bearer token
 *  - Response interceptor: on 401 clears token + fires global logout event
 *  - Typed wrappers for every backend endpoint
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, clearAuthToken } from './auth';

// ── Axios instance ────────────────────────────────────────────────────────────

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000,
});

// ── Request interceptor — always attach the latest token ─────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// ── Response interceptor — auto-logout on 401 ────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      // Broadcast so AuthContext can react without a circular import
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  },
);

// ── Helper — legacy manual token setter (kept for compatibility) ──────────────
export function setAPIAuthToken(token?: string): void {
  // No-op: request interceptor now reads the token dynamically.
  // Kept so callers don't break.
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CitationSource {
  document_id: string;
  document_name: string;
  page_number: number;
  section: string;
  chunk_id: string;
  evidence: string;
  bbox?: number[];
}

export interface RetrievalStats {
  total_chunks: number;
  retrieved_chunks: number;
  reranked_chunks: number;
  used_chunks: number;
  query_type: string;
  methods: string[];
}

export interface UsageStats {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
}

export interface UsedChunkDetail {
  chunk_id: string;
  document_name: string;
  page_number: number;
  section: string;
  score: number;
  text_snippet: string;
  bbox?: number[];
}

export interface UploadedFile {
  filename: string;
  size:     number;
  page_count?: number;
  chunk_count?: number;
  indexed?: boolean;
}

export interface ChatResponse {
  query:   string;
  answer:  string;
  sources: (CitationSource | string)[];
  retrieval?: RetrievalStats;
  usage?: UsageStats;
  used_chunks_detail?: UsedChunkDetail[];
  provider?: string;
  fallback_used?: boolean;
  conversation_id?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'ai';
  text: string;
  image?: string;
  mode?: string;
  provider?: string;
  sources?: CitationSource[];
  retrieval?: RetrievalStats;
  usage?: UsageStats;
  used_chunks_detail?: UsedChunkDetail[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  active_file?: string;
  mode?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
  messages?: ConversationMessage[];
}

export interface SummaryRecord {
  id: string;
  user_id: string;
  document_id: string;
  document_name: string;
  summary: string;
  created_at: string;
}

export interface ComparisonRecord {
  id: string;
  user_id: string;
  document_names: string[];
  comparison: string;
  created_at: string;
}

export type ComparisonHistoryItem = {
  id: string;
  document_ids: string[];
  result: string;
  created_at: string;
};

export interface PresentationRecord {
  id: string;
  user_id: string;
  topic: string;
  filename: string;
  source_document_id?: string;
  num_slides?: number;
  created_at: string;
}

export type PresentationHistoryItem = {
  id: string;
  title: string;
  num_slides: number;
  source_doc?: string;
  file_path?: string;
  created_at: string;
};

export interface LiteratureRecord {
  id: string;
  user_id: string;
  document_names: string[];
  review: string;
  created_at: string;
}

export type LiteratureHistoryItem = {
  id: string;
  topic?: string;
  document_ids: string[];
  result: string;
  created_at: string;
};

export type SummaryHistoryItem = SummaryRecord;

export interface ActivityRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  reference_id?: string;
  metadata?: any;
  created_at: string;
}

export interface UploadResponse {
  filename: string;
  status: string;
  page_count: number;
  chunk_count: number;
  character_count: number;
  token_count: number;
  processing_time_ms: number;
}

export interface OTPRequestResponse {
  message: string;
  email_sent?: boolean;
  email_error?: string | null;
}

// ── File library ──────────────────────────────────────────────────────────────

export async function listFiles(): Promise<UploadedFile[]> {
  const res = await api.get<{ files: UploadedFile[] }>('/ai/files');
  return res.data.files;
}

export async function uploadResearchFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/ai/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as UploadResponse;
}

export async function deleteDocument(filename: string): Promise<void> {
  await api.delete(`/ai/files/${encodeURIComponent(filename)}`);
}

export function getFileContentUrl(filename: string): string {
  return `${API_BASE_URL}/ai/files/${encodeURIComponent(filename)}/content`;
}

export async function getPageDetails(filename: string, pageNumber: number): Promise<{ page_number: number; text: string; blocks: any[] }> {
  const res = await api.get(`/ai/files/${encodeURIComponent(filename)}/page/${pageNumber}`);
  return res.data;
}

// ── Conversations & Chat ──────────────────────────────────────────────────────

export async function sendChat(
  prompt: string,
  filename?: string,
  filenames?: string[],
  recentHistory?: { role: string; text: string }[],
  conversationId?: string,
  mode: string = 'strict'
): Promise<ChatResponse> {
  const res = await api.post<ChatResponse>('/ai/chat', {
    prompt,
    filename,
    filenames,
    recent_history: recentHistory,
    conversation_id: conversationId,
    mode,
  });
  return res.data;
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await api.get<{ conversations: Conversation[] }>('/ai/conversations');
  return res.data.conversations;
}

export async function createConversation(title?: string, activeFile?: string, mode = 'strict'): Promise<Conversation> {
  const res = await api.post<Conversation>('/ai/conversations', {
    title,
    active_file: activeFile,
    mode,
  });
  return res.data;
}

export async function getConversation(convId: string): Promise<Conversation> {
  const res = await api.get<Conversation>(`/ai/conversations/${encodeURIComponent(convId)}`);
  return res.data;
}

export async function deleteConversation(convId: string): Promise<void> {
  await api.delete(`/ai/conversations/${encodeURIComponent(convId)}`);
}

// ── History Retrieval ─────────────────────────────────────────────────────────

export async function getSummaryHistory(): Promise<SummaryRecord[]> {
  const res = await api.get<{ summaries: SummaryRecord[] }>('/ai/history/summaries');
  return res.data.summaries;
}

export async function getComparisonHistory(): Promise<ComparisonRecord[]> {
  const res = await api.get<{ comparisons: ComparisonRecord[] }>('/ai/history/comparisons');
  return res.data.comparisons;
}

export async function getPresentationHistory(): Promise<PresentationRecord[]> {
  const res = await api.get<{ presentations: PresentationRecord[] }>('/ai/history/presentations');
  return res.data.presentations;
}

export async function getLiteratureHistory(): Promise<LiteratureRecord[]> {
  const res = await api.get<{ literature_reviews: LiteratureRecord[] }>('/ai/history/literature');
  return res.data.literature_reviews;
}

export async function getActivityHistory(): Promise<ActivityRecord[]> {
  const res = await api.get<{ activities: ActivityRecord[] }>('/ai/history/activities');
  return res.data.activities;
}

export interface UserSettings {
  user_id?: string;
  theme: string;
  response_style: string;
  default_mode: string;
  citation_display: string;
  notifications: boolean;
  auto_save: boolean;
}

export async function getUserSettings(): Promise<UserSettings> {
  const res = await api.get<any>('/auth/settings');
  return res.data?.settings || res.data;
}

export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const res = await api.patch<any>('/auth/settings', settings);
  return res.data?.settings || res.data;
}

export interface SavedAnswer {
  id: string;
  user_id: string;
  conversation_id?: string;
  message_id?: string;
  title: string;
  content: string;
  sources: CitationSource[];
  created_at: string;
}

export async function getSavedAnswers(): Promise<SavedAnswer[]> {
  const res = await api.get<{ saved_answers: SavedAnswer[] }>('/ai/saved-answers');
  return res.data.saved_answers;
}

export async function saveAnswer(data: {
  title: string;
  content: string;
  conversation_id?: string;
  message_id?: string;
  sources?: any[];
}): Promise<SavedAnswer> {
  const res = await api.post<{ status: string; saved_answer: SavedAnswer }>('/ai/saved-answers', data);
  return res.data.saved_answer;
}

export async function deleteSavedAnswer(id: string): Promise<void> {
  await api.delete(`/ai/saved-answers/${id}`);
}

export async function summarizeFile(filename: string, focus?: string, custom_prompt?: string) {
  const res = await api.post('/ai/summarize', { filename, focus, custom_prompt });
  return res.data as { id?: string; filename: string; summary: string; focus?: string };
}

export async function generateLiteratureReview(filenames?: string[], topic?: string) {
  const res = await api.post<{ id?: string; filenames: string[]; review: string }>('/ai/literature-review', { filenames, topic });
  return res.data;
}

export async function compareFiles(filenames: string[]) {
  const res = await api.post('/ai/compare', { filenames });
  return res.data as { id?: string; filenames: string[]; comparison: string };
}

export async function convertToPPT(topic: string, filename?: string, numSlides = 8, content?: string): Promise<Blob> {
  const res = await api.post(
    '/ai/convert-to-ppt',
    { topic, filename, num_slides: numSlides, content },
    { responseType: 'blob' },
  );
  return res.data as Blob;
}

export async function generateQuiz(
  topic: string, filename?: string, numQuestions = 10, includeAnswers = false,
): Promise<Blob> {
  const res = await api.post(
    '/ai/generate-quiz',
    { topic, filename, num_questions: numQuestions, include_answers: includeAnswers },
    { responseType: 'blob' },
  );
  return res.data as Blob;
}

export interface QuizQuestion {
  subtitle:    string;
  question:    string;
  options:     string[];   // exactly 4 items, no labels
  correct:     string;     // "A" | "B" | "C" | "D"
  explanation: string;
}

export interface QuizData {
  title:     string;
  questions: QuizQuestion[];
}

export async function generateQuizJSON(
  topic: string,
  filename?: string,
  numQuestions = 10,
): Promise<QuizData> {
  const res = await api.post<QuizData>('/ai/generate-quiz-json', {
    topic,
    filename,
    num_questions: numQuestions,
  });
  return res.data;
}

export interface InteractiveQuizQuestion {
  id: number | string;
  subtitle?: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  marks: number;
  explanation: string;
}

export interface QuizSubmissionAnswer {
  questionId: number | string;
  question: string;
  selectedOption: number | null;
  correctOption: number;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizSubmissionPayload {
  userId?: string;
  score: number;
  total: number;
  answers: QuizSubmissionAnswer[];
  percentage?: number;
  passed?: boolean;
  timeSpentSeconds?: number;
  topic?: string;
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

export async function submitQuizResult(payload: QuizSubmissionPayload): Promise<QuizSubmissionResponse> {
  const res = await api.post<QuizSubmissionResponse>('/quiz/submit', payload);
  return res.data;
}

export async function fetchSampleQuizQuestions(): Promise<{ title: string; total: number; questions: InteractiveQuizQuestion[] }> {
  const res = await api.get('/quiz/sample-questions');
  return res.data;
}

export async function fetchQuizHistory(limit = 20) {
  const res = await api.get(`/quiz/history?limit=${limit}`);
  return res.data;
}

export async function generatePDF(topic: string, filename?: string, docType = 'report', content?: string): Promise<Blob> {
  const res = await api.post(
    '/ai/generate-pdf',
    { topic, filename, doc_type: docType, content },
    { responseType: 'blob' },
  );
  return res.data as Blob;
}

export interface QuizReportQuestionItem {
  id?: number | string;
  subtitle?: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  marks?: number;
  explanation?: string;
  selectedOption: number | null;
  isCorrect: boolean;
}

export interface ExportQuizReportPayload {
  quizTitle: string;
  candidateName?: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  passMarkPercent?: number;
  timeSpentSeconds: number;
  questions: QuizReportQuestionItem[];
}

export async function exportQuizReportPDF(payload: ExportQuizReportPayload): Promise<Blob> {
  const res = await api.post('/ai/export-quiz-report', payload, {
    responseType: 'blob',
  });
  return res.data as Blob;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function fetchCurrentUser() {
  const res = await api.get('/auth/me');
  return res.data as { email: string; full_name: string; picture?: string; is_verified: boolean };
}

export async function loginWithEmailPassword(email: string, password: string): Promise<string> {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await api.post<{ access_token: string }>('/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data.access_token;
}

export async function loginRequestOTP(email: string): Promise<OTPRequestResponse> {
  const res = await api.post<OTPRequestResponse>('/auth/login/request-otp', { email });
  return res.data;
}

export async function loginVerifyOTP(email: string, otp: string): Promise<string> {
  const res = await api.post<{ access_token: string }>('/auth/login/verify-otp', { email, otp });
  return res.data.access_token;
}

export async function logoutFromServer(token: string): Promise<void> {
  // Fire-and-forget — blacklists the token server-side
  await api.post('/auth/logout', { token }).catch(() => {});
}

export async function signupRequestOTP(
  email: string, fullName: string, password: string,
): Promise<OTPRequestResponse> {
  const res = await api.post<OTPRequestResponse>('/auth/signup/request-otp', {
    email,
    full_name: fullName,
    password,
  });
  return res.data;
}

export async function signupVerifyOTP(email: string, otp: string): Promise<string> {
  const res = await api.post<{ access_token: string }>('/auth/signup/verify-otp', { email, otp });
  return res.data.access_token;
}

export async function forgotPasswordRequestOTP(email: string): Promise<OTPRequestResponse> {
  const res = await api.post<OTPRequestResponse>('/auth/forgot-password/request-otp', { email });
  return res.data;
}

export async function forgotPasswordVerifyOTP(
  email: string,
  otp: string,
): Promise<{ status: string; message: string; email: string }> {
  const res = await api.post<{ status: string; message: string; email: string }>(
    '/auth/forgot-password/verify-otp',
    { email, otp },
  );
  return res.data;
}

export async function forgotPasswordReset(
  email: string,
  otp: string,
  new_password: string,
): Promise<string> {
  const res = await api.post<{ access_token: string }>(
    '/auth/forgot-password/reset',
    { email, otp, new_password },
  );
  return res.data.access_token;
}

export async function updateProfile(full_name: string) {
  const res = await api.patch('/auth/me', { full_name });
  return res.data as { email: string; full_name: string; picture?: string };
}

export async function changePassword(current_password: string, new_password: string) {
  await api.post('/auth/change-password', { current_password, new_password });
}

export async function deleteAccount() { await api.delete('/auth/me'); }
export async function getGoogleAuthUrl(): Promise<string> {
  const res = await api.get<{ url: string }>('/auth/google/url');
  return res.data.url;
}

export { downloadBlob } from './download';
