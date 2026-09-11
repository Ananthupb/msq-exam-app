"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  adminResetUserPassword,
} from "@/lib/api";
import { AdminUserListItem } from "@/types";
import {
  Users,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  ArrowLeft,
  UserCheck,
  UserX,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, isLoading } = useAuth();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete modal
  const [userToDelete, setUserToDelete] = useState<AdminUserListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset password modal
  const [userToResetPassword, setUserToResetPassword] = useState<AdminUserListItem | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

  const handleOpenResetModal = (targetUser: AdminUserListItem) => {
    setUserToResetPassword(targetUser);
    setResetNewPassword("");
    setResetConfirmPassword("");
    setShowResetPassword(false);
    setResetModalError(null);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword) return;
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetModalError("Password must be at least 6 characters long.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetModalError("Passwords do not match.");
      return;
    }

    try {
      setIsResetting(true);
      setResetModalError(null);
      const res = await adminResetUserPassword(userToResetPassword.id, resetNewPassword);
      setSuccessMsg(res.message || `Password for ${userToResetPassword.username} updated.`);
      setUserToResetPassword(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      setResetModalError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.push("/login?redirect=/admin/users");
      } else if (!isAdmin) {
        router.push("/dashboard");
      } else {
        loadUsers();
      }
    }
  }, [currentUser, isAdmin, isLoading, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (targetUser: AdminUserListItem) => {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    if (targetUser.id === currentUser?.id && newRole !== "admin") {
      alert("You cannot demote your own administrator account.");
      return;
    }

    try {
      await updateAdminUser(targetUser.id, { role: newRole });
      setUsers(
        users.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`User ${targetUser.username} role updated to ${newRole}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleToggleStatus = async (targetUser: AdminUserListItem) => {
    if (targetUser.id === currentUser?.id && targetUser.is_active) {
      alert("You cannot deactivate your own account.");
      return;
    }

    const nextStatus = !targetUser.is_active;
    try {
      await updateAdminUser(targetUser.id, { is_active: nextStatus });
      setUsers(
        users.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextStatus } : u))
      );
      setSuccessMsg(
        `User ${targetUser.username} ${nextStatus ? "activated" : "deactivated"}.`
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await deleteAdminUser(userToDelete.id);
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      setSuccessMsg("User account deleted successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
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
            <Users className="h-7 w-7 text-emerald-600" />
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit registered student and administrator accounts, change roles, and manage access.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span>{users.length} Total Users</span>
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

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm">Loading users list...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Attempts</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                              <span>{u.username}</span>
                              {isSelf && (
                                <span className="rounded-sm bg-blue-100 px-1 text-[10px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold uppercase transition-all ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          } ${!isSelf ? "hover:opacity-80 cursor-pointer" : ""}`}
                          title={isSelf ? "Cannot change own role" : "Click to toggle role"}
                        >
                          <Shield className="h-3 w-3" />
                          {u.role}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        {u.total_attempts} exams
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            u.is_active
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-rose-600 hover:text-rose-700"
                          } ${!isSelf ? "cursor-pointer" : ""}`}
                          title={isSelf ? "Cannot change own status" : "Click to toggle status"}
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" /> Suspended
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenResetModal(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Reset User Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {!isSelf ? (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset Password
                </h3>
                <p className="text-xs text-slate-500">
                  User: <span className="font-semibold text-slate-700 dark:text-slate-300">{userToResetPassword.username}</span> ({userToResetPassword.email})
                </p>
              </div>
            </div>

            {resetModalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{resetModalError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-10 py-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 dark:focus:border-amber-500 dark:focus:bg-slate-950 dark:focus:text-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-10 py-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 dark:focus:border-amber-500 dark:focus:bg-slate-950 dark:focus:text-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setUserToResetPassword(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-500/20"
                >
                  {isResetting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete User Account
                </h3>
                <p className="text-xs text-slate-500">User: {userToDelete.username}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete the user account for &ldquo;
              <strong>{userToDelete.username}</strong>&rdquo; ({userToDelete.email})? This action
              cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setUserToDelete(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteUser}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
