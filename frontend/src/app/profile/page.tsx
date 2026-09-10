"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Mail,
  Shield,
  Calendar,
  LogOut,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/profile");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-8">
        {/* Profile Header */}
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-md shadow-blue-500/20">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {user.username}
              </h1>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                  user.role === "admin"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {user.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <User className="h-4 w-4 text-blue-600" />
              Username
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {user.username}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Mail className="h-4 w-4 text-blue-600" />
              Email Address
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {user.email}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Shield className="h-4 w-4 text-blue-600" />
              Access Role
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {user.role} {user.role === "admin" ? "(Full Administrator)" : "(Student)"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Account Status
            </div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {user.is_active ? "Active & Verified" : "Suspended"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="h-4 w-4" />
            <span>Member since {new Date(user.created_at).toLocaleDateString()}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
