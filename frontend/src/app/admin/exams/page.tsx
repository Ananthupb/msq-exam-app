"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getExams, createExam, deleteExam, getQuestions } from "@/lib/api";
import { Exam, Question } from "@/types";
import {
  Layers,
  Plus,
  Trash2,
  Play,
  Clock,
  Shuffle,
  AlertCircle,
  Check,
  ArrowLeft,
  X,
} from "lucide-react";

export default function AdminExamsPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Exam Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<number | "custom">(20);
  const [customDuration, setCustomDuration] = useState<number>(15);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin/exams");
      } else if (!isAdmin) {
        router.push("/dashboard");
      } else {
        loadData();
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [examsData, questionsData] = await Promise.all([
        getExams(),
        getQuestions().catch(() => []),
      ]);
      setExams(examsData);
      setQuestions(questionsData);
      if (questionsData.length > 0) {
        setQuestionCount(Math.min(10, questionsData.length));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const duration =
      selectedDurationPreset === "custom"
        ? Math.max(1, customDuration)
        : selectedDurationPreset;

    try {
      setIsSubmitting(true);
      const created = await createExam({
        title: title.trim(),
        question_count: questionCount,
        time_limit: duration,
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,
      });
      setExams([created, ...exams]);
      setIsModalOpen(false);
      setTitle("");
      setSuccessMsg(`Exam "${created.title}" published successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      setIsDeleting(true);
      await deleteExam(examToDelete.id);
      setExams(exams.filter((e) => e.id !== examToDelete.id));
      setExamToDelete(null);
      setSuccessMsg("Exam deleted successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete exam");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="h-7 w-7 text-indigo-600" />
            Exam Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Publish standard exam modules, adjust duration limits, and configure student test settings.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create New Exam
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
          <Check className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm">Loading exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Layers className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Published Exams
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Create an exam module from questions in your Question Bank ({questions.length} available).
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              Create First Exam
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-slate-400">Exam #{exam.id}</span>
                <button
                  onClick={() => setExamToDelete(exam)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Delete Exam"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  {exam.title}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-blue-600">
                    <Clock className="h-3.5 w-3.5" />
                    {exam.time_limit} mins
                  </span>
                  <span>•</span>
                  <span>{exam.total_questions} Questions</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <Shuffle className="h-3 w-3" />
                  {exam.randomize_questions ? "Shuffled Qs" : "Sequential Qs"}
                </span>
                <span>•</span>
                <span>Created {new Date(exam.created_at).toLocaleDateString()}</span>
              </div>

              <div className="pt-2">
                <Link
                  href={`/exam/${exam.id}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-50 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-blue-700" />
                  Test Take Exam
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Create New Exam Module
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm MSQ Examination 2026"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600">
                    Question Count
                  </label>
                  <span className="text-xs text-slate-400">
                    {questions.length} available in bank
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, questions.length)}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Time Configuration Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Exam Duration (Server-Enforced Timer)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                  {[5, 10, 20, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSelectedDurationPreset(mins)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        selectedDurationPreset === mins
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shadow-xs"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedDurationPreset("custom")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      selectedDurationPreset === "custom"
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {selectedDurationPreset === "custom" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={customDuration}
                      onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                      className="w-32 rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <span className="text-xs text-slate-500 font-medium">minutes</span>
                  </div>
                )}
              </div>

              {/* Randomization Options */}
              <div className="space-y-2 pt-2 border-t dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Randomize Question Order per student</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Randomize Option Choices (A, B, C, D) per student</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Publishing..." : "Publish Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Module
                </h3>
                <p className="text-xs text-slate-500">Exam #{examToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete exam &ldquo;
              <strong>{examToDelete.title}</strong>&rdquo;? The original questions in the
              Question Bank and student attempt records will remain safe.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setExamToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteExam}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
