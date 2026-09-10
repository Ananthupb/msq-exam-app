"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  CheckSquare,
  Square,
  CircleDot,
  Circle,
  Bookmark,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Layers,
  HelpCircle,
  RefreshCw,
  Bell,
} from "lucide-react";
import { startOrResumeExam, saveExamProgress, submitExam } from "@/lib/api";
import { ExamStartResponse, ExamQuestionItem } from "@/types";

export default function ExamSessionPage() {
  const params = useParams();
  const router = useRouter();
  const examId = parseInt(params.id as string, 10);

  const [session, setSession] = useState<ExamStartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isResumed, setIsResumed] = useState(false);

  // Active question index
  const [currentIndex, setCurrentIndex] = useState(0);

  // User answers map: { [question_id]: ["A", "C"] }
  const [answers, setAnswers] = useState<Record<number, string[]>>({});

  // Marked for review questions
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());

  // Timer states
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const isSubmittingRef = useRef(false);

  // Auto-save debounce timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Notifications
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSubmitNotice, setAutoSubmitNotice] = useState<string | null>(null);

  // 1. Start or Resume Exam on Mount
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await startOrResumeExam(examId);

        // If attempt was already finalized
        if (data.status === "completed" || data.status === "auto_submitted") {
          router.replace(`/results/${data.attempt_id}`);
          return;
        }

        setSession(data);
        setRemainingSeconds(data.remaining_seconds);

        // Restore saved question and answers if any
        if (data.current_question !== undefined && data.current_question < data.questions.length) {
          setCurrentIndex(data.current_question);
        }

        if (data.current_answers && Object.keys(data.current_answers).length > 0) {
          const restored: Record<number, string[]> = {};
          for (const [k, v] of Object.entries(data.current_answers)) {
            restored[parseInt(k, 10)] = v;
          }
          setAnswers(restored);
          setIsResumed(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Failed to start or resume exam.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (!isNaN(examId)) {
      initSession();
    }
  }, [examId, router]);

  // Submission handler
  const executeSubmission = useCallback(
    async (isTimeout = false) => {
      if (!session || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      if (isTimeout) {
        setAutoSubmitNotice("Time has expired! Automatically grading and finalizing your attempt...");
      }

      const formattedAnswers = session.questions.map((q) => ({
        question_id: q.question_id,
        selected_answers: answers[q.question_id] || [],
      }));

      try {
        const attempt = await submitExam(session.exam_id, {
          attempt_id: session.attempt_id,
          answers: formattedAnswers,
        });

        setTimeout(() => {
          router.replace(`/results/${attempt.id}`);
        }, isTimeout ? 1200 : 0);
      } catch (err: unknown) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        if (err instanceof Error) {
          alert(`Submission error: ${err.message}`);
        } else {
          alert("Failed to submit exam. Please try again.");
        }
      }
    },
    [session, answers, router]
  );

  // 2. Reliable Countdown Timer
  useEffect(() => {
    if (!session || session.status !== "in_progress" || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!isSubmittingRef.current) {
            executeSubmission(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, executeSubmission]);

  // 3. Auto-save progress whenever answers or currentIndex change
  const triggerAutoSave = useCallback(
    (newAnswers: Record<number, string[]>, newIdx: number) => {
      if (!session || session.status !== "in_progress") return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const answersPayload: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(newAnswers)) {
            answersPayload[String(k)] = v;
          }

          const res = await saveExamProgress(session.exam_id, {
            attempt_id: session.attempt_id,
            current_question: newIdx,
            answers: answersPayload,
          });

          if (res.is_expired && !isSubmittingRef.current) {
            executeSubmission(true);
          }
        } catch {
          // silent auto-save error catch
        }
      }, 600);
    },
    [session, executeSubmission]
  );

  // Option selection toggle (supports both MCQ single-select and MSQ multi-select)
  const handleToggleOption = (questionId: number, label: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      const isMCQ = currentQuestion?.question_type === "MCQ";
      let updated: string[];
      if (isMCQ) {
        // For MCQ: single choice (toggle off if clicked again, or switch to new selection)
        updated = current.includes(label) ? [] : [label];
      } else {
        // For MSQ: multi-select
        updated = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label].sort();
      }
      const nextAnswers = { ...prev, [questionId]: updated };
      triggerAutoSave(nextAnswers, currentIndex);
      return nextAnswers;
    });
  };

  // Clear answer for active question
  const handleClearCurrentAnswer = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const nextAnswers = { ...prev };
      delete nextAnswers[currentQuestion.question_id];
      triggerAutoSave(nextAnswers, currentIndex);
      return nextAnswers;
    });
  };

  // Change question
  const handleNavigateQuestion = (targetIdx: number) => {
    setCurrentIndex(targetIdx);
    triggerAutoSave(answers, targetIdx);
  };

  // Toggle marked for review
  const handleToggleReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.question_id)) {
        next.delete(currentQuestion.question_id);
      } else {
        next.add(currentQuestion.question_id);
      }
      return next;
    });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Checking session & synchronizing server timer...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Failed to load exam session
        </h2>
        <p className="text-sm text-slate-500">{errorMsg || "Exam not found"}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestion: ExamQuestionItem = session.questions[currentIndex];
  const currentSelectedAnswers = answers[currentQuestion?.question_id] || [];
  const isCurrentMarked = markedForReview.has(currentQuestion?.question_id);

  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;
  const unansweredCount = session.total_questions - answeredCount;
  const reviewCount = markedForReview.size;
  const isLowTime = remainingSeconds < 120; // under 2 minutes

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70 pb-16 dark:bg-slate-950">
      {/* Top Fixed Exam Banner */}
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate max-w-xs sm:max-w-md">
              {session.exam_title}
            </h1>
            <span className="hidden sm:inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Question {currentIndex + 1} / {session.total_questions}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Countdown Timer with Server Time */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-base sm:text-lg font-extrabold shadow-xs transition-all ${
                isLowTime
                  ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse dark:bg-rose-950/40 dark:border-rose-900"
                  : "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-300"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Submit Exam Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resumed Attempt Banner */}
      {isResumed && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span>
                <strong>Resumed Active Attempt:</strong> Your answers, progress, and server timer were successfully restored.
              </span>
            </div>
            <button
              onClick={() => setIsResumed(false)}
              className="text-blue-500 hover:text-blue-800 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Auto-Submit Notice Overlay */}
      {autoSubmitNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Bell className="h-7 w-7 animate-bounce" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Time Expired!
            </h3>
            <p className="text-xs text-slate-500">
              {autoSubmitNotice}
            </p>
            <div className="pt-2">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Area (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            {/* Question Stem Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-xs">
                  {currentIndex + 1}
                </span>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Multiple Select Question (MSQ)
                </span>
              </div>

              {isCurrentMarked && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <Bookmark className="h-3 w-3 fill-amber-600 text-amber-600" />
                  Marked for Review
                </span>
              )}
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentQuestion?.question_text}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  currentQuestion?.question_type === "MCQ"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                }`}
              >
                {currentQuestion?.question_type === "MCQ" ? "MCQ (Single Choice)" : "MSQ (Multiple Select)"}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {currentQuestion?.question_type === "MCQ"
                  ? "Select the single best answer:"
                  : "Select all options that apply:"}
              </span>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQuestion?.options.map((optText, optIdx) => {
                const label = currentQuestion.option_labels[optIdx] || String.fromCharCode(65 + optIdx);
                const isSelected = currentSelectedAnswers.includes(label);
                const isMCQ = currentQuestion?.question_type === "MCQ";

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleToggleOption(currentQuestion.question_id, label)}
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all active:scale-[0.99] select-none ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 shadow-xs dark:border-blue-500 dark:bg-blue-950/40"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="pt-0.5">
                      {isMCQ ? (
                        isSelected ? (
                          <CircleDot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400" />
                        )
                      ) : (
                        isSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )
                      )}
                    </div>

                    <div className="flex-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-normal">
                      <span className="font-bold mr-2 text-slate-900 dark:text-white">
                        {label}.
                      </span>
                      {optText}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions for Active Question */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    isCurrentMarked
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <Bookmark
                    className={`h-3.5 w-3.5 ${
                      isCurrentMarked ? "fill-amber-600 text-amber-600" : ""
                    }`}
                  />
                  {isCurrentMarked ? "Marked" : "Mark for Review"}
                </button>

                {currentSelectedAnswers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCurrentAnswer}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Clear Answer
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
                  className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={currentIndex === session.total_questions - 1}
                  onClick={() =>
                    handleNavigateQuestion(
                      Math.min(session.total_questions - 1, currentIndex + 1)
                    )
                  }
                  className="flex items-center gap-1 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Question Navigation Panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                Question Palette
              </h3>
              <span className="text-xs text-slate-500">
                {answeredCount}/{session.total_questions} done
              </span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span>Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                <span>Unanswered</span>
              </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {session.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = (answers[q.question_id] || []).length > 0;
                const isMarked = markedForReview.has(q.question_id);

                let badgeClass =
                  "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

                if (isCurrent) {
                  badgeClass =
                    "border-2 border-blue-600 bg-blue-600 text-white font-extrabold shadow-sm";
                } else if (isMarked) {
                  badgeClass =
                    "border border-amber-400 bg-amber-500 text-white font-bold";
                } else if (isAnswered) {
                  badgeClass =
                    "border border-emerald-500 bg-emerald-600 text-white font-bold";
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleNavigateQuestion(idx)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs transition-all active:scale-95 ${badgeClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Quick Summary */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Answered:</span>
                <span className="font-bold text-emerald-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unanswered:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {unansweredCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Marked for Review:</span>
                <span className="font-bold text-amber-600">{reviewCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Are you sure you want to submit?
                </h3>
                <p className="text-xs text-slate-500">
                  Your attempt will be finalized and graded immediately.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Questions:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {session.total_questions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Answered:</span>
                <span className="font-bold text-emerald-600">
                  {answeredCount} / {session.total_questions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Unanswered:</span>
                <span className="font-bold text-rose-600">{unansweredCount}</span>
              </div>
              {reviewCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Marked for Review:</span>
                  <span className="font-bold text-amber-600">{reviewCount}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeSubmission(false)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? "Grading..." : "Confirm & Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
