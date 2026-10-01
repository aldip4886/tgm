"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { Sparkles, Users, Award, ShieldAlert, Heart, MessageSquare } from "lucide-react";

export default function ParticipantSessionView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function initParticipant() {
      try {
        const storedToken = localStorage.getItem(`tgms_token_${id}`);
        if (!storedToken) {
          setError("No participant session token found. Please join from the home page.");
          setLoading(false);
          return;
        }

        // Validate token and reconnect
        const res = await fetch("/api/sessions/reconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: storedToken }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to reconnect session");
        }

        const partData = await res.json();
        setParticipant(partData);
        setSession(partData.session);

        // Join real-time socket room
        const socket = getSocket();
        socket.emit("session:join", {
          sessionId: id,
          participantId: partData.id,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initParticipant();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Entering training room...</div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Connection Error</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Return to Join Screen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Participant Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">{session?.title}</h1>
          <p className="text-xs text-slate-500">Welcome, <strong className="text-indigo-600">{participant.displayName}</strong></p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-600" />
            <span>{participant.totalPoints} pts</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-indigo-600" />
            <span>{participant.peerPointBudget} budget</span>
          </div>
        </div>
      </header>

      {/* Main Participant Screen */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-800">You're in the Session!</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
            The facilitator is presenting. Watch the main screen. Interactive challenges, questions, and whiteboards will appear here automatically when launched.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-around text-xs text-slate-500">
            <div>
              <span className="block text-slate-400">Team</span>
              <strong className="text-slate-700">{participant.team?.name || "Unassigned"}</strong>
            </div>
            <div>
              <span className="block text-slate-400">Role</span>
              <strong className="text-slate-700">{participant.role}</strong>
            </div>
            <div>
              <span className="block text-slate-400">Status</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
