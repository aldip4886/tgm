"use client";

import { useState } from "react";
import { Trophy, Users, User, Award, Flame, Star, Sparkles } from "lucide-react";

export interface LeaderboardParticipant {
  id: string;
  displayName: string;
  totalPoints: number;
  rank: number;
  team: { id: string; name: string } | null;
  categories: {
    PARTICIPATION: number;
    PEER: number;
    CHALLENGE: number;
    FACILITATOR: number;
    TEAM: number;
    BONUS: number;
  };
}

export interface LeaderboardTeam {
  id: string;
  name: string;
  totalPoints: number;
  rank: number;
  memberCount: number;
  members: { id: string; displayName: string }[];
  categories: {
    PARTICIPATION: number;
    PEER: number;
    CHALLENGE: number;
    FACILITATOR: number;
    TEAM: number;
    BONUS: number;
  };
}

export interface LeaderboardViewProps {
  participants: LeaderboardParticipant[];
  teams: LeaderboardTeam[];
  theme?: "light" | "dark";
  compact?: boolean;
}

export function LeaderboardView({
  participants,
  teams,
  theme = "light",
  compact = false,
}: LeaderboardViewProps) {
  const [tab, setTab] = useState<"individual" | "team">("individual");

  const isDark = theme === "dark";

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-extrabold flex items-center justify-center text-xs shadow-sm shadow-amber-200">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-extrabold flex items-center justify-center text-xs shadow-sm">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-700 text-amber-100 font-extrabold flex items-center justify-center text-xs shadow-sm">
          🥉
        </span>
      );
    }
    return (
      <span
        className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${
          isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600"
        }`}
      >
        {rank}
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl transition overflow-hidden flex flex-col ${
        isDark ? "bg-slate-900 border border-slate-800 text-white" : "bg-white border border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Top Header & Tab Toggle */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between ${
          isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70"
        }`}
      >
        <div className="flex items-center gap-2">
          <Trophy className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-500"}`} />
          <h3 className="font-bold text-sm tracking-tight">Championship Leaderboard</h3>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800">
          <button
            onClick={() => setTab("individual")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              tab === "individual"
                ? isDark
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-indigo-700 shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Individual
          </button>
          <button
            onClick={() => setTab("team")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              tab === "team"
                ? isDark
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-indigo-700 shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Teams
          </button>
        </div>
      </div>

      {/* Leaderboard Entries List */}
      <div className="p-4 overflow-y-auto max-h-96 space-y-2">
        {tab === "individual" ? (
          participants.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No participants registered yet.</div>
          ) : (
            participants.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  p.rank === 1
                    ? isDark
                      ? "bg-amber-950/20 border-amber-800/40"
                      : "bg-amber-50/40 border-amber-200"
                    : isDark
                    ? "bg-slate-800/40 border-slate-800"
                    : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getRankBadge(p.rank)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-inherit">{p.displayName}</span>
                      {p.team && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isDark
                              ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800/50"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}
                        >
                          {p.team.name}
                        </span>
                      )}
                    </div>
                    {!compact && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        {p.categories.CHALLENGE > 0 && <span>Challenge: {p.categories.CHALLENGE}</span>}
                        {p.categories.PEER > 0 && <span>Peer: {p.categories.PEER}</span>}
                        {p.categories.FACILITATOR > 0 && <span>Facilitator: {p.categories.FACILITATOR}</span>}
                        {p.categories.BONUS > 0 && <span>Bonus: {p.categories.BONUS}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono font-extrabold text-sm ${
                      p.rank === 1
                        ? "text-amber-500"
                        : isDark
                        ? "text-indigo-400"
                        : "text-indigo-600"
                    }`}
                  >
                    {p.totalPoints} pts
                  </span>
                </div>
              </div>
            ))
          )
        ) : teams.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">No teams formed yet.</div>
        ) : (
          teams.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-xl border flex items-center justify-between transition ${
                t.rank === 1
                  ? isDark
                    ? "bg-amber-950/20 border-amber-800/40"
                    : "bg-amber-50/40 border-amber-200"
                  : isDark
                  ? "bg-slate-800/40 border-slate-800"
                  : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankBadge(t.rank)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-inherit">{t.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.memberCount} members
                    </span>
                  </div>
                  {!compact && (
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 truncate max-w-sm">
                      {t.members.map((m) => m.displayName).join(", ")}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`font-mono font-extrabold text-sm ${
                    t.rank === 1
                      ? "text-amber-500"
                      : isDark
                      ? "text-indigo-400"
                      : "text-indigo-600"
                  }`}
                >
                  {t.totalPoints} pts
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
