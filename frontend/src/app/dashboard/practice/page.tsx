"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  uploadDocument,
  parseRawText,
  generateQuestionsByTopic,
  createQuestions,
  createExam,
} from "@/lib/api";
import { ParsedQuestion } from "@/types";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Play,
  Save,
  HelpCircle,
  ArrowLeft,
  Clock,
  Shuffle,
  Info,
  Sparkles,
  BookOpen,
  Check,
  X,
} from "lucide-react";

export default function CreatePracticeTestPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [notesNotice, setNotesNotice] = useState<string | null>(null);

  // Extracted questions state
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [sourceFilename, setSourceFilename] = useState<string>("");

  // Editing single question modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Creation mode: "upload" or "topic"
  const [creationMode, setCreationMode] = useState<"upload" | "topic">("upload");
  const [topicInput, setTopicInput] = useState("");
  const [topicQuestionCount, setTopicQuestionCount] = useState<number>(10);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);

  // Exam Settings
  const [examTitle, setExamTitle] = useState("");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<number | "custom">(20);
  const [customDuration, setCustomDuration] = useState<number>(15);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [isStarting, setIsStarting] = useState(false);


  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/dashboard/practice");
    }
  }, [user, isLoading, router]);

  const validateFile = (file: File): string | null => {
    const validExtensions = [".pdf", ".docx", ".doc"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      return `Unsupported file format "${fileExt}". Please upload a .pdf, .docx, or .doc file.`;
    }
    if (file.size > 15 * 1024 * 1024) {
      return "File size exceeds 15MB limit.";
    }
    return null;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      if (error) {
        setErrorMsg(error);
        return;
      }
      setSelectedFile(file);
      processUpload(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);
      if (error) {
        setErrorMsg(error);
        return;
      }
      setSelectedFile(file);
      processUpload(file);
    }
  };

  const processUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNotesNotice(null);

    try {
      const res = await uploadDocument(file);
      setSourceFilename(res.filename);
      setExamTitle(`Practice Test: ${res.filename.replace(/\.[^/.]+$/, "")}`);

      if (res.is_study_notes_only || res.total_questions_detected === 0) {
        setQuestions([]);
        setSelectedIndices([]);
        setNotesNotice(
          res.message ||
            "This document contains study material or notes without structured question/answer keys. Automatic question synthesis from raw notes requires an AI question generator. You can add questions manually below or upload a document with formatted questions and answers."
        );
      } else {
        setQuestions(res.questions);
        setSelectedIndices(res.questions.map((_, idx) => idx));
        setQuestionCount(Math.min(10, res.questions.length));
        setSuccessMsg(
          `Identified ${res.total_questions_detected} Multiple Select Questions from "${res.filename}"!`
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateByTopic = async (topicOverride?: string) => {
    const targetTopic = (topicOverride || topicInput).trim();
    if (!targetTopic) {
      setErrorMsg("Please enter a topic name (e.g. Computer Networking, Operating Systems).");
      return;
    }

    setIsGeneratingTopic(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNotesNotice(null);

    try {
      const count = Math.max(1, Math.min(50, topicQuestionCount || 10));
      const res = await generateQuestionsByTopic({ topic: targetTopic, count });
      setSourceFilename(`topic_${targetTopic.toLowerCase().replace(/\s+/g, "_")}`);
      setExamTitle(`Practice Test: ${targetTopic}`);
      setQuestions(res.questions);
      setSelectedIndices(res.questions.map((_, idx) => idx));
      setQuestionCount(Math.min(10, res.questions.length));
      setSuccessMsg(
        `Generated ${res.total_generated} questions on "${targetTopic}" ready for practice!`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate questions for topic.");
    } finally {
      setIsGeneratingTopic(false);
    }
  };


  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIndices.length === questions.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(questions.map((_, idx) => idx));
    }
  };

  const handleToggleSelect = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIndices.length === 0) return;
    const remaining = questions.filter((_, idx) => !selectedIndices.includes(idx));
    setQuestions(remaining);
    setSelectedIndices(remaining.map((_, idx) => idx));
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
    setSelectedIndices((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  const handleAddManualQuestion = () => {
    const newQ: ParsedQuestion = {
      question: "Enter your practice question here...",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_answers: ["A", "B"],
      explanation: "Explanation of why these options are correct.",
      type: "MSQ",
    };
    const newQuestions = [...questions, newQ];
    setQuestions(newQuestions);
    setSelectedIndices([...selectedIndices, newQuestions.length - 1]);
    setEditingIndex(newQuestions.length - 1);
    setNotesNotice(null);
  };

  // Start Practice Test Handler
  const handleStartPracticeTest = async () => {
    const questionsToInclude = questions.filter((_, idx) => selectedIndices.includes(idx));
    if (questionsToInclude.length === 0) {
      alert("Please select at least 1 question for your practice test.");
      return;
    }

    const duration =
      selectedDurationPreset === "custom"
        ? Math.max(1, customDuration)
        : selectedDurationPreset;

    try {
      setIsStarting(true);
      setErrorMsg(null);

      // 1. Save selected questions to User's Personal Question Bank
      const payload = questionsToInclude.map((q) => ({
        question_text: q.question,
        question_type: q.type,
        options: q.options,
        correct_answers: q.correct_answers.length > 0 ? q.correct_answers : ["A"],
        explanation: q.explanation || null,
        source_filename: sourceFilename || "personal_practice_upload",
        source_type: "user_upload",
      }));

      const savedQuestions = await createQuestions(payload);
      const questionIds = savedQuestions.map((q) => q.id);

      // 2. Publish Personal Practice Test
      const effectiveCount = Math.min(questionCount, questionIds.length);
      const exam = await createExam({
        title: examTitle.trim() || `Personal Practice Test (${effectiveCount} Qs)`,
        question_ids: questionIds,
        question_count: effectiveCount,
        time_limit: duration,
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,
        is_practice: true,
      });

      // 3. Immediately launch exam room
      router.push(`/exam/${exam.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create practice test");
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Sparkles className="h-7 w-7 text-blue-600" />
          Upload & Create Practice Test
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Upload your study document (Computer Science, Networking, Cybersecurity, Banking, Math, etc.)
          to extract MSQs, configure your timer, and practice.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP 1: Question Source Selection (Upload or Topic) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              1
            </span>
            Choose Question Source
          </h2>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setCreationMode("upload")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                creationMode === "upload"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload PDF / DOCX
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("topic")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                creationMode === "topic"
                  ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              Practice by Topic
            </button>
          </div>
        </div>

        {/* MODE A: Upload Document */}
        {creationMode === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
                  : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc"
                className="hidden"
              />

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300 group-hover:scale-105 transition-transform">
                {isProcessing ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                ) : (
                  <Upload className="h-7 w-7" />
                )}
              </div>

              <p className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                {isProcessing
                  ? "Parsing questions from document..."
                  : selectedFile
                  ? selectedFile.name
                  : "Click to upload or drag & drop PDF/DOCX file"}
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Upload your study material or past questions from any subject: Computer Science, Banking, Networking,
                Cybersecurity, Medical, Math, etc.
              </p>
            </div>

            {/* Popular subject tags */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-500">Supported Formats:</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">.PDF</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">.DOCX</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">.DOC</span>
            </div>
          </div>
        )}

        {/* MODE B: Practice by Topic */}
        {creationMode === "topic" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 dark:border-purple-900/40 dark:bg-purple-950/20 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                  Enter Any Study Topic
                </label>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Generate instant MSQ questions tailored to your field of study. No admin questions needed!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerateByTopic()}
                    placeholder="e.g. Computer Networking, Operating Systems, Cybersecurity, Banking"
                    className="w-full rounded-xl border border-purple-300 bg-white p-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 dark:border-purple-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <select
                    value={topicQuestionCount}
                    onChange={(e) => setTopicQuestionCount(parseInt(e.target.value) || 10)}
                    className="w-full rounded-xl border border-purple-300 bg-white p-3 text-sm font-semibold text-slate-900 dark:border-purple-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>
              </div>

              {/* Quick Topic Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-500">Quick Topics:</span>
                {[
                  "Bank Exams",
                  "Banking & Finance",
                  "Computer Networking",
                  "Cybersecurity",
                  "Operating Systems",
                  "Data Structures",
                  "Mathematics",
                ].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTopicInput(t);
                      handleGenerateByTopic(t);
                    }}
                    className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 hover:border-purple-300 dark:border-purple-800 dark:bg-slate-900 dark:text-purple-300 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGenerateByTopic()}
                  disabled={isGeneratingTopic}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-extrabold text-white shadow-md shadow-purple-500/25 hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isGeneratingTopic ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGeneratingTopic ? "Generating Questions..." : "Generate Practice Questions"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informational Study Notes Notice (When 0 questions detected) */}
      {notesNotice && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 dark:border-blue-900/50 dark:bg-blue-950/30 space-y-4">
          <div className="flex items-start gap-3 text-blue-900 dark:text-blue-200">
            <Info className="h-6 w-6 shrink-0 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold">Study Notes Detected (No Structured Questions)</h3>
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                {notesNotice}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
            <button
              onClick={handleAddManualQuestion}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Question Manually
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Another Document
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Extracted Questions Preview & Edit */}
      {questions.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  2
                </span>
                Questions Found ({questions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Select questions to include, edit option texts, or delete unwanted questions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="font-bold text-blue-600 hover:underline px-2 py-1"
              >
                {selectedIndices.length === questions.length ? "Deselect All" : "Select All"}
              </button>
              {selectedIndices.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected ({selectedIndices.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleAddManualQuestion}
                className="flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Question
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/20 dark:border-blue-700 dark:bg-blue-950/20"
                      : "border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(idx)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              q.type === "MCQ"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {q.type === "MCQ" ? "MCQ (1 Answer)" : "MSQ (Multi-Select)"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingIndex(idx)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                            title="Edit Question"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Delete Question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {q.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.correct_answers.includes(letter);
                          return (
                            <div
                              key={oIdx}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${
                                isCorrect
                                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="truncate">{opt}</span>
                              {isCorrect && (
                                <Check className="h-3 w-3 text-emerald-600 ml-auto shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
                          <strong>Note:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Exam Settings & Start Test */}
      {questions.length > 0 && selectedIndices.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                3
              </span>
              Exam Configuration & Start Test
            </h2>
            <span className="text-xs font-bold text-blue-600">
              {selectedIndices.length} Questions Selected
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Practice Test Title
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. My Computer Science MSQ Practice"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Number of Questions to Pick
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedIndices.length}
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(
                      Math.max(1, Math.min(selectedIndices.length, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Time Limit Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Time Limit
                </label>
                <div className="grid grid-cols-6 gap-1.5">
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
                      className="w-28 rounded-xl border border-slate-300 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <span className="text-xs text-slate-500">minutes</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Randomize Questions</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomizeOptions}
                  onChange={(e) => setRandomizeOptions(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Randomize Options</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleStartPracticeTest}
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-extrabold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isStarting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  Start Practice Test
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingIndex !== null && questions[editingIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Question #{editingIndex + 1}
              </h3>
              <button
                onClick={() => setEditingIndex(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  value={questions[editingIndex].question}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[editingIndex].question = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Options & Correct Answers (Click letter to toggle)
                </label>
                <div className="space-y-2">
                  {questions[editingIndex].options.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isCorrect =
                      questions[editingIndex].correct_answers.includes(letter);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...questions];
                            const answersSet = new Set(updated[editingIndex].correct_answers);
                            if (answersSet.has(letter)) {
                              answersSet.delete(letter);
                            } else {
                              answersSet.add(letter);
                            }
                            updated[editingIndex].correct_answers = Array.from(answersSet).sort();
                            updated[editingIndex].type =
                              updated[editingIndex].correct_answers.length > 1 ? "MSQ" : "MCQ";
                            setQuestions(updated);
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
                            const updated = [...questions];
                            updated[editingIndex].options[oIdx] = e.target.value;
                            setQuestions(updated);
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
                  value={questions[editingIndex].explanation || ""}
                  onChange={(e) => {
                    const updated = [...questions];
                    updated[editingIndex].explanation = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Done Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
