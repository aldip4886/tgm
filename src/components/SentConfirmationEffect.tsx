"use client";

import { useEffect } from "react";
import { CheckCircle2, Sparkles, Award, ThumbsUp, MessageCircle, Trophy, X } from "lucide-react";

export interface SentConfirmationData {
  id?: string;
  type: "FEEDBACK" | "POINTS" | "AWARD" | "COMMENT" | "MESSAGE_SENT" | "MESSAGE_RECEIVED";
  title: string;
  detail?: string;
  subtitle?: string;
  recipientName?: string;
  senderName?: string;
}

export type SentConfirmationPayload = SentConfirmationData;
export type SentConfirmationEvent = SentConfirmationData;

export interface SentConfirmationEffectProps {
  confirmation?: SentConfirmationData | null;
  event?: SentConfirmationData | null;
  onDismiss?: () => void;
  onDone?: () => void;
}

export function SentConfirmationEffect({
  confirmation,
  event,
  onDismiss,
  onDone,
}: SentConfirmationEffectProps) {
  const activeItem = confirmation || event || null;
  const handleClose = onDismiss || onDone || (() => {});

  useEffect(() => {
    if (!activeItem) return;
    const timer = setTimeout(() => {
      handleClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [activeItem, onDismiss, onDone]);

  if (!activeItem) return null;

  const config = {
    POINTS: {
      gradient: "from-amber-500 via-orange-500 to-yellow-500",
      border: "border-amber-300",
      badgeBg: "bg-amber-400/25",
      icon: <Award className="w-6 h-6 text-amber-200" />,
      tag: "Points Sent",
    },
    AWARD: {
      gradient: "from-purple-600 via-indigo-600 to-pink-600",
      border: "border-purple-300",
      badgeBg: "bg-purple-400/25",
      icon: <Trophy className="w-6 h-6 text-amber-300" />,
      tag: "Award Sent",
    },
    COMMENT: {
      gradient: "from-indigo-600 via-blue-600 to-cyan-600",
      border: "border-indigo-300",
      badgeBg: "bg-indigo-400/25",
      icon: <MessageCircle className="w-6 h-6 text-cyan-200" />,
      tag: "Comment Sent",
    },
    FEEDBACK: {
      gradient: "from-emerald-600 via-teal-600 to-cyan-600",
      border: "border-emerald-300",
      badgeBg: "bg-emerald-400/25",
      icon: <ThumbsUp className="w-6 h-6 text-emerald-200" />,
      tag: "Feedback Sent",
    },
    MESSAGE_SENT: {
      gradient: "from-indigo-600 via-violet-600 to-purple-600",
      border: "border-indigo-300",
      badgeBg: "bg-indigo-400/25",
      icon: <MessageCircle className="w-6 h-6 text-indigo-200" />,
      tag: "Outgoing Chat Sent",
    },
    MESSAGE_RECEIVED: {
      gradient: "from-cyan-600 via-teal-600 to-emerald-600",
      border: "border-cyan-300",
      badgeBg: "bg-cyan-400/25",
      icon: <MessageCircle className="w-6 h-6 text-cyan-100" />,
      tag: "Incoming Live Chat",
    },
  }[activeItem.type];

  const detailText = activeItem.detail || activeItem.subtitle;

  return (
    <div className="fixed top-5 right-5 z-[100] pointer-events-auto animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${config.gradient} text-white px-5 py-4 shadow-2xl border ${config.border} min-w-[300px] max-w-md flex items-center gap-3.5`}
      >
        {/* Animated Sparkle Ring Effect */}
        <span className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/20 animate-ping pointer-events-none" />
        <Sparkles className="w-4 h-4 text-yellow-200 absolute top-2 right-10 animate-pulse pointer-events-none" />

        <div
          className={`w-12 h-12 rounded-2xl ${config.badgeBg} border border-white/30 flex items-center justify-center shrink-0 shadow-inner relative`}
        >
          {config.icon}
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </span>
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full text-white/95">
              {config.tag}
            </span>
          </div>
          <h4 className="text-sm font-extrabold mt-1 leading-snug truncate">{activeItem.title}</h4>
          {detailText && (
            <p className="text-xs text-white/90 mt-0.5 line-clamp-2">{detailText}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SentConfirmationEffect;
