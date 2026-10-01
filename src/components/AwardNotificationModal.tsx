"use client";

import { useEffect } from "react";
import { Award, Sparkles, MessageSquare, Check, X, Heart, ThumbsUp } from "lucide-react";

export interface AwardNotificationProps {
  type: "POINTS" | "COMMENT" | "LIKE";
  amount?: number;
  reason?: string;
  giverName?: string;
  commenterName?: string;
  content?: string;
  onClose: () => void;
}

export function AwardNotificationModal({
  type,
  amount = 1,
  reason,
  giverName = "Facilitator",
  commenterName = "A Peer",
  content,
  onClose,
}: AwardNotificationProps) {
  useEffect(() => {
    // Auto-dismiss after 8 seconds if not clicked
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const displayReason = reason || content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none ${
            type === "POINTS"
              ? "bg-amber-400"
              : type === "LIKE"
              ? "bg-rose-500"
              : "bg-indigo-500"
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {type === "POINTS" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Sparkles className="w-8 h-8 animate-pulse text-amber-500" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" />
              Points Awarded!
            </div>

            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
              +{amount} <span className="text-amber-500 text-2xl font-bold">PTS</span>
            </h3>

            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
              From <span className="text-indigo-600 dark:text-indigo-400 font-bold">{giverName}</span>
            </p>

            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl text-xs text-amber-900 dark:text-amber-200 mb-5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
                Reason
              </span>
              <span className="italic">
                "{displayReason || "Recognized for outstanding contribution!"}"
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Awesome! Thank You
            </button>
          </>
        ) : type === "LIKE" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ThumbsUp className="w-8 h-8 animate-bounce text-rose-500" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Heart className="w-3.5 h-3.5" />
              Like Received!
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
              Your Work Was Liked!
            </h3>

            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
              From <span className="text-rose-600 dark:text-rose-400 font-bold">{giverName}</span>
            </p>

            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl text-xs text-rose-900 dark:text-rose-200 mb-5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-0.5">
                Reason
              </span>
              <span className="italic">
                "{displayReason || "Appreciated your contribution!"}"
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Got It!
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Heart className="w-3.5 h-3.5" />
              New Feedback
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Comment Received
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              From <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{commenterName || giverName}</strong>:
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 mb-5 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-0.5">
                Comment / Reason
              </span>
              "{displayReason}"
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
