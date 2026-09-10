"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Play,
  Shuffle,
  Clock,
  ListOrdered,
  BookOpen,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { getQuestions, createExam } from "@/lib/api";
import { Question } from "@/types";

export default function ExamConfigurePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("MSQ Practice Exam");
  const [questionCountType, setQuestionCountType] = useState<string>("all");
  const [customQuestionCount, setCustomQuestionCount] = useState<number>(10);
  const [timeLimitType, setTimeLimitType] = useState<string>("10");
  const [customTimeLimit, setCustomTimeLimit] = useState<number>(15);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getQuestions();
        setQuestions(data);
        if (data.length > 0) {
          setTitle(`MSQ Practice Exam (${new Date().toLocaleDateString()})`);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg("Failed to connect to backend service.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getEffectiveQuestionCount = (): number | undefined => {
    if (questionCountType === "all") return undefined;
    if (questionCountType === "custom") return Math.min(questions.length, customQuestionCount);
    return Math.min(questions.length, parseInt(questionCountType, 10));
  };

  const getEffectiveTimeLimit = (): number => {
    if (timeLimitType === "custom") return Math.max(1, customTimeLimit);
    return parseInt(timeLimitType, 10);
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) {
      setErrorMsg("Question bank is empty. Please upload or add questions first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const qCount = getEffectiveQuestionCount();
      const exam = await createExam({
        title: title.trim() || "MSQ Practice Exam",
        question_count: qCount,
        time_limit: getEffectiveTimeLimit(),
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,
      });

      router.push(`/exam/${exam.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to create exam session.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="h-7 w-7 text-blue-600" />
          Exam Settings & Configuration
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Customize your examination parameters before entering the testing environment.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm">Inspecting question bank...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Sparkles className="h-7 w-7 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              No Questions in Your Current Bank
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              You do NOT need Admin questions to practice! You can generate a practice test immediately
              by entering a topic or uploading your own study document (PDF/DOCX).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/practice"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Generate Practice Test by Topic / Upload
            </Link>
            <Link
              href="/dashboard/questions"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Manage Question Bank
            </Link>
          </div>
        </div>

      ) : (
        <form onSubmit={handleStartExam} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            {/* Exam Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Exam Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Computer Science MSQ Assessment"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Question Count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Number of Questions
                </label>
                <span className="text-xs text-blue-600 font-semibold">
                  {questions.length} total available in bank
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {["5", "10", "20", "30", "50", "all"].map((preset) => {
                  const isSelected = questionCountType === preset;
                  const label = preset === "all" ? "All" : preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuestionCountType(preset)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Time Limit (Minutes)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {["5", "10", "20", "30", "60", "custom"].map((preset) => {
                  const isSelected = timeLimitType === preset;
                  const label = preset === "custom" ? "Custom" : `${preset}m`;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimeLimitType(preset)}
                      className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {timeLimitType === "custom" && (
                <div className="mt-3">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={customTimeLimit}
                    onChange={(e) => setCustomTimeLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                  <span className="ml-2 text-xs text-slate-500">minutes</span>
                </div>
              )}
            </div>

            {/* Randomization Toggles */}
            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Randomize Questions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shuffle the order of questions in this exam session
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRandomizeQuestions(!randomizeQuestions)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    randomizeQuestions ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      randomizeQuestions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Randomize Options
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shuffle the choices (A, B, C, D) for each question
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRandomizeOptions(!randomizeOptions)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    randomizeOptions ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      randomizeOptions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" />
              {isSubmitting ? "Generating Session..." : "Begin Exam"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
