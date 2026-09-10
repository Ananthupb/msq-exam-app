export interface Question {
  id: number;
  owner_id?: number | null;
  source_type?: "admin" | "user_upload" | "manual" | string;
  source_filename?: string | null;
  question_text: string;
  question_type: "MSQ" | "MCQ" | string;
  options: string[];
  correct_answers: string[]; // e.g. ["A", "C"]
  explanation?: string | null;
  source_file?: string | null;
  created_at: string;
}

export interface ParsedQuestion {
  question: string;
  options: string[];
  correct_answers: string[];
  explanation?: string | null;
  type: string;
}

export interface UploadResponse {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  extracted_text_length: number;
  total_questions_detected: number;
  questions: ParsedQuestion[];
  is_study_notes_only?: boolean;
  message?: string | null;
}

export interface GenerateTopicResponse {
  topic: string;
  total_generated: number;
  questions: ParsedQuestion[];
  message?: string | null;
}


export interface ExamQuestionItem {
  id: number;
  question_id: number;
  question_text: string;
  question_type: string;
  options: string[];
  option_labels: string[];
}

export interface Exam {
  id: number;
  owner_id?: number | null;
  is_practice?: boolean;
  title: string;
  total_questions: number;
  time_limit: number; // in minutes
  randomize_questions: boolean;
  randomize_options: boolean;
  created_at: string;
}


export interface ExamDetail extends Exam {
  questions: ExamQuestionItem[];
}

export interface ExamStartResponse {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  total_questions: number;
  time_limit: number;
  started_at: string;
  expires_at: string;
  remaining_seconds: number;
  status: "in_progress" | "completed" | "auto_submitted" | "abandoned" | string;
  current_question: number;
  current_answers: Record<string, string[]>;
  questions: ExamQuestionItem[];
}

export interface SaveProgressRequest {
  attempt_id: number;
  current_question: number;
  answers: Record<string, string[]>;
}

export interface SaveProgressResponse {
  status: string;
  remaining_seconds: number;
  is_expired: boolean;
}

export interface AnswerSubmission {
  question_id: number;
  selected_answers: string[];
}

export interface ExamSubmitRequest {
  attempt_id?: number;
  time_taken?: number; // in seconds
  answers: AnswerSubmission[];
}

export interface QuestionReviewDetail {
  question_id: number;
  question_text: string;
  question_type: string;
  options: string[];
  option_labels: string[];
  selected_answers: string[];
  correct_answers: string[];
  is_correct: boolean;
  is_attempted: boolean;
  status: "CORRECT" | "WRONG" | "SKIPPED";
  explanation?: string | null;
}

export interface ExamAttempt {
  id: number;
  user_id?: number | null;
  username?: string | null;
  exam_id: number | null;
  exam_title: string;
  total_questions: number;
  time_limit: number;
  started_at: string;
  expires_at: string;
  submitted_at?: string | null;
  status: "in_progress" | "completed" | "auto_submitted" | "abandoned" | string;
  current_question: number;
  current_answers: Record<string, string[]>;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  percentage: number;
  time_taken: number;
  created_at: string;
  answers_summary?: QuestionReviewDetail[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "user" | string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AdminStats {
  total_questions: number;
  total_exams: number;
  total_users: number;
  total_attempts: number;
  average_score: number;
}

export interface AdminUserListItem extends User {
  total_attempts: number;
}

export interface BulkDeleteResponse {
  status: string;
  deleted_count: number;
  message: string;
}

