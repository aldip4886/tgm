"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import { ArrowUpDown, ChevronUp, ChevronDown, Check, Send, Trophy } from "lucide-react";

interface RankingViewProps {
  activity: any;
  mode: "participant" | "facilitator" | "projector";
  sessionId: string;
  token?: string;
  myResponse?: any;
}

export function RankingView({
  activity,
  mode,
  sessionId,
  token,
  myResponse,
}: RankingViewProps) {
  let initialItems: string[] = [];
  if (activity.config) {
    try {
      const cfg = JSON.parse(activity.config);
      initialItems = cfg.items || [];
    } catch {}
  }

  const [items, setItems] = useState<string[]>(initialItems);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rankingData, setRankingData] = useState<{
    rankedItems: { item: string; score: number; rank: number }[];
    totalSubmissions: number;
  }>({
    rankedItems: [],
    totalSubmissions: 0,
  });

  const loadResults = async () => {
    try {
      const res = await fetch(`/api/activities/${activity.id}/results`);
      if (res.ok) {
        const data = await res.json();
        if (data.ranking) {
          setRankingData(data.ranking);
        }
      }
    } catch (e) {
      console.error("Failed to load ranking results:", e);
    }
  };

  useEffect(() => {
    loadResults();

    const socket = getSocket();
    const handleUpdate = ({ activityId }: { activityId: string }) => {
      if (activityId === activity.id) {
        loadResults();
      }
    };

    socket.on("ranking:updated", handleUpdate);
    return () => {
      socket.off("ranking:updated", handleUpdate);
    };
  }, [activity.id]);

  useEffect(() => {
    if (myResponse?.content) {
      try {
        const parsed = JSON.parse(myResponse.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setSubmitted(true);
        }
      } catch {}
    }
  }, [myResponse]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setItems(newItems);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setItems(newItems);
  };

  const handleSubmitRanking = async () => {
    if (submitting || activity.state !== "ACTIVE") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: JSON.stringify(items) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit ranking");
      }

      setSubmitted(true);
      loadResults();

      const socket = getSocket();
      socket.emit("ranking:submit", { sessionId, activityId: activity.id });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const maxScore =
    rankingData.rankedItems.length > 0
      ? Math.max(...rankingData.rankedItems.map((r) => r.score), 1)
      : 1;

  return (
    <div
      className={`rounded-2xl p-6 ${
        mode === "projector"
          ? "bg-slate-900 border border-slate-800 text-white shadow-2xl"
          : "bg-white border border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-full border border-amber-500/20 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Prioritization & Ranking
          </span>
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {rankingData.totalSubmissions}{" "}
          {rankingData.totalSubmissions === 1 ? "participant ranked" : "participants ranked"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Participant Prioritization Controls (only for participant mode when active) */}
        {mode === "participant" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Your Priority Order
              </h4>
              <span className="text-[11px] text-slate-400">
                Use ▲ and ▼ to order from most to least important
              </span>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item + index}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{item}</span>
                  </div>

                  {activity.state === "ACTIVE" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30 transition"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === items.length - 1}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30 transition"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activity.state === "ACTIVE" && (
              <button
                type="button"
                onClick={handleSubmitRanking}
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {submitted ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting..." : submitted ? "Update Priority Ranking" : "Submit Priority Ranking"}
              </button>
            )}
          </div>
        )}

        {/* Right / Full Column: Collective Audience Ranking Ladder */}
        <div className={`space-y-4 ${mode !== "participant" ? "col-span-full" : ""}`}>
          <div className="flex items-center justify-between">
            <h4
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                mode === "projector" ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              Audience Consensus Ranking
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">Borda Count Aggregated</span>
          </div>

          {rankingData.rankedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Rankings will aggregate here as participants submit their priorities...
            </div>
          ) : (
            <div className="space-y-2.5">
              {rankingData.rankedItems.map((entry) => {
                const percentage = Math.round((entry.score / maxScore) * 100);
                const isTop1 = entry.rank === 1;

                return (
                  <div
                    key={entry.item}
                    className={`relative overflow-hidden p-3.5 rounded-xl border transition-all ${
                      isTop1
                        ? "border-amber-400 bg-amber-50/20 dark:bg-amber-950/20"
                        : mode === "projector"
                        ? "border-slate-800 bg-slate-800/40"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    {/* Background Progress Bar */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out opacity-20 ${
                        isTop1 ? "bg-amber-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />

                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isTop1
                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                              : entry.rank === 2
                              ? "bg-slate-300 text-slate-800"
                              : entry.rank === 3
                              ? "bg-amber-700 text-white"
                              : mode === "projector"
                              ? "bg-slate-700 text-slate-300"
                              : "bg-white border border-slate-200 text-slate-700"
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            mode === "projector" ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {entry.item}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isTop1 ? "text-amber-500" : "text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {entry.score} pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
