"use client";

import { Award, Crown, Sparkles, Star, Zap, Check } from "lucide-react";

export interface BadgeCelebrationProps {
  badge: {
    name: string;
    description: string;
    icon: string;
  };
  reason?: string;
  onClose: () => void;
}

export function BadgeCelebrationModal({
  badge,
  reason,
  onClose,
}: BadgeCelebrationProps) {
  const renderIcon = (name: string) => {
    switch (name) {
      case "Crown":
        return <Crown className="w-12 h-12 text-amber-500 animate-bounce" />;
      case "Star":
        return <Star className="w-12 h-12 text-yellow-500 animate-spin" />;
      case "Zap":
        return <Zap className="w-12 h-12 text-indigo-500 animate-pulse" />;
      case "Sparkles":
        return <Sparkles className="w-12 h-12 text-purple-500 animate-pulse" />;
      default:
        return <Award className="w-12 h-12 text-emerald-500 animate-bounce" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-amber-300 animate-in zoom-in-90 fade-in duration-300">
        {/* Floating Sparkles Background */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-4 shadow-inner">
          {renderIcon(badge.icon)}
        </div>

        <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-100 px-3 py-1 rounded-full mb-2">
          New Badge Unlocked!
        </span>

        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          {badge.name}
        </h3>

        <p className="text-xs text-slate-600 mb-4">{badge.description}</p>

        {reason && reason !== badge.description && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 italic mb-5">
            "{reason}"
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Awesome!
        </button>
      </div>
    </div>
  );
}
