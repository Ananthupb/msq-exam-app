import {
  Question,
  ParsedQuestion,
  UploadResponse,
  Exam,
  ExamDetail,
  ExamStartResponse,
  SaveProgressRequest,
  SaveProgressResponse,
  ExamSubmitRequest,
  ExamAttempt,
  User,
  TokenResponse,
  AdminStats,
  AdminUserListItem,
  BulkDeleteResponse,
  UserProfileStats,
  ForgotPasswordResponse,
  VerifyOtpResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Token Management Helpers ---
const TOKEN_KEY = "msq_access_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null, rememberMe: boolean = true): void {
  if (typeof window === "undefined") return;
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } else if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// --- Fetch Wrapper with Automatic Auth Header ---
async function fetchJSON<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        errMsg = errorData.detail || errorData.message || errMsg;
      } catch {
        // fallback
      }
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Unable to connect to MSQ Exam backend server. Please verify it is running on http://localhost:8000.");
  }
}

// --- Auth Endpoints ---
export async function loginUser(payload: {
  identifier: string;
  password: string;
  remember_me?: boolean;
}): Promise<TokenResponse> {
  const data = await fetchJSON<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAuthToken(data.access_token, payload.remember_me ?? true);
  return data;
}

export async function registerUser(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<TokenResponse> {
  const data = await fetchJSON<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setAuthToken(data.access_token, true);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  return fetchJSON<User>("/api/auth/me");
}

export async function logoutUser(): Promise<void> {
  try {
    await fetchJSON("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuthToken();
  }
}

export async function forgotPassword(identifier: string): Promise<ForgotPasswordResponse> {
  return fetchJSON<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export async function verifyPasswordOtp(
  identifier: string,
  otp: string
): Promise<VerifyOtpResponse> {
  return fetchJSON<VerifyOtpResponse>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ identifier, otp }),
  });
}

export async function resetPassword(payload: {
  reset_token: string;
  new_password: string;
  identifier?: string;
}): Promise<{ status: string; message: string }> {
  return fetchJSON<{ status: string; message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ status: string; message: string }> {
  return fetchJSON<{ status: string; message: string }>("/api/auth/change-password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateUserProfile(payload: {
  username?: string;
  email?: string;
}): Promise<User> {
  return fetchJSON<User>("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getUserProfileStats(): Promise<UserProfileStats> {
  return fetchJSON<UserProfileStats>("/api/auth/profile/stats");
}


// --- Document Upload ---
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      let errMsg = `Upload failed (${res.status})`;
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errJson.message || errMsg;
      } catch {
        // fallback
      }
      throw new Error(errMsg);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Network error during document upload.");
  }
}

export async function parseRawText(text: string): Promise<ParsedQuestion[]> {
  const res = await fetchJSON<{ total_parsed: number; questions: ParsedQuestion[] }>(
    "/api/questions/parse",
    {
      method: "POST",
      body: JSON.stringify({ text }),
    }
  );
  return res.questions;
}

export async function generateQuestionsByTopic(payload: {
  topic: string;
  count: number;
}): Promise<{ topic: string; total_generated: number; questions: ParsedQuestion[]; message?: string }> {
  return fetchJSON<{ topic: string; total_generated: number; questions: ParsedQuestion[]; message?: string }>(
    "/api/questions/generate-topic",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}


// --- Question Bank Operations ---
export async function getQuestions(search?: string, scope?: string): Promise<Question[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (scope) params.append("scope", scope);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchJSON<Question[]>(`/api/questions${query}`);
}

export async function createQuestions(
  questions: Array<{
    question_text: string;
    question_type?: string;
    options: string[];
    correct_answers: string[];
    explanation?: string | null;
    source_file?: string | null;
    source_filename?: string | null;
    source_type?: string;
  }>
): Promise<Question[]> {
  return fetchJSON<Question[]>("/api/questions", {
    method: "POST",
    body: JSON.stringify(questions),
  });
}

export async function updateQuestion(
  id: number,
  data: Partial<Question>
): Promise<Question> {
  return fetchJSON<Question>(`/api/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(id: number): Promise<void> {
  await fetchJSON(`/api/questions/${id}`, {
    method: "DELETE",
  });
}

export async function deleteQuestionsBulk(questionIds: number[]): Promise<BulkDeleteResponse> {
  return fetchJSON<BulkDeleteResponse>("/api/questions/bulk", {
    method: "DELETE",
    body: JSON.stringify({ question_ids: questionIds }),
  });
}

export async function deleteAllQuestions(): Promise<BulkDeleteResponse> {
  return fetchJSON<BulkDeleteResponse>("/api/questions/all", {
    method: "DELETE",
  });
}

// --- Exam Operations ---
export async function createExam(payload: {
  title: string;
  question_ids?: number[];
  question_count?: number;
  time_limit: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  is_practice?: boolean;
}): Promise<Exam> {
  return fetchJSON<Exam>("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function getExams(): Promise<Exam[]> {
  return fetchJSON<Exam[]>("/api/exams");
}

export async function getExam(id: number): Promise<ExamDetail> {
  return fetchJSON<ExamDetail>(`/api/exams/${id}`);
}

export async function deleteExam(id: number): Promise<void> {
  await fetchJSON(`/api/exams/${id}`, {
    method: "DELETE",
  });
}

export async function startOrResumeExam(examId: number): Promise<ExamStartResponse> {
  return fetchJSON<ExamStartResponse>(`/api/exams/${examId}/start`, {
    method: "POST",
  });
}

export async function saveExamProgress(
  examId: number,
  payload: SaveProgressRequest
): Promise<SaveProgressResponse> {
  return fetchJSON<SaveProgressResponse>(`/api/exams/${examId}/save-progress`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitExam(
  id: number,
  submission: ExamSubmitRequest
): Promise<ExamAttempt> {
  return fetchJSON<ExamAttempt>(`/api/exams/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(submission),
  });
}

// --- Result & History Operations ---
export async function getResults(): Promise<ExamAttempt[]> {
  return fetchJSON<ExamAttempt[]>("/api/results");
}

export async function getResult(id: number): Promise<ExamAttempt> {
  return fetchJSON<ExamAttempt>(`/api/results/${id}`);
}

export async function deleteAttempt(id: number): Promise<void> {
  await fetchJSON(`/api/results/${id}`, {
    method: "DELETE",
  });
}

// --- Admin Operations ---
export async function getAdminStats(): Promise<AdminStats> {
  return fetchJSON<AdminStats>("/api/admin/stats");
}

export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  return fetchJSON<AdminUserListItem[]>("/api/admin/users");
}

export async function updateAdminUser(
  userId: number,
  payload: { role?: string; is_active?: boolean }
): Promise<{ status: string; message: string }> {
  return fetchJSON<{ status: string; message: string }>(`/api/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(userId: number): Promise<{ status: string; message: string }> {
  return fetchJSON<{ status: string; message: string }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function adminResetUserPassword(
  userId: number,
  newPassword: string
): Promise<{ status: string; message: string }> {
  return fetchJSON<{ status: string; message: string }>(`/api/admin/users/${userId}/password`, {
    method: "PUT",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export async function getAdminAttempts(): Promise<ExamAttempt[]> {
  return fetchJSON<ExamAttempt[]>("/api/admin/attempts");
}

