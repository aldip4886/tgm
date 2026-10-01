"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import { Cloud, Send, Sparkles } from "lucide-react";

interface WordCloudViewProps {
  activity: any;
  mode: "participant" | "facilitator" | "projector";
  sessionId: string;
  token?: string;
}

export function WordCloudView({ activity, mode, sessionId, token }: WordCloudViewProps) {
  const [wordInput, setWordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [words, setWords] = useState<{ text: string; count: number }[]>([]);
  const [totalWords, setTotalWords] = useState(0);

  const loadResults = async () => {
    try {
      const res = await fetch(`/api/activities/${activity.id}/results`);
      if (res.ok) {
        const data = await res.json();
        if (data.wordCloud) {
          setWords(data.wordCloud.words || []);
          setTotalWords(data.wordCloud.totalWords || 0);
        }
      }
    } catch (e) {
      console.error("Failed to load word cloud:", e);
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

    socket.on("wordcloud:updated", handleUpdate);
    return () => {
      socket.off("wordcloud:updated", handleUpdate);
    };
  }, [activity.id]);

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordInput.trim() || submitting || activity.state !== "ACTIVE") return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: wordInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit word");
      }

      const response = await res.json();
      setWordInput("");
      loadResults();

      const socket = getSocket();
      socket.emit("wordcloud:submit", { sessionId, activityId: activity.id });
      socket.emit("response:new", { sessionId, response });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate font size scaling based on counts
  const maxCount = words.length > 0 ? Math.max(...words.map((w) => w.count)) : 1;
  const minCount = words.length > 0 ? Math.min(...words.map((w) => w.count)) : 1;

  const colorPalettes = [
    "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
    "text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800",
    "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
    "text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
    "text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800",
    "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800",
  ];

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
          <span className="px-3 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs rounded-full border border-violet-500/20 flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5" />
            Live Word Cloud
          </span>
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {totalWords} {totalWords === 1 ? "word submitted" : "words submitted"}
        </div>
      </div>

      {/* Participant Input Form */}
      {mode === "participant" && activity.state === "ACTIVE" && (
        <form onSubmit={handleSubmitWord} className="mb-6 flex gap-2">
          <input
            type="text"
            required
            maxLength={40}
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="Type a word or short phrase..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={submitting || !wordInput.trim()}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? "Sending..." : "Submit"}
          </button>
        </form>
      )}

      {/* Interactive Word Cloud Cluster Display */}
      {words.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 animate-pulse" />
          Words submitted by participants will cluster here in real time...
        </div>
      ) : (
        <div className="min-h-[220px] p-6 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-3">
          {words.map((w, index) => {
            // Scale font size from 14px up to 52px
            const weight = maxCount === minCount ? 1 : (w.count - minCount) / (maxCount - minCount);
            const fontSize = Math.round(14 + weight * (mode === "projector" ? 38 : 28));
            const colorClass = colorPalettes[index % colorPalettes.length];

            return (
              <span
                key={w.text + index}
                style={{ fontSize: `${fontSize}px` }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-all duration-300 transform hover:scale-110 font-bold ${colorClass}`}
              >
                <span>{w.text}</span>
                {w.count > 1 && (
                  <span className="text-[10px] font-mono opacity-70 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                    ×{w.count}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
