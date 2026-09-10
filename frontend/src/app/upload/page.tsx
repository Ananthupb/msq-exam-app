"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
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
  FileSpreadsheet,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { uploadDocument, parseRawText, createQuestions, createExam } from "@/lib/api";
import { ParsedQuestion } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function UploadPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Extracted/Edited Questions state
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [sourceFilename, setSourceFilename] = useState<string>("");

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/upload");
      } else if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    const validExtensions = [".pdf", ".docx", ".doc"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      return `Invalid file format "${fileExt}". Please upload a .pdf, .docx, or .doc file.`;
    }
    if (file.size > 15 * 1024 * 1024) {
      return "File size exceeds maximum limit of 15MB.";
    }
    return null;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const err = validateFile(file);
      if (err) {
        setErrorMsg(err);
        return;
      }
      setSelectedFile(file);
      processFileUpload(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const err = validateFile(file);
      if (err) {
        setErrorMsg(err);
        return;
      }
      setSelectedFile(file);
      processFileUpload(file);
    }
  };

  const processFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await uploadDocument(file);
      setQuestions(res.questions);
      setSourceFilename(res.filename);
      setSuccessMsg(
        `Successfully extracted ${res.total_questions_detected} questions from ${res.filename}!`
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to upload and parse the document.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processTextParse = async () => {
    if (!pastedText.trim()) {
      setErrorMsg("Please paste questions text to parse.");
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = await parseRawText(pastedText);
      if (parsed.length === 0) {
        setErrorMsg("No structured questions detected. Please check format.");
      } else {
        setQuestions(parsed);
        setSourceFilename("pasted_text");
        setSuccessMsg(`Successfully parsed ${parsed.length} questions from text!`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to parse text.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Question Manipulation ---
  const handleUpdateQuestionText = (index: number, newText: string) => {
    const updated = [...questions];
    updated[index].question = newText;
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, newOptionText: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = newOptionText;
    setQuestions(updated);
  };

  const handleToggleCorrectAnswer = (qIndex: number, letter: string) => {
    const updated = [...questions];
    const currentAnswers = new Set(updated[qIndex].correct_answers);
    if (currentAnswers.has(letter)) {
      currentAnswers.delete(letter);
    } else {
      currentAnswers.add(letter);
    }
    updated[qIndex].correct_answers = Array.from(currentAnswers).sort();
    updated[qIndex].type = updated[qIndex].correct_answers.length > 1 ? "MSQ" : "MCQ";
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const updated = [...questions];
    const nextLetter = String.fromCharCode(65 + updated[qIndex].options.length);
    updated[qIndex].options.push(`New Option ${nextLetter}`);
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) {
      alert("A question must have at least 2 options.");
      return;
    }
    const removedLetter = String.fromCharCode(65 + optIndex);
    updated[qIndex].options.splice(optIndex, 1);
    // Re-adjust correct answer letters
    updated[qIndex].correct_answers = updated[qIndex].correct_answers.filter(
      (ans) => ans !== removedLetter
    );
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleAddManualQuestion = () => {
    const newQ: ParsedQuestion = {
      question: "New Multiple Select Question Text?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_answers: ["A", "B"],
      explanation: "Explanation for why A and B are correct.",
      type: "MSQ",
    };
    setQuestions([...questions, newQ]);
  };

  const handleSaveToBank = async () => {
    if (questions.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const payload = questions.map((q) => ({
        question_text: q.question,
        question_type: q.type,
        options: q.options,
        correct_answers: q.correct_answers.length > 0 ? q.correct_answers : ["A"],
        explanation: q.explanation || null,
        source_file: sourceFilename,
      }));

      await createQuestions(payload);
      setSuccessMsg(
        `Saved ${questions.length} questions to the question bank successfully!`
      );
      setTimeout(() => {
        router.push("/questions");
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to save questions to database.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndStartExam = async () => {
    if (questions.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      // 1. Save questions first
      const payload = questions.map((q) => ({
        question_text: q.question,
        question_type: q.type,
        options: q.options,
        correct_answers: q.correct_answers.length > 0 ? q.correct_answers : ["A"],
        explanation: q.explanation || null,
        source_file: sourceFilename,
      }));

      const saved = await createQuestions(payload);
      const questionIds = saved.map((q) => q.id);

      // 2. Create exam session directly
      const examTitle = sourceFilename
        ? `Exam: ${sourceFilename.replace(/\.[^/.]+$/, "")}`
        : "Quick Practice Exam";

      const exam = await createExam({
        title: examTitle,
        question_ids: questionIds,
        time_limit: Math.max(5, questions.length * 2), // 2 mins per question default
        randomize_questions: false,
        randomize_options: false,
      });

      // 3. Jump right into exam
      router.push(`/exam/${exam.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to start exam with extracted questions.");
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Upload & Extract Questions
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload PDF, DOCX, or DOC documents containing study questions. Our engine
          will extract questions, options, and answers for immediate practice.
        </p>
      </div>

      {/* Tabs: File Upload vs Raw Text */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("file")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "file"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          Document File (.pdf, .docx, .doc)
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "text"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Direct Text Input
        </button>
      </div>

      {/* Upload or Text Box */}
      {activeTab === "file" ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 shadow-sm mb-4">
            <Upload className="h-8 w-8" />
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {selectedFile ? selectedFile.name : "Choose a file or drag & drop it here"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Supported formats: <strong className="text-slate-700 dark:text-slate-300">PDF, DOCX, DOC</strong> (Up to 15MB)
          </p>

          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Browse Files
          </button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Paste Questions Text
          </label>
          <textarea
            rows={8}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`1. Which of the following are operating systems?\nA. Windows\nB. Linux\nC. Chrome\nD. Ubuntu\nAnswer: A, B, D`}
            className="w-full font-mono text-sm rounded-lg border border-slate-300 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={processTextParse}
            disabled={isProcessing}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? "Parsing..." : "Parse Text"}
          </button>
        </div>
      )}

      {/* Alerts */}
      {isProcessing && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium">
            Processing document, extracting text and detecting MSQ questions...
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {/* Question Management / Preview Section */}
      {questions.length > 0 && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Preview & Manage Questions ({questions.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, edit question text, modify choices, or select correct answers before taking the exam.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAddManualQuestion}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Question
              </button>
              <button
                onClick={handleSaveToBank}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300"
              >
                <Save className="h-3.5 w-3.5" />
                Save to Bank
              </button>
              <button
                onClick={handleSaveAndStartExam}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                Start Exam Now
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                {/* Header: Question Number + Type + Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {qIdx + 1}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        q.type === "MSQ"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {q.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({q.correct_answers.length} correct answer
                      {q.correct_answers.length === 1 ? "" : "s"})
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Question Stem Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Question Text
                  </label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 font-medium dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-500">
                      Options & Correct Answers (Click letter to toggle correct)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddOption(qIdx)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Option
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((optText, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isCorrect = q.correct_answers.includes(letter);
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleCorrectAnswer(qIdx, letter)}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded font-bold text-xs shadow-xs transition-colors ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                            title={`Mark Option ${letter} as correct/incorrect`}
                          >
                            {letter}
                          </button>

                          <input
                            type="text"
                            value={optText}
                            onChange={(e) =>
                              handleUpdateOption(qIdx, optIdx, e.target.value)
                            }
                            className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveOption(qIdx, optIdx)}
                            className="text-slate-400 hover:text-rose-500 text-xs p-1"
                            title="Remove option"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Explanation (Optional)
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ""}
                    placeholder="Provide reasoning for correct answers..."
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qIdx].explanation = e.target.value;
                      setQuestions(updated);
                    }}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Action bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSaveToBank}
              disabled={isProcessing}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              Save All to Question Bank
            </button>
            <button
              onClick={handleSaveAndStartExam}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              <Play className="h-4 w-4 fill-white" />
              Start Exam Now ({questions.length} Questions)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
