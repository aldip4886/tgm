"use client";

import { useEffect, useState } from "react";
import { ParticipantDetailModal, getStoredAvatarConfig } from "./ParticipantDetailModal";

export interface UserAvatarButtonProps {
  user?: {
    id: string;
    name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null;
  participant?: {
    id: string;
    displayName: string;
    userId?: string | null;
    totalPoints?: number;
  } | null;
  userToken?: string | null;
  showLabel?: boolean;
  initialTab?: "overview" | "created_sessions" | "points" | "awards" | "interactions" | "settings";
  onProfileUpdated?: (updated: any) => void;
}

export function UserAvatarButton({
  user,
  participant,
  userToken,
  showLabel = true,
  initialTab = "overview",
  onProfileUpdated,
}: UserAvatarButtonProps) {
  const [openModal, setOpenModal] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState({
    gradient: "from-indigo-500 to-purple-600",
    emoji: "",
  });

  const targetKey = user?.id || participant?.userId || participant?.id || null;
  const displayName =
    participant?.displayName || user?.name || user?.username || "User";
  const subLabel = participant
    ? "Participant"
    : user?.role === "SUPER_ADMIN"
    ? "Super Admin"
    : user?.role === "ADMIN"
    ? "Administrator"
    : user?.role === "FACILITATOR"
    ? "Facilitator"
    : "Profile";

  useEffect(() => {
    if (!targetKey) return;
    const syncAvatar = () => {
      setAvatarConfig(getStoredAvatarConfig(targetKey));
    };
    syncAvatar();
    window.addEventListener("tgms-avatar-updated", syncAvatar);
    return () => window.removeEventListener("tgms-avatar-updated", syncAvatar);
  }, [targetKey]);

  if (!user && !participant) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenModal(true)}
        className="group flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-2xl bg-white hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 shadow-sm transition cursor-pointer"
        title="Click to view your Profile & Edit Settings"
      >
        <div className="relative">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarConfig.gradient} text-white flex items-center justify-center text-sm font-extrabold shadow-sm group-hover:scale-105 transition`}
          >
            {avatarConfig.emoji || displayName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
        {showLabel && (
          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-700 truncate max-w-[140px]">
              {displayName}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {subLabel}
            </div>
          </div>
        )}
      </button>

      {openModal && (
        <ParticipantDetailModal
          participantId={participant?.id || null}
          userId={!participant?.id ? user?.id || null : null}
          userToken={userToken}
          initialTab={initialTab}
          allowEdit={true}
          onClose={() => setOpenModal(false)}
          onProfileUpdated={(updated) => {
            if (targetKey) {
              setAvatarConfig(getStoredAvatarConfig(targetKey));
            }
            onProfileUpdated?.(updated);
          }}
        />
      )}
    </>
  );
}

export default UserAvatarButton;
