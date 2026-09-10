import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSQ Exam - Multiple Select Question Platform",
  description:
    "Upload documents (PDF, DOCX) to extract, edit, practice, and evaluate Multiple Select Questions (MSQ) with countdown timers and instant grading.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>MSQ Exam Application — Built for Local Offline & Cloud Deployment</span>
              <span>Pluggable QuestionGenerator Architecture (AI Ready)</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

