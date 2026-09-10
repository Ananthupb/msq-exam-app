"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  Home,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  Filter,
  Trash2,
} from "lucide-react";
import { getResult, deleteAttempt } from "@/lib/api";
import { ExamAttempt, QuestionReviewDetail } from "@/types";

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = parseInt(params.id as string, 10);

  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAttempt = async () => {
    try {
      setIsDeleting(true);
      await deleteAttempt(attemptId);
      router.push("/history");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoading(true);
        const data = await getResult(attemptId);
        setAttempt(data);

        // Fire celebration confetti if score is >= 70%
        if (data.percentage >= 70) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Failed to load exam attempt result.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (!isNaN(attemptId)) {
      loadAttempt();
    }
  }, [attemptId]);

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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Calculating score and compiling review...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !attempt) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Result Record Not Found
        </h2>
        <p className="text-sm text-slate-500">{errorMsg || "Unable to find attempt details."}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    );
  }

  const isPassed = attempt.percentage >= 70;
  const questionsList: QuestionReviewDetail[] = attempt.answers_summary || [];

  const filteredQuestions = questionsList.filter((q) => {
    if (filterType === "correct") return q.status === "CORRECT";
    if (filterType === "wrong") return q.status === "WRONG";
    if (filterType === "skipped") return q.status === "SKIPPED";
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Exam Performance Report
            </span>
            {attempt.status === "auto_submitted" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Auto-Submitted (Timer Expired)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {attempt.exam_title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Completed on {formatDate(attempt.created_at)} • Time Limit: {attempt.time_limit}m
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 shadow-xs"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <Link
            href="/exam/configure"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Take Another Exam
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Attempt
          </button>
        </div>
      </div>

      {/* Main Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Big Percentage Card */}
        <div
          className={`flex flex-col items-center justify-center rounded-2xl p-8 text-center shadow-sm border ${
            isPassed
              ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-950/30 dark:to-teal-950/20 dark:border-emerald-900"
              : "bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200 dark:from-rose-950/30 dark:to-amber-950/20 dark:border-rose-900"
          }`}
        >
          <span
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider mb-2 ${
              isPassed
                ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200"
            }`}
          >
            {isPassed ? "PASSED" : "NEEDS PRACTICE"}
          </span>

          <div className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            {attempt.percentage}%
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Score: {attempt.score} / {attempt.total_questions}
          </p>
        </div>

        {/* Detailed Metrics Grid (2 Cols) */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Questions
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {attempt.total_questions}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Attempted
            </span>
            <span className="text-2xl font-black text-blue-600 mt-1">
              {attempt.attempted}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Time Taken
            </span>
            <div className="flex items-center gap-1.5 text-xl font-black text-slate-900 dark:text-white mt-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{formatDuration(attempt.time_taken)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-950 dark:bg-emerald-950/20 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Correct
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {attempt.correct}
            </span>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-xs dark:border-rose-950 dark:bg-rose-950/20 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              Wrong
            </div>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {attempt.wrong}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/50 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <HelpCircle className="h-3.5 w-3.5" />
              Skipped
            </div>
            <span className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">
              {attempt.skipped}
            </span>
          </div>
        </div>
      </div>

      {/* Question Review Section */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Detailed Question Review
          </h2>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filterType === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              All ({questionsList.length})
            </button>
            <button
              onClick={() => setFilterType("correct")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filterType === "correct"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              Correct ({attempt.correct})
            </button>
            <button
              onClick={() => setFilterType("wrong")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filterType === "wrong"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
              }`}
            >
              Wrong ({attempt.wrong})
            </button>
            <button
              onClick={() => setFilterType("skipped")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filterType === "skipped"
                  ? "bg-slate-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              Skipped ({attempt.skipped})
            </button>
          </div>
        </div>

        {/* List of Review Cards */}
        <div className="space-y-6">
          {filteredQuestions.map((q, idx) => {
            const isCorrect = q.status === "CORRECT";
            const isWrong = q.status === "WRONG";
            const isSkipped = q.status === "SKIPPED";

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-6 sm:p-7 shadow-xs space-y-5 transition-all ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-50/15 dark:border-emerald-900/60 dark:bg-emerald-950/10"
                    : isWrong
                    ? "border-rose-200 bg-rose-50/15 dark:border-rose-900/60 dark:bg-rose-950/10"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                {/* Review Header: Question # + Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {q.question_type}
                    </span>
                  </div>

                  <div>
                    {isCorrect && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                        CORRECT
                      </span>
                    )}
                    {isWrong && (
                      <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <X className="h-3.5 w-3.5" />
                        WRONG
                      </span>
                    )}
                    {isSkipped && (
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        SKIPPED
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {q.question_text}
                </h3>

                {/* Options Review Breakdown */}
                <div className="space-y-2.5">
                  {q.options.map((optText, oIdx) => {
                    const label = q.option_labels[oIdx] || String.fromCharCode(65 + oIdx);
                    const isSelected = q.selected_answers.includes(label);
                    const isOfficialCorrect = q.correct_answers.includes(label);

                    // Determine styling based on correctness
                    let optBorder = "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
                    if (isOfficialCorrect && isSelected) {
                      // Correctly selected
                      optBorder = "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30";
                    } else if (!isOfficialCorrect && isSelected) {
                      // Incorrectly selected
                      optBorder = "border-rose-500 bg-rose-50/60 dark:bg-rose-950/30";
                    } else if (isOfficialCorrect && !isSelected) {
                      // Missed correct answer
                      optBorder = "border-dashed border-emerald-400 bg-emerald-50/20 dark:border-emerald-800";
                    }

                    return (
                      <div
                        key={oIdx}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs sm:text-sm transition-all ${optBorder}`}
                      >
                        {/* Status Icon Indicator */}
                        <div className="pt-0.5">
                          {isSelected && isOfficialCorrect && (
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white" title="Correct selection">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {isSelected && !isOfficialCorrect && (
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-white" title="Incorrect selection">
                              <X className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {!isSelected && isOfficialCorrect && (
                            <div className="flex h-5 w-5 items-center justify-center rounded border border-emerald-600 text-emerald-600" title="Missed answer">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {!isSelected && !isOfficialCorrect && (
                            <div className="h-5 w-5 rounded border border-slate-300 dark:border-slate-700" />
                          )}
                        </div>

                        <div className="flex-1 text-slate-800 dark:text-slate-200">
                          <span className="font-bold mr-2 text-slate-900 dark:text-white">
                            {label}.
                          </span>
                          {optText}
                        </div>

                        {/* Extra Status Badges */}
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                          {isSelected && (
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Your Pick
                            </span>
                          )}
                          {isOfficialCorrect && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Correct Choice
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Comparison & Explanation */}
                <div className="rounded-xl bg-slate-100/70 p-4 text-xs dark:bg-slate-800/50 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                    <div>
                      <span className="text-slate-500 mr-1.5">Your Answer:</span>
                      <strong className="text-slate-900 dark:text-white">
                        {q.selected_answers.length > 0
                          ? q.selected_answers.join(", ")
                          : "None (Skipped)"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 mr-1.5">Correct Answer:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {q.correct_answers.join(", ")}
                      </strong>
                    </div>
                  </div>

                  {q.explanation && (
                    <div className="border-t border-slate-200 pt-2 dark:border-slate-700/60">
                      <span className="font-bold text-slate-700 dark:text-slate-300 mr-1.5">
                        Explanation:
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {q.explanation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Attempt Confirmation Modal */}
      {showDeleteModal && (
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
                  Attempt #{attempt.id} • {attempt.exam_title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This action will permanently delete this attempt and its result record.
              <br /><br />
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ The original exam configuration and question bank will NOT be deleted.
              </span>
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAttempt}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
