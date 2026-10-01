"use client";

import { useState, useEffect, useMemo } from "react";
import { getSocket } from "@/lib/socket-client";
import {
  Cloud,
  Send,
  Sparkles,
  Flame,
  Hash,
  BarChart3,
  CircleDot,
  Plus,
  Crown,
} from "lucide-react";

interface WordCloudViewProps {
  activity: any;
  mode: "participant" | "facilitator" | "projector";
  sessionId: string;
  token?: string;
}

type DisplayStyle = "cloud" | "bubbles" | "bars";

export function WordCloudView({ activity, mode, sessionId, token }: WordCloudViewProps) {
  const [wordInput, setWordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [echoingWord, setEchoingWord] = useState<string | null>(null);
  const [words, setWords] = useState<{ text: string; count: number }[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>("cloud");
  const [selectedWord, setSelectedWord] = useState<{ text: string; count: number; rank: number } | null>(
    null
  );

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

  const submitContent = async (textToSubmit: string, isEcho = false) => {
    if (!textToSubmit.trim() || submitting || activity.state !== "ACTIVE") return;

    if (isEcho) {
      setEchoingWord(textToSubmit);
    } else {
      setSubmitting(true);
    }

    try {
      const res = await fetch(`/api/activities/${activity.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: textToSubmit.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit word");
      }

      const response = await res.json();
      if (!isEcho) {
        setWordInput("");
      }
      await loadResults();

      const socket = getSocket();
      socket.emit("wordcloud:submit", { sessionId, activityId: activity.id });
      socket.emit("response:new", { sessionId, response });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
      setEchoingWord(null);
    }
  };

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitContent(wordInput, false);
  };

  const maxCount = words.length > 0 ? Math.max(...words.map((w) => w.count)) : 1;
  const minCount = words.length > 0 ? Math.min(...words.map((w) => w.count)) : 1;
  const topWord = words.length > 0 ? words[0] : null;

  // Arrange words so the highest-frequency words sit near the center of the cloud
  // while outer words radiate around them organically.
  const spiralWords = useMemo(() => {
    const ranked = words.map((w, idx) => ({ ...w, rank: idx + 1 }));
    const result: Array<{ text: string; count: number; rank: number }> = [];
    ranked.forEach((item, index) => {
      if (index % 2 === 0) {
        result.push(item);
      } else {
        result.unshift(item);
      }
    });
    return result;
  }, [words]);

  const isDark = mode === "projector";

  const cloudThemes = isDark
    ? [
        "from-indigo-400 to-cyan-300 border-indigo-500/40 bg-indigo-950/60 shadow-indigo-500/20",
        "from-fuchsia-400 to-pink-300 border-fuchsia-500/40 bg-fuchsia-950/60 shadow-fuchsia-500/20",
        "from-amber-300 to-orange-400 border-amber-500/40 bg-amber-950/60 shadow-amber-500/20",
        "from-emerald-300 to-teal-400 border-emerald-500/40 bg-emerald-950/60 shadow-emerald-500/20",
        "from-violet-300 to-purple-400 border-violet-500/40 bg-violet-950/60 shadow-violet-500/20",
        "from-rose-300 to-red-400 border-rose-500/40 bg-rose-950/60 shadow-rose-500/20",
        "from-sky-300 to-blue-400 border-sky-500/40 bg-sky-950/60 shadow-sky-500/20",
      ]
    : [
        "from-indigo-600 to-blue-600 border-indigo-200 bg-indigo-50/80 shadow-indigo-100",
        "from-fuchsia-600 to-pink-600 border-fuchsia-200 bg-fuchsia-50/80 shadow-fuchsia-100",
        "from-amber-600 to-orange-600 border-amber-200 bg-amber-50/80 shadow-amber-100",
        "from-emerald-600 to-teal-600 border-emerald-200 bg-emerald-50/80 shadow-emerald-100",
        "from-violet-600 to-purple-600 border-violet-200 bg-violet-50/80 shadow-violet-100",
        "from-rose-600 to-red-600 border-rose-200 bg-rose-50/80 shadow-rose-100",
        "from-sky-600 to-cyan-600 border-sky-200 bg-sky-50/80 shadow-sky-100",
      ];

  const tiltAngles = [0, -4, 4, -7, 6, -3, 5, -6, 3];

  const getWordHash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h;
  };

  return (
    <div
      className={`rounded-2xl p-6 transition-all ${
        isDark
          ? "bg-slate-900 border border-slate-800 text-white shadow-2xl"
          : "bg-white border border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Top Bar: Badge, Stats & View Switcher */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b ${
          isDark ? "border-slate-800" : "border-slate-100"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5" />
            Live Word Cloud
          </span>

          <div
            className={`flex items-center gap-3 text-xs px-3 py-1 rounded-full border ${
              isDark
                ? "bg-slate-800/80 border-slate-700 text-slate-300"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-1 font-semibold">
              <Hash className="w-3 h-3 text-violet-500" />
              {totalWords} {totalWords === 1 ? "entry" : "entries"}
            </span>
            <span className="opacity-30">•</span>
            <span className="font-medium">{words.length} unique</span>
            {topWord && (
              <>
                <span className="opacity-30">•</span>
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" />
                  Top: &ldquo;{topWord.text}&rdquo; ({topWord.count})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Display Style Switcher */}
        <div
          className={`flex items-center p-1 rounded-xl border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setDisplayStyle("cloud")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              displayStyle === "cloud"
                ? isDark
                  ? "bg-violet-600 text-white shadow"
                  : "bg-white text-violet-700 shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Cloud className="w-3 h-3" />
            Cloud
          </button>
          <button
            type="button"
            onClick={() => setDisplayStyle("bubbles")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              displayStyle === "bubbles"
                ? isDark
                  ? "bg-violet-600 text-white shadow"
                  : "bg-white text-violet-700 shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CircleDot className="w-3 h-3" />
            Bubbles
          </button>
          <button
            type="button"
            onClick={() => setDisplayStyle("bars")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              displayStyle === "bars"
                ? isDark
                  ? "bg-violet-600 text-white shadow"
                  : "bg-white text-violet-700 shadow-sm"
                : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Ranking
          </button>
        </div>
      </div>

      {/* Participant Input Form */}
      {mode === "participant" && activity.state === "ACTIVE" && (
        <div className="mb-6 space-y-2">
          <form onSubmit={handleSubmitWord} className="flex gap-2">
            <input
              type="text"
              required
              maxLength={60}
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Type a word or comma-separated words (e.g. Innovation, Trust, Speed)..."
              className="flex-1 px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
            <button
              type="submit"
              disabled={submitting || !wordInput.trim()}
              className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-200 transition flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Sending..." : "Launch Word"}
            </button>
          </form>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pl-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            Tip: Separate multiple words with commas, or click any word in the cloud below to{" "}
            <strong className="text-violet-600">+1 Echo</strong> it!
          </p>
        </div>
      )}

      {/* Word Cloud Canvas */}
      {words.length === 0 ? (
        <div
          className={`py-20 text-center rounded-2xl border border-dashed ${
            isDark
              ? "bg-slate-950/50 border-slate-800 text-slate-400"
              : "bg-gradient-to-br from-violet-50/40 via-indigo-50/30 to-slate-50 border-slate-200 text-slate-400"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-violet-500 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Waiting for the first spark of inspiration...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Submitted words will dynamically grow, rotate, and cluster here in real time.
          </p>
        </div>
      ) : displayStyle === "cloud" ? (
        <div
          className={`relative min-h-[300px] p-8 rounded-2xl border overflow-hidden flex flex-wrap items-center justify-center content-center gap-4 ${
            isDark
              ? "bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-900 border-slate-800"
              : "bg-gradient-to-br from-slate-50 via-indigo-50/40 to-violet-50/40 border-slate-200/80"
          }`}
        >
          {/* Ambient Decorative Glow */}
          <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />

          {spiralWords.map((w) => {
            const weight =
              maxCount === minCount ? 0.65 : (w.count - minCount) / (maxCount - minCount);
            const minFont = mode === "projector" ? 18 : 14;
            const maxFontDelta = mode === "projector" ? 44 : 32;
            const fontSize = Math.round(minFont + weight * maxFontDelta);

            const hash = getWordHash(w.text);
            const themeClass = cloudThemes[hash % cloudThemes.length];
            const angle = w.rank === 1 ? 0 : tiltAngles[hash % tiltAngles.length];
            const isTop = w.rank === 1;
            const isEchoing = echoingWord === w.text;

            return (
              <button
                key={w.text}
                type="button"
                onClick={() => {
                  setSelectedWord(w);
                  if (mode === "participant" && activity.state === "ACTIVE") {
                    submitContent(w.text, true);
                  }
                }}
                style={{
                  fontSize: `${fontSize}px`,
                  transform: `rotate(${angle}deg)`,
                }}
                title={
                  mode === "participant" && activity.state === "ACTIVE"
                    ? `Click to +1 Echo "${w.text}" (${w.count} mentions)`
                    : `"${w.text}" — ${w.count} mentions (Rank #${w.rank})`
                }
                className={`group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border shadow-sm transition-all duration-300 hover:scale-110 hover:rotate-0 hover:z-20 hover:shadow-lg cursor-pointer select-none ${themeClass} ${
                  isTop ? "ring-2 ring-amber-400/70 shadow-md" : ""
                } ${isEchoing ? "scale-125 ring-2 ring-violet-500 animate-pulse" : ""}`}
              >
                {isTop && (
                  <Crown
                    className="w-4 h-4 text-amber-500 shrink-0 -mr-0.5 drop-shadow"
                    aria-label="Top Word"
                  />
                )}
                <span
                  className={`font-extrabold tracking-tight bg-gradient-to-r bg-clip-text text-transparent ${themeClass}`}
                >
                  {w.text}
                </span>

                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full transition ${
                    isDark
                      ? "bg-white/10 text-white/90"
                      : "bg-white/90 text-slate-700 border border-slate-200/70"
                  }`}
                >
                  {w.count}
                </span>

                {mode === "participant" && activity.state === "ACTIVE" && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                    <Plus className="w-2.5 h-2.5" />1
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : displayStyle === "bubbles" ? (
        <div
          className={`min-h-[300px] p-6 rounded-2xl border flex flex-wrap items-center justify-center gap-5 ${
            isDark
              ? "bg-slate-950/60 border-slate-800"
              : "bg-gradient-to-br from-slate-50 to-indigo-50/30 border-slate-200/80"
          }`}
        >
          {words.map((w, idx) => {
            const weight =
              maxCount === minCount ? 0.6 : (w.count - minCount) / (maxCount - minCount);
            const size = Math.round((mode === "projector" ? 105 : 88) + weight * 80);
            const hash = getWordHash(w.text);
            const themeClass = cloudThemes[hash % cloudThemes.length];
            const share = totalWords > 0 ? Math.round((w.count / totalWords) * 100) : 0;

            return (
              <button
                key={w.text}
                type="button"
                onClick={() => {
                  setSelectedWord({ ...w, rank: idx + 1 });
                  if (mode === "participant" && activity.state === "ACTIVE") {
                    submitContent(w.text, true);
                  }
                }}
                style={{ width: `${size}px`, height: `${size}px` }}
                className={`rounded-full border-2 p-3 flex flex-col items-center justify-center text-center shadow-md hover:scale-110 transition-all duration-300 cursor-pointer ${themeClass} ${
                  idx === 0 ? "ring-4 ring-amber-400/50" : ""
                }`}
              >
                {idx < 3 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                    #{idx + 1}
                  </span>
                )}
                <span
                  className={`font-extrabold leading-tight break-words line-clamp-2 bg-gradient-to-r bg-clip-text text-transparent ${themeClass}`}
                  style={{ fontSize: `${Math.max(12, Math.round(size / 6.2))}px` }}
                >
                  {w.text}
                </span>
                <span className="text-[10px] font-mono font-bold opacity-75 mt-1">
                  {w.count}× ({share}%)
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Live Pulse Ranking Bars */
        <div
          className={`min-h-[280px] p-5 rounded-2xl border space-y-2.5 max-h-96 overflow-y-auto ${
            isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50/70 border-slate-200/80"
          }`}
        >
          {words.map((w, idx) => {
            const widthPct = Math.max(8, Math.round((w.count / maxCount) * 100));
            const sharePct = totalWords > 0 ? Math.round((w.count / totalWords) * 100) : 0;

            return (
              <div
                key={w.text}
                onClick={() => setSelectedWord({ ...w, rank: idx + 1 })}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isDark
                    ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 hover:border-violet-300 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono ${
                        idx === 0
                          ? "bg-amber-400 text-amber-950"
                          : idx === 1
                          ? "bg-slate-300 text-slate-900"
                          : idx === 2
                          ? "bg-amber-700 text-white"
                          : isDark
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <span className="text-sm">{w.text}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-violet-500">
                      {w.count} {w.count === 1 ? "vote" : "votes"}
                    </span>
                    <span className="text-slate-400">({sharePct}%)</span>
                    {mode === "participant" && activity.state === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          submitContent(w.text, true);
                        }}
                        className="px-2 py-0.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-[10px] font-sans font-bold transition"
                      >
                        +1 Echo
                      </button>
                    )}
                  </div>
                </div>
                <div
                  className={`w-full h-2 rounded-full overflow-hidden ${
                    isDark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                >
                  <div
                    style={{ width: `${widthPct}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      idx === 0
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-gradient-to-r from-violet-600 to-indigo-500"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Word Inspector Footer */}
      {selectedWord && (
        <div
          className={`mt-4 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
            isDark
              ? "bg-slate-800/70 border-slate-700 text-slate-200"
              : "bg-violet-50/70 border-violet-200 text-slate-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-violet-600 text-white font-mono font-bold text-[11px]">
              Rank #{selectedWord.rank}
            </span>
            <strong className="text-sm">&ldquo;{selectedWord.text}&rdquo;</strong>
            <span className="opacity-75">
              — mentioned <strong>{selectedWord.count}</strong>{" "}
              {selectedWord.count === 1 ? "time" : "times"} (
              {totalWords > 0 ? Math.round((selectedWord.count / totalWords) * 100) : 0}% of total)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedWord(null)}
            className="text-[11px] font-semibold opacity-60 hover:opacity-100"
          >
            Dismiss ✕
          </button>
        </div>
      )}
    </div>
  );
}
