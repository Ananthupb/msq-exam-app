"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  FileText,
  Upload,
  BookOpen,
  History,
  Play,
  Layers,
  Shield,
  Users,
  User as UserIcon,
  LogOut,
  LogIn,
  Settings,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Dynamic Navigation Items based on Role
  const navItems = isAdmin
    ? [
        { href: "/admin", label: "Admin", icon: Shield },
        { href: "/admin/questions", label: "Questions", icon: BookOpen },
        { href: "/admin/upload", label: "Upload", icon: Upload },
        { href: "/admin/exams", label: "Exams", icon: Layers },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/attempts", label: "Attempts", icon: History },
      ]
    : user
    ? [
        { href: "/dashboard", label: "My Dashboard", icon: Layers },
        { href: "/dashboard/practice", label: "Create Practice Test", icon: Upload },
        { href: "/dashboard/questions", label: "My Questions", icon: BookOpen },
        { href: "/exam/configure", label: "Take Exam", icon: Play },
        { href: "/history", label: "My History", icon: History },
      ]
    : [
        { href: "/", label: "Home", icon: Layers },
        { href: "/exam/configure", label: "Take Exam", icon: Play },
        { href: "/history", label: "History", icon: History },
      ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href={user ? (isAdmin ? "/admin" : "/dashboard") : "/"}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                MSQ Exam
              </span>
              <span
                className={`ml-2 rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${
                  isAdmin
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {isAdmin ? "Admin" : user ? "Student" : "App"}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right action & user profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user.username}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                href="/exam/configure"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                Start Exam
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
