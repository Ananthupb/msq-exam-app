"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Play,
  FileCheck,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Database,
} from "lucide-react";
import { getResults, getQuestions } from "@/lib/api";
import { ExamAttempt, Question } from "@/types";

export default function HomePage() {
  const [results, setResults] = useState<ExamAttempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setApiError(null);
        const [resultsData, questionsData] = await Promise.all([
          getResults().catch(() => []),
          getQuestions().catch(() => []),
        ]);
        setResults(resultsData);
        setQuestions(questionsData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setApiError(err.message);
        } else {
          setApiError("Failed to connect to backend service.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalAttempts = results.length;
  const avgScore =
    totalAttempts > 0
      ? (
          results.reduce((acc, curr) => acc + curr.percentage, 0) /
          totalAttempts
        ).toFixed(1)
      : "0.0";
  const bestScore =
    totalAttempts > 0
      ? Math.max(...results.map((r) => r.percentage)).toFixed(1)
      : "0.0";

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Hero / Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-medium text-blue-200 border border-blue-400/20 backdrop-blur-sm">
            <span>✨ Document-Powered MSQ Examination Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            MSQ Exam Application
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Upload your study materials in PDF or Word formats. Extract Multiple
            Select Questions directly, practice under timed conditions, and
            evaluate your performance with comprehensive analytics.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/upload"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-md hover:bg-blue-50 transition-all active:scale-95"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Link>
            <Link
              href="/exam/configure"
              className="flex items-center gap-2 rounded-xl bg-blue-500/40 border border-blue-300/30 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500/60 transition-all active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" />
              Start Exam
            </Link>
            <Link
              href="/questions"
              className="flex items-center gap-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 px-4 py-3 text-sm font-medium text-white transition-all"
            >
              <Database className="h-4 w-4" />
              Question Bank ({questions.length})
            </Link>
          </div>
        </div>

        {/* Decorative background grid */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      </div>

      {apiError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <span className="font-semibold text-sm">Backend Notice:</span>
            <span className="text-sm">{apiError}</span>
          </div>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Make sure the FastAPI server is running on port 8000. Start it with:{" "}
            <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">
              uvicorn app.main:app --reload
            </code>
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Questions in Bank
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {questions.length}
            </span>
            <span className="text-xs text-slate-500">available</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Exams Completed
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalAttempts}
            </span>
            <span className="text-xs text-slate-500">attempts</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Score
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {avgScore}%
            </span>
            <span className="text-xs text-slate-500">accuracy</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Top Performance
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {bestScore}%
            </span>
            <span className="text-xs text-slate-500">highest</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Instructions + Previous Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Previous Exam Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Previous Results
            </h2>
            {results.length > 0 && (
              <span className="text-xs text-slate-500">
                Showing {results.length} past exam{results.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm">Loading exam history...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-3">
                <Play className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                No exams taken yet
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                Upload a document or pick questions from the question bank to start
                your first MSQ practice exam.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Link
                  href="/upload"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Upload Material
                </Link>
                <Link
                  href="/exam/configure"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Configure Exam
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((attempt) => {
                const isPass = attempt.percentage >= 70;
                return (
                  <div
                    key={attempt.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition-colors">
                          {attempt.exam_title}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isPass
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {attempt.percentage}%
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{attempt.total_questions} Questions</span>
                        <span>•</span>
                        <span>
                          Score: {attempt.score} / {attempt.total_questions}
                        </span>
                        <span>•</span>
                        <span>Time: {formatDuration(attempt.time_taken)}</span>
                        <span>•</span>
                        <span>{formatDate(attempt.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 sm:pt-0">
                      <Link
                        href={`/results/${attempt.id}`}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Review
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Instructions Card */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-600" />
            Instructions
          </h2>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Multiple Select Questions (MSQ)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                In an MSQ exam, one or more options can be correct for any given
                question.
              </p>
            </div>

            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Full Credit Policy:
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-400">
                    A question receives full points only if all correct choices
                    are selected with zero incorrect selections.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Countdown Timer:
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-400">
                    The timer runs continuously across questions. When the timer
                    reaches 00:00, your exam will auto-submit immediately.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Question Navigation:
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-400">
                    Use the question-number palette to jump between questions.
                    Color badges highlight answered, unanswered, and marked-for-review
                    questions.
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50/70 p-3.5 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <p className="font-medium">💡 Quick Start Tip:</p>
              <p className="mt-1">
                You can try the preloaded sample exam document located in{" "}
                <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">
                  samples/sample_exam.pdf
                </code>{" "}
                or{" "}
                <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">
                  samples/sample_exam.docx
                </code>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
