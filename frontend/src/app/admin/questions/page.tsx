"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getQuestions,
  createQuestions,
  updateQuestion,
  deleteQuestion,
  deleteQuestionsBulk,
  deleteAllQuestions,
  createExam,
} from "@/lib/api";
import { Question } from "@/types";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  Upload,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Layers,
  ArrowLeft,
} from "lucide-react";

export default function AdminQuestionsPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Question | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // Edit / Add modal state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New question form state
  const [newQText, setNewQText] = useState("");
  const [newQOptions, setNewQOptions] = useState<string[]>([
    "Option A",
    "Option B",
    "Option C",
    "Option D",
  ]);
  const [newQAnswers, setNewQAnswers] = useState<string[]>(["A", "B"]);
  const [newQExplanation, setNewQExplanation] = useState("");

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin/questions");
      } else if (!isAdmin) {
        router.push("/dashboard");
      } else {
        loadQuestions();
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getQuestions(search);
      setQuestions(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to load questions from question bank.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const timer = setTimeout(() => {
        loadQuestions();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, isAdmin]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 1. Single question delete
  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    try {
      setIsProcessingDelete(true);
      await deleteQuestion(singleDeleteTarget.id);
      setQuestions((prev) => prev.filter((q) => q.id !== singleDeleteTarget.id));
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteTarget.id));
      setSingleDeleteTarget(null);
      setSuccessMsg(`Question #${singleDeleteTarget.id} deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete question");
    } finally {
      setIsProcessingDelete(false);
    }
  };

  // 2. Bulk delete selected questions
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsProcessingDelete(true);
      const res = await deleteQuestionsBulk(selectedIds);
      setQuestions((prev) => prev.filter((q) => !selectedIds.includes(q.id)));
      const count = selectedIds.length;
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      setSuccessMsg(res.message || `${count} questions deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to bulk delete questions");
    } finally {
      setIsProcessingDelete(false);
    }
  };

  // 3. Delete ALL questions
  const handleConfirmDeleteAll = async () => {
    try {
      setIsProcessingDelete(true);
      const res = await deleteAllQuestions();
      setQuestions([]);
      setSelectedIds([]);
      setIsDeleteAllModalOpen(false);
      setSuccessMsg(res.message || "All questions have been deleted from Question Bank.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete all questions");
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleStartExamWithSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least 1 question to start an exam.");
      return;
    }
    try {
      const exam = await createExam({
        title: `Custom Bank Exam (${selectedIds.length} Questions)`,
        question_ids: selectedIds,
        time_limit: Math.max(5, selectedIds.length * 2),
        randomize_questions: false,
        randomize_options: false,
      });
      router.push(`/exam/${exam.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create exam");
    }
  };

  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) return;
    try {
      await createQuestions([
        {
          question_text: newQText.trim(),
          question_type: newQAnswers.length > 1 ? "MSQ" : "MCQ",
          options: newQOptions,
          correct_answers: newQAnswers,
          explanation: newQExplanation.trim() || null,
        },
      ]);
      setIsAddModalOpen(false);
      setNewQText("");
      setNewQOptions(["Option A", "Option B", "Option C", "Option D"]);
      setNewQAnswers(["A", "B"]);
      setNewQExplanation("");
      setSuccessMsg("Question created successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
      loadQuestions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create question");
    }
  };

  const handleUpdateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      const updated = await updateQuestion(editingQuestion.id, {
        question_text: editingQuestion.question_text,
        question_type: editingQuestion.correct_answers.length > 1 ? "MSQ" : "MCQ",
        options: editingQuestion.options,
        correct_answers: editingQuestion.correct_answers,
        explanation: editingQuestion.explanation,
      });
      setQuestions((prev) =>
        prev.map((q) => (q.id === updated.id ? updated : q))
      );
      setEditingQuestion(null);
      setSuccessMsg("Question updated successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update question");
    }
  };

  const isAllSelected = questions.length > 0 && selectedIds.length === questions.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < questions.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-blue-600" />
            Question Bank Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Full repository controls: Individual delete, bulk deletion, and bank wipe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/upload"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Document
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300"
          >
            <Plus className="h-3.5 w-3.5" />
            New Question
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleStartExamWithSelected}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              Exam ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Filter and Bulk Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by keyword or topic..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Selection & Deletion controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Select All Checkbox */}
          <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isSomeSelected;
                }
              }}
              onChange={handleToggleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Select All ({questions.length})</span>
          </label>

          {/* Conditional Bulk Delete Buttons */}
          {selectedIds.length > 0 && !isAllSelected && (
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          )}

          {/* When All Questions are selected, display Delete All button */}
          {isAllSelected && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:bg-rose-800 transition-colors cursor-pointer animate-pulse"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete All Questions
            </button>
          )}

          {/* Standalone Delete All trigger option when questions exist */}
          {questions.length > 0 && !isAllSelected && selectedIds.length === 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-600 px-2 py-1 text-xs"
              title="Delete all questions in bank"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Wipe Bank
            </button>
          )}
        </div>
      </div>

      {/* Questions Listing */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm">Loading questions from bank...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Question Bank is Empty
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Upload questions from PDF, DOCX, or DOC documents, or create your first question manually.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/admin/upload"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
            >
              Upload Document
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Add Question Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const isSelected = selectedIds.includes(q.id);
            return (
              <div
                key={q.id}
                className={`rounded-2xl border p-5 shadow-xs transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/20 dark:border-blue-700 dark:bg-blue-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(q.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          #{q.id}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            q.question_type === "MSQ"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {q.question_type}
                        </span>
                        {q.source_file && (
                          <span className="text-xs text-slate-400 truncate max-w-xs">
                            Source: {q.source_file}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Question"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSingleDeleteTarget(q)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {q.question_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = q.correct_answers.includes(letter);
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium dark:bg-emerald-950/40 dark:text-emerald-200"
                                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && (
                              <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        <strong className="not-italic text-slate-600 dark:text-slate-300">
                          Explanation:
                        </strong>{" "}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 1. Single Delete Confirmation Modal */}
      {singleDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Question
                </h3>
                <p className="text-xs text-slate-500">Question #{singleDeleteTarget.id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this question?
            </p>
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 italic border dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              &ldquo;{singleDeleteTarget.question_text}&rdquo;
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isProcessingDelete}
                onClick={() => setSingleDeleteTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingDelete}
                onClick={handleConfirmSingleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isProcessingDelete ? "Deleting..." : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Bulk Delete Selected Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Selected Questions
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedIds.length} question(s) selected
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently remove the {selectedIds.length} selected
              questions from the Question Bank?
            </p>
            <p className="text-xs text-slate-500">
              Note: Historical student exam attempts will remain preserved.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isProcessingDelete}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingDelete}
                onClick={handleConfirmBulkDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isProcessingDelete
                  ? "Deleting..."
                  : `Delete ${selectedIds.length} Questions`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete ALL Questions Strong Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 space-y-5 border-2 border-rose-500 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/70">
                <AlertTriangle className="h-7 w-7 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-600 uppercase tracking-tight">
                  Danger: Delete All Questions
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {questions.length} total questions in repository
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 p-4 text-xs sm:text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 space-y-2 border border-rose-200 dark:border-rose-900">
              <p className="font-bold">
                Are you sure you want to delete all questions? This action cannot be undone.
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                All {questions.length} questions currently stored in the Question Bank will be
                permanently purged. Student exam attempts and history will remain intact.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isProcessingDelete}
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel / Keep Questions
              </button>
              <button
                type="button"
                disabled={isProcessingDelete}
                onClick={handleConfirmDeleteAll}
                className="rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-800 disabled:opacity-50"
              >
                {isProcessingDelete ? "Purging Repository..." : "Yes, Delete All Questions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Edit Question #{editingQuestion.id}
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  value={editingQuestion.question_text}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question_text: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Options & Correct Answers (Click letter to toggle)
                </label>
                <div className="space-y-2">
                  {editingQuestion.options.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect =
                      editingQuestion.correct_answers.includes(letter);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const answersSet = new Set(
                              editingQuestion.correct_answers
                            );
                            if (answersSet.has(letter)) {
                              answersSet.delete(letter);
                            } else {
                              answersSet.add(letter);
                            }
                            setEditingQuestion({
                              ...editingQuestion,
                              correct_answers: Array.from(answersSet).sort(),
                            });
                          }}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold text-xs ${
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[oIdx] = e.target.value;
                            setEditingQuestion({
                              ...editingQuestion,
                              options: newOpts,
                            });
                          }}
                          className="flex-1 rounded-xl border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Explanation
                </label>
                <input
                  type="text"
                  value={editingQuestion.explanation || ""}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      explanation: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add New Question
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={newQText}
                  placeholder="e.g. Which of the following are network protocols?"
                  onChange={(e) => setNewQText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600">
                    Options & Correct Answers (Click letter to toggle)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextLetter = String.fromCharCode(65 + newQOptions.length);
                      setNewQOptions([...newQOptions, `Option ${nextLetter}`]);
                    }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Option
                  </button>
                </div>

                <div className="space-y-2">
                  {newQOptions.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect = newQAnswers.includes(letter);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const answersSet = new Set(newQAnswers);
                            if (answersSet.has(letter)) {
                              answersSet.delete(letter);
                            } else {
                              answersSet.add(letter);
                            }
                            setNewQAnswers(Array.from(answersSet).sort());
                          }}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded font-bold text-xs ${
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...newQOptions];
                            newOpts[oIdx] = e.target.value;
                            setNewQOptions(newOpts);
                          }}
                          className="flex-1 rounded-xl border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Explanation (Optional)
                </label>
                <input
                  type="text"
                  value={newQExplanation}
                  placeholder="Reasoning for correct answers..."
                  onChange={(e) => setNewQExplanation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Create Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
