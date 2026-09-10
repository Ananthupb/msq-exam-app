"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getAdminStats, getAdminAttempts } from "@/lib/api";
import { AdminStats, ExamAttempt } from "@/types";
import {
  ShieldAlert,
  BookOpen,
  Upload,
  FileCheck,
  Users,
  Award,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart3,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<ExamAttempt[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (!isAdmin) {
        router.push("/dashboard");
      } else {
        loadDashboard();
      }
    }
  }, [user, isAdmin, isLoading, router]);

  const loadDashboard = async () => {
    try {
      setLoadingData(true);
      const [statsData, attemptsData] = await Promise.all([
        getAdminStats(),
        getAdminAttempts().catch(() => []),
      ]);
      setStats(statsData);
      setRecentAttempts(attemptsData.slice(0, 6));
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoadingData(false);
    }
  };

  if (isLoading || loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading Administrator Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-0.5 text-xs font-semibold text-purple-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              Administrator Control Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Manage questions, bulk operations, document uploads, published exams, user
              roles, and audit student exam attempts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/upload"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Link>
            <Link
              href="/admin/questions"
              className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Question Bank
            </Link>
          </div>
        </div>
      </div>

      {/* Global Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Question Bank
              </span>
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.total_questions}
            </p>
            <span className="text-xs text-slate-400">Total stored MSQs</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Exams
              </span>
              <Layers className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.total_exams}
            </p>
            <span className="text-xs text-slate-400">Configured exams</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Users
              </span>
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.total_users}
            </p>
            <span className="text-xs text-slate-400">Registered accounts</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Submissions
              </span>
              <FileCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.total_attempts}
            </p>
            <span className="text-xs text-slate-400">Total completed tests</span>
          </div>

          <div className="col-span-2 lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Avg. Score
              </span>
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.average_score}%
            </p>
            <span className="text-xs text-slate-400">Systemwide average</span>
          </div>
        </div>
      )}

      {/* Admin Modules Quick Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Management Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link
            href="/admin/questions"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-blue-950 dark:text-blue-300">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              Question Bank Management
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Individual deletion, bulk select deletion, and complete bank wipe with confirmation dialogs.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              Manage Questions <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/upload"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-purple-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors dark:bg-purple-950 dark:text-purple-300">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
              Document Upload & Parser
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Upload PDF, DOCX, or DOC files with heuristic extraction into the shared Question Bank.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
              Upload Documents <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/exams"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors dark:bg-indigo-950 dark:text-indigo-300">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              Exam Management
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Create published exams, configure duration presets, question counts, and delete exam sets.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
              Configure Exams <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors dark:bg-emerald-950 dark:text-emerald-300">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              User Management
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              View registered users, change roles between Admin and User, and deactivate or delete accounts.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              Manage Users <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/attempts"
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-amber-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors dark:bg-amber-950 dark:text-amber-300">
              <FileCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
              Exam Attempts Audit
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              View all student test attempts across the system, audit scores, and inspect answers.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
              Audit Submissions <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Submissions Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Latest System Submissions
            </h2>
            <p className="text-xs text-slate-500">
              Real-time audit log of student exam attempts.
            </p>
          </div>
          <Link
            href="/admin/attempts"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View All Submissions
          </Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm">No exam submissions recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Exam Title</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentAttempts.map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {attempt.username || `User #${attempt.user_id || "Anon"}`}
                      </td>
                      <td className="px-4 py-3">{attempt.exam_title}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(attempt.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold ${
                            attempt.percentage >= 70
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {attempt.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-500">
                        {attempt.status.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/results/${attempt.id}`}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                        >
                          Inspect Result
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
