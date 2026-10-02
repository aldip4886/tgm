"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface DigitalTimerProps {
  endsAt?: string | null;
  remainingMs?: number | null;
  status: "STOPPED" | "RUNNING" | "PAUSED" | string;
  onExpire?: () => void;
  size?: "sm" | "md" | "lg";
}

export function DigitalTimer({
  endsAt,
  remainingMs = 0,
  status,
  onExpire,
  size = "md",
}: DigitalTimerProps) {
  const safeRemainingMs = remainingMs ?? 0;
  const [displayMs, setDisplayMs] = useState<number>(safeRemainingMs);

  useEffect(() => {
    if (status === "PAUSED") {
      setDisplayMs(safeRemainingMs);
      return;
    }

    if (status !== "RUNNING" || !endsAt) {
      setDisplayMs(safeRemainingMs);
      return;
    }

    let animationFrameId: number;
    let expiredTriggered = false;

    const tick = () => {
      const targetTime = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      setDisplayMs(diff);

      if (diff === 0 && !expiredTriggered) {
        expiredTriggered = true;
        onExpire?.();
      } else if (diff > 0) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [endsAt, remainingMs, status, onExpire]);

  const totalSeconds = Math.ceil(displayMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isWarning = status === "RUNNING" && totalSeconds <= 30 && totalSeconds > 0;
  const isZero = totalSeconds === 0 && status === "RUNNING";

  const sizeClasses =
    size === "lg"
      ? "text-4xl px-6 py-3"
      : size === "sm"
      ? "text-xs px-2.5 py-1"
      : "text-base px-3.5 py-1.5";

  return (
    <div
      className={`inline-flex items-center gap-2 font-mono font-bold rounded-xl border transition ${sizeClasses} ${
        isZero
          ? "bg-red-600 text-white border-red-700 animate-pulse"
          : isWarning
          ? "bg-amber-500 text-white border-amber-600 animate-bounce"
          : status === "RUNNING"
          ? "bg-slate-900 text-emerald-400 border-slate-800 shadow-inner"
          : status === "PAUSED"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-slate-100 text-slate-500 border-slate-200"
      }`}
    >
      <Clock className={size === "lg" ? "w-6 h-6" : size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      <span>{formatted}</span>
      {status === "PAUSED" && (
        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 ml-1">
          Paused
        </span>
      )}
    </div>
  );
}
