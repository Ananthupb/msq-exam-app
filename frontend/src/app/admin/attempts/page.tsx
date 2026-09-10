"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getAdminAttempts, deleteAttempt } from "@/lib/api";
import { ExamAttempt } from "@/types";
import {
  FileCheck,
  Search,
  Trash2,
  ExternalLink,
  Clock,
  ArrowLeft,
  AlertCircle,
  Check,
} from "lucide-react";

export default function AdminAttemptsPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deletion modal
  const [attemptToDelete, setAttemptToDelete] = useState<ExamAttempt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin/attempts");
      } else if (!isAdmin) {
        router.push("/dashboard");
      } else {
        loadAttempts();
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getAdminAttempts();
      setAttempts(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load attempts");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!attemptToDelete) return;
    try {
      setIsDeleting(true);
      await deleteAttempt(attemptToDelete.id);
      setAttempts(attempts.filter((a) => a.id !== attemptToDelete.id));
      setAttemptToDelete(null);
      setSuccessMsg("Attempt deleted from system audit logs.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete attempt");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAttempts = attempts.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.exam_title.toLowerCase().includes(q) ||
      (a.username && a.username.toLowerCase().includes(q)) ||
      String(a.id).includes(q)
    );
  });

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
            <FileCheck className="h-7 w-7 text-amber-500" />
            Exam Attempts Audit
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            System-wide log of all completed and submitted MSQ examinations across all student accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span>{attempts.length} Total Submissions</span>
        </div>
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

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student username, exam title, or attempt #..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm">Loading submissions...</p>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm">No exam attempts found matching query.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3.5">Attempt #</th>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Exam</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Breakdown</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAttempts.map((attempt) => (
                  <tr
                    key={attempt.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-400">
                      #{attempt.id}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                      {attempt.username || `User #${attempt.user_id || "Guest"}`}
                    </td>
                    <td className="px-5 py-3.5">{attempt.exam_title}</td>
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-semibold">✓ {attempt.correct}</span>
                        <span className="text-rose-600 font-semibold">✗ {attempt.wrong}</span>
                        <span className="text-slate-400">- {attempt.skipped}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {Math.floor(attempt.time_taken / 60)}m {attempt.time_taken % 60}s
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(attempt.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/results/${attempt.id}`}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                        >
                          Review
                        </Link>
                        <button
                          onClick={() => setAttemptToDelete(attempt)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete Attempt Record"
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

      {/* Delete Confirmation Modal */}
      {attemptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Attempt Record
                </h3>
                <p className="text-xs text-slate-500">Attempt #{attemptToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete attempt #{attemptToDelete.id} for student &ldquo;
              <strong>{attemptToDelete.username || `User #${attemptToDelete.user_id}`}</strong>&rdquo;?
              This will remove their submission from system reports. The original exam and question
              bank will not be affected.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAttemptToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Attempt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
