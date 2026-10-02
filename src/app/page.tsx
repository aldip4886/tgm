"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAvatarButton } from "@/components/UserAvatarButton";
import {
  Sparkles,
  Users,
  Presentation,
  ArrowRight,
  FileSpreadsheet,
  Plus,
  Shield,
  LogOut,
  ExternalLink,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"guest" | "login">("guest");

  // Guest join state
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Account login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginSessionCode, setLoginSessionCode] = useState("");

  // Authenticated Facilitator / Admin state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionPage, setSessionPage] = useState(1);
  const SESSIONS_PER_PAGE = 5;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStaffRole = (role?: string) =>
    role === "FACILITATOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      if (urlCode) {
        const cleaned = urlCode.trim().toUpperCase().slice(0, 6);
        setCode(cleaned);
        setLoginSessionCode(cleaned);
      }

      const storedToken = localStorage.getItem("tgms_user_token");
      const rawUser = localStorage.getItem("tgms_user");
      if (storedToken && rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (isStaffRole(parsed?.role)) {
            setCurrentUser(parsed);
            setUserToken(storedToken);
            loadStaffSessions(storedToken);
          }
        } catch {}
      }
    }
  }, []);

  const loadStaffSessions = async (token: string) => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tgms_user_token");
    localStorage.removeItem("tgms_user");
    setCurrentUser(null);
    setUserToken(null);
    setRecentSessions([]);
    setUsername("");
    setPassword("");
  };

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim() || !displayName.trim()) {
      setError("Please provide both a session code and your name.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), displayName: displayName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join session");
      }

      localStorage.setItem(`tgms_token_${data.session.id}`, data.token);
      localStorage.setItem("tgms_last_session", data.session.id);

      router.push(`/sessions/${data.session.id}/participant`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password || !loginSessionCode.trim()) {
      setError("Please provide your username, password, and the 6-character Session Code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          sessionCode: loginSessionCode.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      if (data.userToken && data.user) {
        localStorage.setItem("tgms_user_token", data.userToken);
        localStorage.setItem("tgms_user", JSON.stringify(data.user));
      }

      if (data.session && data.token) {
        localStorage.setItem(`tgms_token_${data.session.id}`, data.token);
        localStorage.setItem("tgms_last_session", data.session.id);
        router.push(`/sessions/${data.session.id}/participant`);
      } else {
        setError("Please enter a valid Session Code to join as a participant.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render Facilitator / Admin Homepage after login
  if (currentUser && userToken && isStaffRole(currentUser.role)) {
    const createdSessions =
      currentUser.role === "FACILITATOR"
        ? recentSessions.filter((s) => s.facilitatorId === currentUser.id)
        : recentSessions;

    const activeCount = createdSessions.filter((s) => s.status === "ACTIVE").length;
    const completedCount = createdSessions.filter((s) => s.status === "COMPLETED").length;

    const totalPages = Math.max(1, Math.ceil(createdSessions.length / SESSIONS_PER_PAGE));
    const safePage = Math.min(Math.max(1, sessionPage), totalPages);
    const paginatedSessions = createdSessions.slice(
      (safePage - 1) * SESSIONS_PER_PAGE,
      safePage * SESSIONS_PER_PAGE
    );

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900">
                  Training Game Platform
                </h1>
                <p className="text-xs text-slate-500">
                  {currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN"
                    ? "Administrator Command Homepage"
                    : "Facilitator Command Homepage"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>

              {/* User Avatar on Upper Right Corner */}
              <UserAvatarButton
                user={currentUser}
                userToken={userToken}
                onProfileUpdated={(updated) =>
                  setCurrentUser((prev: any) => ({ ...prev, ...updated }))
                }
              />
            </div>
          </div>
        </header>

        {/* Main Dashboard Homepage */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider">
                Welcome back, @{currentUser.username || currentUser.name}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Hello, {currentUser.name}!
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
                {currentUser.role === "FACILITATOR"
                  ? "Launch new interactive training sessions and manage all sessions you have created."
                  : "Oversee all training sessions across facilitators, manage the user roster, and inspect the activities database."}
              </p>
            </div>

            <Link
              href="/sessions/create"
              className="px-5 py-3 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Host New Session
            </Link>
          </div>

          {/* Primary Navigation Cards */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Workspace Modules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/sessions"
                className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Presentation className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Session Management</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentUser.role === "FACILITATOR"
                      ? "View, launch, edit, or export your training sessions."
                      : "Global view of all sessions across every facilitator."}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>{createdSessions.length} sessions</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              <Link
                href="/sessions/create"
                className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Create New Session</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Generate a new 6-digit join code and QR code for a live class.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                  <span>Launch wizard</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              <Link
                href="/activities"
                className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Activities Database</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Configure Polls, Quizzes, Word Clouds, Q&A, Rankings, and Whiteboards.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                  <span>Manage activities</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>

              <Link
                href="/users"
                className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">User Roster</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage user accounts, roles, bulk CSV imports, and session assignments.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600">
                  <span>Open roster</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            </div>
          </div>

          {/* All Created Sessions Overview (Paginated, Clean without previous session interactions/points/messages) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {currentUser.role === "FACILITATOR"
                    ? `Sessions You Have Created (${createdSessions.length})`
                    : `All Created Training Sessions (${createdSessions.length})`}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeCount} active • {completedCount} completed (interactions, points, and messages from previous sessions are hidden)
                </p>
              </div>
              <Link
                href="/sessions"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Open Session Manager</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingSessions ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Loading sessions...
              </div>
            ) : createdSessions.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Presentation className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  No sessions created yet. Click <strong>Host New Session</strong> to get started!
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {paginatedSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 hover:bg-slate-50/80 transition flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {s.code}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              s.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> ACTIVE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> COMPLETED
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Facilitator: <strong className="text-slate-700">{s.facilitator?.name || currentUser.name}</strong> •{" "}
                          Created: {new Date(s.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sessions/${s.id}/projector`}
                          target="_blank"
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                          Projector
                        </Link>
                        <Link
                          href={`/sessions/${s.id}/facilitator`}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          Open Console
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Showing{" "}
                      <strong>{(safePage - 1) * SESSIONS_PER_PAGE + 1}</strong>–
                      <strong>{Math.min(safePage * SESSIONS_PER_PAGE, createdSessions.length)}</strong> of{" "}
                      <strong>{createdSessions.length}</strong> created sessions
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setSessionPage(Math.max(1, safePage - 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold flex items-center gap-1 transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setSessionPage(pageNum)}
                          className={`w-7 h-7 rounded-lg font-bold transition ${
                            pageNum === safePage
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setSessionPage(Math.min(totalPages, safePage + 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold flex items-center gap-1 transition"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-50 via-white to-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-3 shadow-md shadow-indigo-200">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Training Game Platform</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive, gamified collaborative learning</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setTab("guest");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              tab === "guest"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Guest Join
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              tab === "login"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Participant Sign In
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {tab === "guest" ? (
          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Session Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K2P"
                className="w-full px-4 py-3 text-center text-xl font-mono uppercase tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Training Session"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleAccountLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Participant Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. participant_john"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Session Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={loginSessionCode}
                onChange={(e) => setLoginSessionCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K2P"
                className="w-full px-4 py-3 text-center text-xl font-mono uppercase tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Sign In & Join Session"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <Shield className="w-3.5 h-3.5" />
            Facilitator & Administrator Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
