"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getExams,
  getResults,
  deleteAttempt,
  getQuestions,
  deleteExam,
} from "@/lib/api";
import { Exam, ExamAttempt } from "@/types";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Flame,
  History,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingUp,
  XCircle,
  Upload,
  ArrowRight,
} from "lucide-react";

export default function UserDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [myQuestionsCount, setMyQuestionsCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  // Deletion modal state for attempts
  const [attemptToDelete, setAttemptToDelete] = useState<ExamAttempt | null>(null);
  const [isDeletingAttempt, setIsDeletingAttempt] = useState(false);

  // Deletion modal state for practice tests
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/dashboard");
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [allExams, allAttempts, myQuestions] = await Promise.all([
        getExams().catch(() => []),
        getResults().catch(() => []),
        getQuestions("", "personal").catch(() => []),
      ]);
      setExams(allExams);
      setAttempts(allAttempts);
      setMyQuestionsCount(myQuestions.length);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleConfirmDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    try {
      setIsDeletingAttempt(true);
      await deleteAttempt(attemptToDelete.id);
      setAttempts((prev) => prev.filter((a) => a.id !== attemptToDelete.id));
      setAttemptToDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete attempt");
    } finally {
      setIsDeletingAttempt(false);
    }
  };

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      setIsDeletingExam(true);
      await deleteExam(examToDelete.id);
      setExams((prev) => prev.filter((e) => e.id !== examToDelete.id));
      setExamToDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete practice test");
    } finally {
      setIsDeletingExam(false);
    }
  };

  if (isLoading || loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const completedAttempts = attempts.filter(
    (a) => a.status === "completed" || a.status === "auto_submitted"
  );
  const inProgressAttempts = attempts.filter((a) => a.status === "in_progress");

  const totalExamsTaken = completedAttempts.length;
  const avgScore =
    totalExamsTaken > 0
      ? Math.round(
          completedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
            totalExamsTaken
        )
      : 0;

  const bestScore =
    totalExamsTaken > 0
      ? Math.round(
          Math.max(...completedAttempts.map((a) => a.percentage || 0))
        )
      : 0;

  const totalTimeSpentSeconds = completedAttempts.reduce(
    (acc, curr) => acc + (curr.time_taken || 0),
    0
  );
  const totalTimeSpentMinutes = Math.round(totalTimeSpentSeconds / 60);

  // Split exams
  const myPracticeExams = exams.filter((e) => e.is_practice && e.owner_id === user?.id);
  const publishedExams = exams.filter((e) => !e.is_practice);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Student Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Upload your study documents (PDF, DOCX) to generate personal practice tests,
              manage your private Question Bank, and take timed examinations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/practice"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-md hover:bg-blue-50 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4 text-blue-700" />
              Upload & Create Practice Test
            </Link>
            <Link
              href="/dashboard/questions"
              className="flex items-center gap-2 rounded-xl bg-blue-800/60 border border-blue-400/30 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              My Question Bank ({myQuestionsCount})
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Exams Completed
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalExamsTaken}
          </p>
          <span className="text-xs text-slate-400">Total submitted sessions</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Average Score
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {avgScore}%
          </p>
          <span className="text-xs text-slate-400">Across all completed exams</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Personal Best
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {bestScore}%
          </p>
          <span className="text-xs text-slate-400">Highest percentage achieved</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              My Question Bank
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {myQuestionsCount} <span className="text-base font-semibold">Qs</span>
          </p>
          <span className="text-xs text-slate-400">Stored personal questions</span>
        </div>
      </div>

      {/* Active Session Resumption Card */}
      {inProgressAttempts.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <RotateCcw className="h-5 w-5 animate-spin-reverse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Active Exam In Progress
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  You have an unfinished attempt for &ldquo;{inProgressAttempts[0].exam_title}&rdquo;.
                  Your progress is saved server-side.
                </p>
              </div>
            </div>
            <Link
              href={`/exam/${inProgressAttempts[0].exam_id || 1}`}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Resume Exam Now
            </Link>
          </div>
        </div>
      )}

      {/* Quick Action Banner: Upload & Create Practice Test or Practice by Topic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/60 p-6 dark:border-blue-900/50 dark:bg-slate-900 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload Study Document
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload your own PDF, DOCX, or DOC material to extract questions and take a private practice test.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/practice"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors w-fit"
          >
            Upload Document <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50/50 p-6 dark:border-purple-900/50 dark:bg-slate-900 flex flex-col justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/20 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Practice by Topic
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Generate a custom MSQ test for any subject: Computer Networking, Cybersecurity, OS, Banking, Math, etc.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/practice"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-colors w-fit"
          >
            Enter Topic & Practice <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>


      {/* Section 1: My Personal Practice Tests (If any exist) */}
      {myPracticeExams.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                My Personal Practice Tests
              </h2>
              <p className="text-xs text-slate-500">
                Practice exams created from your uploaded documents.
              </p>
            </div>
            <Link
              href="/dashboard/practice"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              + Create Another
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myPracticeExams.map((exam) => (
              <div
                key={exam.id}
                className="group rounded-2xl border border-purple-200 bg-white p-5 shadow-xs transition-all hover:border-purple-500 hover:shadow-md dark:border-purple-900/50 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Personal Practice
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      {exam.time_limit} mins
                    </span>
                    <button
                      onClick={() => setExamToDelete(exam)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Practice Test"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {exam.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{exam.total_questions} Questions</span>
                  <span>•</span>
                  <span>Created {new Date(exam.created_at).toLocaleDateString()}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/exam/${exam.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Start Practice Test
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Published System Practice Exams */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Published Practice Exams
            </h2>
            <p className="text-xs text-slate-500">
              Standard modules published by platform instructors.
            </p>
          </div>
          <Link
            href="/exam/configure"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            Custom Config <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {publishedExams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500">
              No published exams currently available. Create your own practice test above!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {publishedExams.map((exam) => (
              <div
                key={exam.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    MSQ / MCQ
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{exam.time_limit} mins</span>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-blue-600 dark:text-white transition-colors line-clamp-1">
                  {exam.title}
                </h3>

                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span>{exam.total_questions} Questions</span>
                  <span>•</span>
                  <span>Multiple Choice / Select</span>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/exam/${exam.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Start Exam
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Recent Attempts Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Recent Exam Attempts
            </h2>
            <p className="text-xs text-slate-500">
              Your latest scores and performance breakdown.
            </p>
          </div>
          <Link
            href="/history"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View All ({attempts.length})
          </Link>
        </div>

        {attempts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm">You haven&apos;t taken any exams yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Start an exam above or upload a document to create your first practice test!
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3">Exam Title</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Breakdown</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attempts.slice(0, 5).map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {attempt.exam_title}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold ${
                            attempt.percentage >= 70
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : attempt.percentage >= 40
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {attempt.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">
                            ✓ {attempt.correct}
                          </span>
                          <span className="text-rose-600 font-semibold">
                            ✗ {attempt.wrong}
                          </span>
                          <span className="text-slate-400">
                            - {attempt.skipped}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {Math.floor(attempt.time_taken / 60)}m {attempt.time_taken % 60}s
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/results/${attempt.id}`}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                          >
                            Review
                          </Link>
                          <button
                            onClick={() => setAttemptToDelete(attempt)}
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Delete Attempt"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Attempt Confirmation Modal */}
      {attemptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Attempt
                </h3>
                <p className="text-xs text-slate-500">Attempt #{attemptToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete this exam attempt for &ldquo;
              <strong>{attemptToDelete.exam_title}</strong>&rdquo;? This will permanently
              remove your score from your history. The practice test and question bank will not be affected.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingAttempt}
                onClick={() => setAttemptToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAttempt}
                onClick={handleConfirmDeleteAttempt}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingAttempt ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Personal Practice Test Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Practice Test
                </h3>
                <p className="text-xs text-slate-500">Test #{examToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete personal practice test &ldquo;
              <strong>{examToDelete.title}</strong>&rdquo;? Your questions will remain in your
              Question Bank.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingExam}
                onClick={() => setExamToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingExam}
                onClick={handleConfirmDeleteExam}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingExam ? "Deleting..." : "Delete Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
