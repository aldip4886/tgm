"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Presentation, ArrowLeft, CheckCircle2, Lock, ShieldCheck } from "lucide-react";

export default function CreateSessionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [facilitatorEmail, setFacilitatorEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign in modal state for unauthenticated users
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tgms_user_token");
    const rawUser = localStorage.getItem("tgms_user");

    if (token && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (
          parsed.role === "FACILITATOR" ||
          parsed.role === "ADMIN" ||
          parsed.role === "SUPER_ADMIN"
        ) {
          setCurrentUser(parsed);
          setUserToken(token);
          setFacilitatorName(parsed.name || "");
          setFacilitatorEmail(parsed.email || `${parsed.username}@training.local`);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // If not authenticated as facilitator, show login prompt
    setShowLoginModal(true);
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

      if (
        data.user?.role !== "FACILITATOR" &&
        data.user?.role !== "ADMIN" &&
        data.user?.role !== "SUPER_ADMIN"
      ) {
        throw new Error("Access restricted: Only facilitators and administrators can host sessions.");
      }

      localStorage.setItem("tgms_user_token", data.userToken);
      localStorage.setItem("tgms_user", JSON.stringify(data.user));

      setCurrentUser(data.user);
      setUserToken(data.userToken);
      setFacilitatorName(data.user.name || "");
      setFacilitatorEmail(data.user.email || `${data.user.username}@training.local`);
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!userToken) {
      setShowLoginModal(true);
      return;
    }

    if (!title.trim() || !facilitatorName.trim() || !facilitatorEmail.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          facilitatorName: facilitatorName.trim(),
          facilitatorEmail: facilitatorEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      router.push(`/sessions/${data.id}/facilitator`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Presentation className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Create Training Session</h1>
              <p className="text-xs text-slate-500">Configure your session details and generate a join code</p>
            </div>
          </div>

          {currentUser && (
            <div className="mb-6 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Host: {currentUser.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    @{currentUser.username} • {currentUser.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Switch Account
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Session Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Thinking Workshop 2026"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Description / Objectives
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of activities and goals"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Facilitator Name *
                </label>
                <input
                  type="text"
                  required
                  value={facilitatorName}
                  onChange={(e) => setFacilitatorName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={facilitatorEmail}
                  onChange={(e) => setFacilitatorEmail(e.target.value)}
                  placeholder="trainer@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Generating Session..." : "Launch Session Dashboard"}
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Facilitator Sign-In Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Facilitator Sign-In Required</h3>
              <p className="text-xs text-slate-500 mt-1">
                You must be signed in with a Facilitator or Admin account to create and manage training sessions.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Username:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. facilitator_maya"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-mono"
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

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
              >
                {loginLoading ? "Authenticating..." : "Sign In & Host Session"}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel & Return Home
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
