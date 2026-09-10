"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  AlertTriangle,
  Play,
  Layers,
  Settings,
  X,
} from "lucide-react";
import { getResults, deleteAttempt, getExams, deleteExam } from "@/lib/api";
import { ExamAttempt, Exam } from "@/types";

export default function ExamHistoryPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab: "attempts" | "exams"
  const [activeTab, setActiveTab] = useState<"attempts" | "exams">("attempts");

  // Delete Attempt Modal State
  const [attemptToDelete, setAttemptToDelete] = useState<ExamAttempt | null>(null);
  const [isDeletingAttempt, setIsDeletingAttempt] = useState(false);

  // Delete Exam Modal State
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [resultsData, examsData] = await Promise.all([
        getResults().catch(() => []),
        getExams().catch(() => []),
      ]);
      setAttempts(resultsData);
      setExams(examsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to load history data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const confirmDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    try {
      setIsDeletingAttempt(true);
      await deleteAttempt(attemptToDelete.id);
      setAttempts((prev) => prev.filter((a) => a.id !== attemptToDelete.id));
      setAttemptToDelete(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Failed to delete attempt: ${err.message}`);
      }
    } finally {
      setIsDeletingAttempt(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      setIsDeletingExam(true);
      await deleteExam(examToDelete.id);
      setExams((prev) => prev.filter((e) => e.id !== examToDelete.id));
      setExamToDelete(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Failed to delete exam: ${err.message}`);
      }
    } finally {
      setIsDeletingExam(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <History className="h-7 w-7 text-blue-600" />
            Exam Management & History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review completed exam attempts, detailed scoring, and manage configured exam sessions.
          </p>
        </div>

        <Link
          href="/exam/configure"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          Take New Exam
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("attempts")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "attempts"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Award className="h-4 w-4" />
          Completed Attempts ({attempts.length})
        </button>
        <button
          onClick={() => setActiveTab("exams")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "exams"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Settings className="h-4 w-4" />
          Configured Exams ({exams.length})
        </button>
      </div>

      {/* Tab Content: Completed Attempts */}
      {activeTab === "attempts" && (
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm">Loading completed attempts...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <History className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No exam attempts found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once you complete or auto-submit an exam session, your performance records and question review logs will appear here.
              </p>
              <div className="pt-2">
                <Link
                  href="/exam/configure"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Start an Exam Now
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => {
                const isPassed = attempt.percentage >= 70;
                const isAutoSubmitted = attempt.status === "auto_submitted";

                return (
                  <div
                    key={attempt.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Left: Title, Date, Status */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {attempt.exam_title}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                            isPassed
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {attempt.percentage}% ({attempt.score} / {attempt.total_questions})
                        </span>
                        {isAutoSubmitted && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Auto-Submitted (Timer)
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400">
                        Attempted on {formatDate(attempt.created_at)}
                      </div>

                      {/* Score Breakdown Pills */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Correct: <strong>{attempt.correct}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Wrong: <strong>{attempt.wrong}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                          <span>Skipped: <strong>{attempt.skipped}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>Time: <strong>{formatDuration(attempt.time_taken)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 dark:border-slate-800">
                      <Link
                        href={`/results/${attempt.id}`}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Result
                      </Link>

                      <button
                        type="button"
                        onClick={() => setAttemptToDelete(attempt)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                        title="Delete attempt record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Attempt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Configured Exams */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No configured exams found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Create an exam session from your question bank or uploaded documents.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900 dark:text-white">
                        {exam.title}
                      </span>
                      <span className="text-xs text-slate-400">#{exam.id}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{exam.total_questions} Questions</span>
                      <span>•</span>
                      <span>Time Limit: {exam.time_limit} Minutes</span>
                      <span>•</span>
                      <span>Created {formatDate(exam.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/exam/${exam.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      Take Exam
                    </Link>

                    <button
                      type="button"
                      onClick={() => setExamToDelete(exam)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                      title="Delete exam configuration"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Exam
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal: Delete Attempt */}
      {attemptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Attempt?
                </h3>
                <p className="text-xs text-slate-500">
                  Attempt #{attemptToDelete.id} • {attemptToDelete.exam_title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This action will <strong>permanently remove this attempt and its grading results</strong> from the database.
              <br /><br />
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ The original exam configuration and question bank will NOT be affected.
              </span>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingAttempt}
                onClick={() => setAttemptToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAttempt}
                onClick={confirmDeleteAttempt}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingAttempt ? "Deleting..." : "Permanently Delete Attempt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Exam */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Configuration?
                </h3>
                <p className="text-xs text-slate-500">
                  {examToDelete.title} ({examToDelete.total_questions} questions)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This will remove this exam session and any associated attempt links.
              <br /><br />
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ All questions in your Question Bank will remain safe and intact.
              </span>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingExam}
                onClick={() => setExamToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingExam}
                onClick={confirmDeleteExam}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingExam ? "Deleting..." : "Delete Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
