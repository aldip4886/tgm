"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, KeyRound, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStaffRole = (role?: string) =>
    role === "FACILITATOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("tgms_user_token");
      const rawUser = localStorage.getItem("tgms_user");
      if (token && rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          if (isStaffRole(parsed?.role)) {
            router.push("/");
          }
        } catch {}
      }
    }
  }, [router]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both your username and password.");
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid username or password");
      }

      if (!isStaffRole(data.user?.role)) {
        throw new Error(
          "Access denied: This login page is for Facilitators and Administrators only. Participants should sign in with a Session Code on the Participant page."
        );
      }

      localStorage.setItem("tgms_user_token", data.userToken);
      localStorage.setItem("tgms_user", JSON.stringify(data.user));

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Participant Join Page
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-3 shadow-md shadow-indigo-200">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Facilitator & Admin Sign In
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your Facilitator, Admin, or Super Admin credentials to access your command homepage
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStaffLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. facilitator_maya or admin_alex"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? "Signing in..." : "Sign In to Command Center"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
