"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Upload,
  Trash2,
  KeyRound,
  Shield,
  Search,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Presentation,
  Link as LinkIcon,
  Edit3,
  Lock,
  Eye,
} from "lucide-react";
import ParticipantDetailModal from "@/components/ParticipantDetailModal";
import { UserAvatarButton } from "@/components/UserAvatarButton";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<any>(null);
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);

  // Create Form states
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("PARTICIPANT");

  // Edit Form states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("PARTICIPANT");
  const [editPassword, setEditPassword] = useState("");

  // Bulk upload state
  const [csvContent, setCsvContent] = useState("");
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Assign state
  const [targetSessionId, setTargetSessionId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const isAuthorizedRole = (role?: string) =>
    role === "FACILITATOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  const isAdminRole = (role?: string) =>
    role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("tgms_user_token");
      const rawUser = localStorage.getItem("tgms_user");
      let parsedUser: any = null;
      if (rawUser) {
        try {
          parsedUser = JSON.parse(rawUser);
          setCurrentUser(parsedUser);
        } catch (e) {}
      }
      if (token && parsedUser && isAuthorizedRole(parsedUser.role)) {
        setUserToken(token);
        loadData(token);
      } else {
        setLoading(false);
        setShowLoginModal(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");

      if (!isAuthorizedRole(data.user?.role)) {
        throw new Error(
          "Access denied. User Management is restricted to Facilitators and Administrators."
        );
      }

      localStorage.setItem("tgms_user_token", data.userToken);
      localStorage.setItem("tgms_user", JSON.stringify(data.user));

      setCurrentUser(data.user);
      setUserToken(data.userToken);
      setShowLoginModal(false);
      setError("");
      setSuccessMsg(`Signed in as ${data.user.name} (${data.user.role})`);
      loadData(data.userToken);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tgms_user_token");
    localStorage.removeItem("tgms_user");
    setCurrentUser(null);
    setUserToken(null);
    setUsers([]);
    setSuccessMsg("Signed out.");
  };

  const loadData = async (overrideToken?: string) => {
    const token =
      overrideToken ||
      userToken ||
      (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch("/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (uRes.status === 401 || uRes.status === 403) {
        const errData = await uRes.json().catch(() => ({}));
        setError(errData.error || "Facilitator or Admin sign-in is required.");
        setShowLoginModal(true);
      } else if (uRes.ok) {
        setUsers(await uRes.json());
      }
      if (sRes.ok) {
        setSessions(await sRes.json());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const token = userToken || (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          name: newName.trim(),
          email: newEmail.trim() || undefined,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setSuccessMsg(`User '${data.username}' created successfully!`);
      setShowAddModal(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewEmail("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditUser = (user: any) => {
    setSelectedUserForEdit(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "PARTICIPANT");
    setEditPassword("");
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setError("");
    setSuccessMsg("");

    try {
      const token = userToken || (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/users/${selectedUserForEdit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || "",
          role: editRole,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setSuccessMsg(`User '${data.username || data.name}' updated successfully!`);
      setShowEditModal(false);
      setSelectedUserForEdit(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;

    try {
      const token = userToken || (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      setSuccessMsg(`User '${username}' deleted.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setUploading(true);
    setError("");
    setUploadResult(null);

    try {
      const token = userToken || (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadResult(data);
      setSuccessMsg(`Successfully processed ${data.created} new users (${data.updated} updated).`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAssignToSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAssign || !targetSessionId) return;

    setAssigning(true);
    setError("");

    try {
      const token =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/sessions/${targetSessionId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: selectedUserForAssign.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign user to session");

      setSuccessMsg(
        `User '${selectedUserForAssign.name}' successfully assigned to session '${data.session?.title || targetSessionId}'!`
      );
      setShowAssignModal(false);
      setSelectedUserForAssign(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sampleCsv = `username,password,name,role,email
alice_lead,pass1234,Alice Johnson,PARTICIPANT,alice@company.com
bob_builder,secure99,Bob Miller,PARTICIPANT,bob@company.com
carol_eng,tech2026,Carol Davis,PARTICIPANT,carol@company.com`;

  const isAuthorized = Boolean(userToken && currentUser && isAuthorizedRole(currentUser.role));
  const canManageUsers = Boolean(userToken && currentUser && isAdminRole(currentUser.role));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">User Management</h1>
                <p className="text-xs text-slate-500">
                  {canManageUsers
                    ? "Manage user accounts, roles, passwords, CSV rosters, and session assignments"
                    : "View user roster and assign participants to your training sessions (Read-Only for Facilitators)"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sessions"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Sessions</span>
            </Link>
            <Link
              href="/users"
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-sm flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users</span>
            </Link>
            <Link
              href="/activities"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Activities Database</span>
            </Link>
            <Link
              href="/sessions/create"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition"
            >
              + Create Session
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {canManageUsers && (
              <>
                <button
                  onClick={() => {
                    setCsvContent(sampleCsv);
                    setShowUploadModal(true);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Upload CSV Roster
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <UserAvatarButton
                  user={currentUser}
                  onProfileUpdated={(updated) => {
                    setCurrentUser(updated);
                    loadData();
                  }}
                />
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Sign In (Facilitator / Admin)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* Facilitator Read-Only Notice */}
        {isAuthorized && !canManageUsers && (
          <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Facilitator Read-Only Mode:</strong> Only Administrators (<code className="font-bold">ADMIN</code> / <code className="font-bold">SUPER_ADMIN</code>) can create, modify, or delete user accounts, or assign sessions to other facilitators. You can assign participants to your own sessions.
              </span>
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!isAuthorized ? (
          <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">
              Facilitator or Admin Sign-In Required
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              User Management (User Roster) is restricted to signed-in{" "}
              <span className="font-semibold text-slate-700">Facilitators</span>,{" "}
              <span className="font-semibold text-slate-700">Admins</span>, and{" "}
              <span className="font-semibold text-slate-700">Super Admins</span>.
              {currentUser && !isAuthorizedRole(currentUser.role) && (
                <span className="block mt-2 text-rose-600 font-semibold">
                  Your current account (@{currentUser.username || currentUser.name} — {currentUser.role}) does not have permission to access the User Roster.
                </span>
              )}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition"
              >
                Back to Home
              </Link>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Sign In as Facilitator / Admin
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats and Search bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Registered Users</span>
                  <p className="text-xl font-bold text-slate-900">{users.length}</p>
                </div>
                <div className="h-8 border-r border-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 font-medium">Participants</span>
                  <p className="text-xl font-bold text-indigo-600">
                    {users.filter((u) => u.role === "PARTICIPANT").length}
                  </p>
                </div>
                <div className="h-8 border-r border-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 font-medium">Facilitators / Admins</span>
                  <p className="text-xl font-bold text-slate-800">
                    {users.filter((u) => u.role !== "PARTICIPANT").length}
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Sessions</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Loading users roster...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isOtherFacilitatorOrAdmin =
                          (user.role === "FACILITATOR" ||
                            user.role === "ADMIN" ||
                            user.role === "SUPER_ADMIN") &&
                          user.id !== currentUser?.id;
                        const canAssignThisUser =
                          canManageUsers || !isOtherFacilitatorOrAdmin;

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <button
                                onClick={() => setInspectingUserId(user.id)}
                                className="hover:text-indigo-600 hover:underline text-left flex items-center gap-1.5"
                                title="Click to view user profile, created/hosted sessions, points & awards"
                              >
                                {user.name}
                              </button>
                            </td>
                            <td className="py-3 px-4 font-mono text-indigo-600 font-medium">
                              @{user.username || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  user.role === "SUPER_ADMIN"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : user.role === "FACILITATOR"
                                    ? "bg-purple-100 text-purple-800"
                                    : user.role === "ADMIN"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {user.role === "SUPER_ADMIN" ? "👑 SUPER ADMIN" : user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {user.email || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {(user.role === "FACILITATOR" ||
                                  user.role === "ADMIN" ||
                                  user.role === "SUPER_ADMIN") && (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[11px]">
                                    {user._count?.sessions || 0} hosted
                                  </span>
                                )}
                                <span className="text-slate-500">
                                  {user._count?.participants || 0} joined
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setInspectingUserId(user.id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1"
                                  title="View User Profile, Hosted Sessions, Points & Awards"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Profile
                                </button>
                                {canAssignThisUser ? (
                                  <button
                                    onClick={() => {
                                      setSelectedUserForAssign(user);
                                      if (sessions.length > 0 && !targetSessionId) {
                                        setTargetSessionId(sessions[0].id);
                                      }
                                      setShowAssignModal(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1"
                                    title="Assign to a training session"
                                  >
                                    <LinkIcon className="w-3 h-3" />
                                    Assign Session
                                  </button>
                                ) : (
                                  <span
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed flex items-center gap-1"
                                    title="Only Admin and Super Admin can assign sessions to other facilitators"
                                  >
                                    <Lock className="w-3 h-3" />
                                    Admin Only
                                  </span>
                                )}

                                {canManageUsers && (
                                  <>
                                    {user.role === "SUPER_ADMIN" &&
                                    currentUser?.role !== "SUPER_ADMIN" ? (
                                      <span
                                        className="p-1.5 text-slate-300 cursor-not-allowed"
                                        title="Only Super Admins can edit or delete a Super Admin"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 opacity-40" />
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => openEditUser(user)}
                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                        title="Edit user (Admin / Super Admin only)"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {user.role === "SUPER_ADMIN" &&
                                    currentUser?.role !== "SUPER_ADMIN" ? (
                                      <span
                                        className="p-1.5 text-slate-300 cursor-not-allowed"
                                        title="Only Super Admins can delete a Super Admin"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 opacity-40" />
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          handleDeleteUser(user.id, user.username || user.name)
                                        }
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete user (Admin / Super Admin only)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Add Single User Modal (Admin / Super Admin only) */}
      {showAddModal && canManageUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Add New User
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Username:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sarah_c"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password:</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="Min 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email (Optional):</label>
                <input
                  type="email"
                  placeholder="sarah@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Role:</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="PARTICIPANT">Participant</option>
                  <option value="FACILITATOR">Facilitator</option>
                  <option value="ADMIN">Admin</option>
                  {currentUser?.role === "SUPER_ADMIN" && (
                    <option value="SUPER_ADMIN">👑 Super Admin</option>
                  )}
                </select>
                {currentUser?.role !== "SUPER_ADMIN" && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Note: Super Admin accounts can only be created by an active Super Admin.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal (Admin / Super Admin only) */}
      {showEditModal && selectedUserForEdit && canManageUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                Edit User: @{selectedUserForEdit.username || selectedUserForEdit.name}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email (Optional):</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Role:</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="PARTICIPANT">Participant</option>
                  <option value="FACILITATOR">Facilitator</option>
                  <option value="ADMIN">Admin</option>
                  {currentUser?.role === "SUPER_ADMIN" && (
                    <option value="SUPER_ADMIN">👑 Super Admin</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  New Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>:
                </label>
                <input
                  type="password"
                  minLength={4}
                  placeholder="Min 4 characters"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload CSV Modal (Admin / Super Admin only) */}
      {showUploadModal && canManageUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Upload CSV User Roster
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-4">
              <p className="text-xs text-slate-500">
                Paste CSV data or edit the template below. Columns: <code>username, password, name, role, email</code>.
                {currentUser?.role !== "SUPER_ADMIN" && (
                  <span className="block text-[11px] text-amber-600 mt-1">
                    Note: Creating SUPER_ADMIN accounts via CSV is restricted to Super Admins only.
                  </span>
                )}
              </p>

              <div>
                <textarea
                  rows={7}
                  required
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {uploadResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-semibold text-slate-800">
                    Processed {uploadResult.total} rows: {uploadResult.created} created, {uploadResult.updated} updated.
                  </p>
                  {uploadResult.errors?.length > 0 && (
                    <ul className="text-red-600 list-disc list-inside">
                      {uploadResult.errors.map((err: any, idx: number) => (
                        <li key={idx}>Row {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  {uploading ? "Uploading..." : "Upload & Sync"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign User to Session Modal */}
      {showAssignModal && selectedUserForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-indigo-600" />
                Assign User to Session
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignToSession} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-semibold text-slate-800">{selectedUserForAssign.name}</p>
                <p className="text-slate-500 font-mono">@{selectedUserForAssign.username}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select Target Session:
                </label>
                <select
                  required
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="">Choose a session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} (Code: {s.code}) - {s.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetSessionId || assigning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  {assigning ? "Assigning..." : "Assign to Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign In Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Sign In
              </h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Username:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. superadmin_sarah or admin_alex"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password:</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User / Participant Inspector Modal */}
      <ParticipantDetailModal
        userId={inspectingUserId}
        onClose={() => setInspectingUserId(null)}
      />
    </div>
  );
}

