"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Users, Presentation, ArrowRight } from "lucide-react";

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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      if (urlCode) {
        const cleaned = urlCode.trim().toUpperCase().slice(0, 6);
        setCode(cleaned);
        setLoginSessionCode(cleaned);
      }
    }
  }, []);

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
    if (!username.trim() || !password) {
      setError("Please provide both username and password.");
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
          sessionCode: loginSessionCode.trim().toUpperCase() || undefined,
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
      } else if (
        data.user?.role === "FACILITATOR" ||
        data.user?.role === "ADMIN" ||
        data.user?.role === "SUPER_ADMIN"
      ) {
        router.push("/sessions");
      } else {
        setError("Login successful, but please enter a valid Session Code to join.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
            Account Sign In
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
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sarah_c"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
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
                maxLength={6}
                value={loginSessionCode}
                onChange={(e) => setLoginSessionCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K2P"
                className="w-full px-4 py-3 text-center text-lg font-mono uppercase tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In & Join Session"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative px-3 bg-white text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Facilitator Actions
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/sessions"
            className="py-2.5 px-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1"
          >
            <Presentation className="w-3.5 h-3.5 text-indigo-600" />
            Sessions
          </Link>
          <Link
            href="/sessions/create"
            className="py-2.5 px-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Host New
          </Link>
          <Link
            href="/users"
            className="py-2.5 px-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 font-medium text-xs rounded-xl transition flex items-center justify-center gap-1"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            User Roster
          </Link>
        </div>
      </div>
    </main>
  );
}
