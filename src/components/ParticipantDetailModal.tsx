"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Award,
  Trophy,
  Presentation,
  MessageSquare,
  Palette,
  CheckCircle2,
  X,
  Settings,
  Layers,
  ExternalLink,
  Calendar,
  Save,
} from "lucide-react";

export interface ParticipantDetailModalProps {
  participantId?: string | null;
  userId?: string | null;
  userToken?: string | null;
  initialTab?: "overview" | "created_sessions" | "points" | "awards" | "interactions" | "settings";
  allowEdit?: boolean;
  onClose: () => void;
  onAwardPointsClick?: (participantId: string) => void;
  onAwardBadgeClick?: (participantId: string) => void;
  onAwardPoints?: (participantId: string) => void;
  onAwardBadge?: (participantId: string) => void;
  onProfileUpdated?: (updated: any) => void;
}

const AVATAR_GRADIENTS = [
  { id: "indigo", label: "Indigo", bg: "from-indigo-500 to-purple-600" },
  { id: "emerald", label: "Emerald", bg: "from-emerald-500 to-teal-600" },
  { id: "amber", label: "Amber", bg: "from-amber-500 to-orange-600" },
  { id: "rose", label: "Rose", bg: "from-rose-500 to-pink-600" },
  { id: "cyan", label: "Cyan", bg: "from-cyan-500 to-blue-600" },
];

export function getStoredAvatarConfig(key?: string | null) {
  if (!key || typeof window === "undefined") {
    return { gradient: "from-indigo-500 to-purple-600", emoji: "" };
  }
  try {
    const raw = localStorage.getItem(`tgms_avatar_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        gradient: parsed.gradient || "from-indigo-500 to-purple-600",
        emoji: parsed.emoji || "",
      };
    }
  } catch {}
  return { gradient: "from-indigo-500 to-purple-600", emoji: "" };
}

export function saveStoredAvatarConfig(key: string, config: { gradient: string; emoji: string }) {
  if (typeof window === "undefined" || !key) return;
  try {
    localStorage.setItem(`tgms_avatar_${key}`, JSON.stringify(config));
    window.dispatchEvent(new Event("tgms-avatar-updated"));
  } catch {}
}

export function ParticipantDetailModal({
  participantId,
  userId,
  userToken,
  initialTab = "overview",
  allowEdit = true,
  onClose,
  onAwardPointsClick,
  onAwardBadgeClick,
  onAwardPoints,
  onAwardBadge,
  onProfileUpdated,
}: ParticipantDetailModalProps) {
  const handleAwardPoints = onAwardPointsClick || onAwardPoints;
  const handleAwardBadge = onAwardBadgeClick || onAwardBadge;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [participantData, setParticipantData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "created_sessions" | "points" | "awards" | "interactions" | "settings"
  >(initialTab);

  // Edit Profile / Settings states
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [avatarGradient, setAvatarGradient] = useState("from-indigo-500 to-purple-600");
  const [avatarEmoji, setAvatarEmoji] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, participantId, userId]);

  useEffect(() => {
    if (!participantId && !userId) {
      setParticipantData(null);
      setUserData(null);
      setLoading(false);
      return;
    }
    async function loadDetails() {
      setLoading(true);
      setError("");
      setSaveSuccess("");
      setSaveError("");
      try {
        const token =
          userToken ||
          (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        if (participantId) {
          const res = await fetch(`/api/participants/${participantId}`, { headers });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load participant details");
          setParticipantData(data);
          setEditName(data.displayName || data.user?.name || "");
          setEditUsername(data.user?.username || "");
          setEditEmail(data.user?.email || "");
          const avatarCfg = getStoredAvatarConfig(data.user?.id || data.id);
          setAvatarGradient(avatarCfg.gradient);
          setAvatarEmoji(avatarCfg.emoji);
        } else if (userId) {
          const res = await fetch(`/api/users/${userId}`, { headers });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to load user details");
          setUserData(data);
          setEditName(data.name || "");
          setEditUsername(data.username || "");
          setEditEmail(data.email || "");
          const avatarCfg = getStoredAvatarConfig(data.id);
          setAvatarGradient(avatarCfg.gradient);
          setAvatarEmoji(avatarCfg.emoji);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    }

    if (participantId || userId) {
      loadDetails();
    }
  }, [participantId, userId, userToken]);

  if (!participantId && !userId) return null;

  // Normalize data whether opened by participantId or userId
  const displayName =
    participantData?.displayName ||
    userData?.name ||
    userData?.username ||
    "Participant";
  const username =
    participantData?.user?.username ||
    userData?.username ||
    null;
  const email =
    participantData?.user?.email ||
    userData?.email ||
    null;
  const role =
    userData?.role ||
    participantData?.user?.role ||
    participantData?.role ||
    "PARTICIPANT";
  const createdAt =
    userData?.createdAt ||
    participantData?.user?.createdAt ||
    participantData?.joinedAt ||
    null;

  const createdSessions: any[] =
    userData?.sessions || participantData?.user?.sessions || [];
  const isFacilitatorOrAdmin =
    role === "FACILITATOR" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    createdSessions.length > 0;

  const allParticipantRecords: any[] = participantData
    ? [participantData]
    : userData?.participants || [];

  const totalPoints = allParticipantRecords.reduce((acc, p) => acc + (p.totalPoints || 0), 0);
  const allBadges = allParticipantRecords.flatMap((p) =>
    (p.badges || []).map((b: any) => ({ ...b, sessionTitle: p.session?.title }))
  );
  const allPointsReceived = allParticipantRecords.flatMap((p) =>
    (p.pointsReceived || []).map((pt: any) => ({ ...pt, sessionTitle: p.session?.title }))
  );
  const allResponses = allParticipantRecords.flatMap((p) =>
    (p.responses || []).map((r: any) => ({ ...r, sessionTitle: p.session?.title }))
  );
  const allComments = allParticipantRecords.flatMap((p) =>
    (p.comments || []).map((c: any) => ({ ...c, sessionTitle: p.session?.title }))
  );
  const allWhiteboards = allParticipantRecords.flatMap((p) =>
    (p.whiteboards || []).map((w: any) => ({ ...w, sessionTitle: p.session?.title }))
  );

  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const token =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const targetKey = userData?.id || participantData?.user?.id || participantData?.id;
      if (targetKey) {
        saveStoredAvatarConfig(targetKey, {
          gradient: avatarGradient,
          emoji: avatarEmoji,
        });
      }

      if (participantId) {
        const res = await fetch(`/api/participants/${participantId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            displayName: editName.trim(),
            name: editName.trim(),
            username: editUsername.trim() || undefined,
            email: editEmail.trim(),
            password: editPassword || undefined,
          }),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error || "Failed to update profile");
        setParticipantData((prev: any) => ({
          ...prev,
          displayName: updated.displayName,
          user: updated.user || prev?.user,
        }));
        setEditPassword("");
        setSaveSuccess("Profile & settings saved successfully!");
        onProfileUpdated?.(updated);
      } else if (userId) {
        const res = await fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: editName.trim(),
            username: editUsername.trim() || undefined,
            email: editEmail.trim(),
            password: editPassword || undefined,
          }),
        });
        const updated = await res.json();
        if (!res.ok) throw new Error(updated.error || "Failed to update user profile");
        setUserData((prev: any) => ({
          ...prev,
          name: updated.name,
          username: updated.username,
          email: updated.email,
        }));
        // Sync localStorage if editing current logged-in user
        if (typeof window !== "undefined") {
          try {
            const rawCurrent = localStorage.getItem("tgms_user");
            if (rawCurrent) {
              const parsed = JSON.parse(rawCurrent);
              if (parsed.id === userId) {
                const merged = {
                  ...parsed,
                  name: updated.name,
                  username: updated.username,
                  email: updated.email,
                };
                localStorage.setItem("tgms_user", JSON.stringify(merged));
              }
            }
          } catch {}
        }
        setEditPassword("");
        setSaveSuccess("User profile & settings saved successfully!");
        onProfileUpdated?.(updated);
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to save profile settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const settingsHref = participantId
    ? `/settings?participantId=${participantId}`
    : userId
    ? `/settings?userId=${userId}`
    : "/settings";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} border-2 border-white/30 flex items-center justify-center text-xl font-extrabold text-white shrink-0 shadow-lg`}
            >
              {avatarEmoji || displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{displayName}</h2>
                {username && (
                  <span className="text-xs font-mono text-indigo-300 bg-white/10 px-2 py-0.5 rounded-lg">
                    @{username}
                  </span>
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {role}
                </span>
                {participantData && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      participantData.isConnected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        participantData.isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    {participantData.isConnected ? "Online" : "Offline"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {email || "No email linked"}
                {participantData?.team?.name ? ` • Team: ${participantData.team.name}` : ""}
                {createdAt ? ` • Member since ${new Date(createdAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {allowEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                    activeTab === "settings"
                      ? "bg-white text-indigo-900 border-white"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Edit Info / Settings</span>
                </button>
                <Link
                  href={settingsHref}
                  onClick={onClose}
                  className="px-3 py-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 border border-indigo-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  title="Open Full Profile & Account Settings Page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Settings Page</span>
                </Link>
              </>
            )}
            {participantData && handleAwardPoints && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  handleAwardPoints(participantData.id);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Award className="w-3.5 h-3.5" />
                <span>+ Points</span>
              </button>
            )}
            {participantData && handleAwardBadge && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  handleAwardBadge(participantData.id);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>+ Badge</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">
                Sessions Created
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {createdSessions.length} hosted
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">
                Sessions Joined
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {allParticipantRecords.length}
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">Total Points</span>
              <span className="text-sm font-extrabold text-slate-900">{totalPoints} pts</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">Awards</span>
              <span className="text-sm font-extrabold text-slate-900">{allBadges.length}</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400">Contributions</span>
              <span className="text-sm font-extrabold text-slate-900">
                {allResponses.length + allComments.length}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center gap-1.5 shrink-0">
          {[
            { id: "overview", label: "Profile & Session Info" },
            ...(isFacilitatorOrAdmin
              ? [{ id: "created_sessions", label: `Created Sessions (${createdSessions.length})` }]
              : []),
            { id: "points", label: `Points (${allPointsReceived.length})` },
            { id: "awards", label: `Awards (${allBadges.length})` },
            {
              id: "interactions",
              label: `Interactions (${allResponses.length + allComments.length + allWhiteboards.length})`,
            },
            ...(allowEdit ? [{ id: "settings", label: "⚙️ Edit Info & Settings" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading profile information, created sessions, points, and awards...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
              {error}
            </div>
          ) : activeTab === "overview" ? (
            <div className="space-y-4">
              {/* Profile Information Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Profile Information
                  </h3>
                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("settings")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Edit Info / Settings
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Full / Display Name
                    </span>
                    <strong className="text-slate-800 text-sm">{displayName}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Account / Username
                    </span>
                    <strong className="text-indigo-700 font-mono">
                      {username ? `@${username}` : "Guest Participant"}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Email & Role
                    </span>
                    <strong className="text-slate-800 block truncate">
                      {email || "No email"} ({role})
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      {isFacilitatorOrAdmin ? "Sessions Created / Hosted" : "Peer Point Budget Left"}
                    </span>
                    <strong className="text-slate-800 text-sm">
                      {isFacilitatorOrAdmin
                        ? `${createdSessions.length} (${createdSessions.filter((s) => s.status === "ACTIVE").length} active, ${createdSessions.filter((s) => s.status === "COMPLETED").length} completed)`
                        : participantData
                        ? `${participantData.peerPointBudget} pts`
                        : "20 pts / session"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Facilitator / Admin Detailed Created Sessions Section */}
              {isFacilitatorOrAdmin && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Presentation className="w-4 h-4 text-indigo-600" />
                      Created / Hosted Sessions ({createdSessions.length})
                    </h3>
                    {createdSessions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("created_sessions")}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        View Full Created Session Details →
                      </button>
                    )}
                  </div>

                  {createdSessions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      This facilitator has not created or hosted any sessions yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {createdSessions.map((sess: any) => (
                        <div
                          key={sess.id}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs hover:border-indigo-200 transition"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {sess.code}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {sess.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  sess.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {sess.status}
                              </span>
                            </div>
                            {sess.description && (
                              <p className="text-slate-600 text-xs">{sess.description}</p>
                            )}
                            <p className="text-slate-500 text-[11px]">
                              Created: {new Date(sess.createdAt).toLocaleString()} •{" "}
                              <strong>{sess._count?.participants ?? 0}</strong> participants •{" "}
                              <strong>{sess._count?.teams ?? 0}</strong> teams •{" "}
                              <strong>{sess._count?.activities ?? 0}</strong> activities •{" "}
                              <strong>{sess._count?.points ?? 0}</strong> point awards
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/sessions/${sess.id}/projector`}
                              target="_blank"
                              onClick={onClose}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3 h-3 text-indigo-600" />
                              Projector
                            </Link>
                            <Link
                              href={`/sessions/${sess.id}/facilitator`}
                              onClick={onClose}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 transition"
                            >
                              Open Console
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Enrolled Session Information */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Presentation className="w-4 h-4 text-emerald-600" />
                  Enrolled Session Information ({allParticipantRecords.length})
                </h3>
                {allParticipantRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Not enrolled as a participant in any training sessions yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {allParticipantRecords.map((rec: any) => (
                      <div
                        key={rec.id}
                        className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {rec.session?.title || "Training Session"}
                            </span>
                            {rec.session?.code && (
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                Code: {rec.session.code}
                              </span>
                            )}
                            {rec.session?.status && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {rec.session.status}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            Facilitator:{" "}
                            <strong>{rec.session?.facilitator?.name || "Trainer"}</strong> • Joined:{" "}
                            {new Date(rec.joinedAt).toLocaleString()}
                            {rec.team?.name ? ` • Team: ${rec.team.name}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg">
                            {rec.totalPoints || 0} pts
                          </span>
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-bold rounded-lg">
                            {(rec.badges || []).length} badges
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "created_sessions" ? (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Detailed Created Sessions by {displayName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total Created / Hosted: <strong>{createdSessions.length}</strong> sessions (
                    {createdSessions.filter((s) => s.status === "ACTIVE").length} active,{" "}
                    {createdSessions.filter((s) => s.status === "COMPLETED").length} completed)
                  </p>
                </div>
              </div>

              {createdSessions.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No sessions created by this facilitator yet.
                </div>
              ) : (
                createdSessions.map((sess: any) => (
                  <div
                    key={sess.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                            {sess.code}
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900">{sess.title}</h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                              sess.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                        {sess.description && (
                          <p className="text-slate-600">{sess.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created: {new Date(sess.createdAt).toLocaleString()}
                          </span>
                          {sess.updatedAt && (
                            <span>Last Updated: {new Date(sess.updatedAt).toLocaleString()}</span>
                          )}
                          <span>Leaderboard: {sess.leaderboardVisibility || "LIVE"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sessions/${sess.id}/projector`}
                          target="_blank"
                          onClick={onClose}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                          Projector
                        </Link>
                        <Link
                          href={`/sessions/${sess.id}/facilitator`}
                          onClick={onClose}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 transition"
                        >
                          Open Console
                        </Link>
                      </div>
                    </div>

                    {/* Session Statistics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Participants
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">
                          {sess._count?.participants ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Teams
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">
                          {sess._count?.teams ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Activities
                        </span>
                        <span className="text-sm font-extrabold text-slate-800">
                          {sess._count?.activities ?? 0}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Point Awards
                        </span>
                        <span className="text-sm font-extrabold text-amber-700">
                          {sess._count?.points ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Activities List Preview */}
                    {sess.activities && sess.activities.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                          Session Activities ({sess.activities.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sess.activities.map((act: any) => (
                            <span
                              key={act.id}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-100 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <Layers className="w-3 h-3 text-indigo-500" />
                              {act.title} ({act.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "points" ? (
            <div className="space-y-2.5">
              {allPointsReceived.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No points awarded to this participant yet.
                </div>
              ) : (
                allPointsReceived.map((pt: any) => (
                  <div
                    key={pt.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold font-mono">
                          +{pt.amount} pts
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {pt.category}
                        </span>
                        {pt.sessionTitle && (
                          <span className="text-[11px] text-slate-400">• {pt.sessionTitle}</span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium mt-1">
                        {pt.reason || "Points awarded during session"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        From: {pt.giver?.displayName || "Facilitator / System"}
                        {pt.activity?.title ? ` • Activity: ${pt.activity.title}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(pt.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "awards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allBadges.length === 0 ? (
                <div className="col-span-2 text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No badges or awards earned yet.
                </div>
              ) : (
                allBadges.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-4 bg-gradient-to-br from-amber-50/70 via-white to-indigo-50/50 rounded-2xl border border-amber-200/80 flex items-start gap-3 shadow-sm"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shrink-0">
                      {b.badge?.icon || "🏆"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate">
                          {b.badge?.name || "Session Award"}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {b.reason || b.badge?.description}
                      </p>
                      {b.sessionTitle && (
                        <span className="inline-block mt-1.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {b.sessionTitle}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "settings" ? (
            <form
              onSubmit={handleSaveProfileSettings}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    Edit User Profile & Avatar Settings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your display name, account details, password, and avatar appearance.
                  </p>
                </div>
                <Link
                  href={settingsHref}
                  onClick={onClose}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center gap-1 transition"
                >
                  <span>Open Full Settings Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold">
                  {saveError}
                </div>
              )}

              {/* Avatar Customization */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Avatar Appearance
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center text-xl font-extrabold shadow-md`}
                  >
                    {avatarEmoji || (editName || displayName).charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {AVATAR_GRADIENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setAvatarGradient(g.bg)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r ${g.bg} ${
                            avatarGradient === g.bg ? "ring-2 ring-offset-2 ring-indigo-600" : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Custom Avatar Emoji / Icon:</span>
                      {["", "🚀", "🌟", "🎯", "🔥", "💡", "👑", "🦁"].map((emo) => (
                        <button
                          key={emo || "initial"}
                          type="button"
                          onClick={() => setAvatarEmoji(emo)}
                          className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition ${
                            avatarEmoji === emo
                              ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700"
                              : "border-slate-200 bg-white hover:bg-slate-100"
                          }`}
                        >
                          {emo || "A"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Full / Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {(userId || participantData?.userId) && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="username"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {(userId || participantData?.userId) && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {(userId || participantData?.userId) && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      New Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? "Saving..." : "Save Profile Changes"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Responses & Messages */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Submitted Messages & Responses ({allResponses.length})
                </h4>
                {allResponses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200">
                    No messages or activity responses submitted yet.
                  </p>
                ) : (
                  allResponses.map((r: any) => (
                    <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-700">
                          {r.activity?.title || "Session Interaction"} ({r.activity?.type || "RESPONSE"})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-800">{r.content}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span>👍 {(r.reactions || []).length} likes</span>
                        <span>💬 {(r.comments || []).length} replies</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Replies & Comments */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Replies & Comments ({allComments.length})
                </h4>
                {allComments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200">
                    No comments or replies posted yet.
                  </p>
                ) : (
                  allComments.map((c: any) => (
                    <div key={c.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">
                          Reply on {c.response?.activity?.title || "Interaction"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-800">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Whiteboards */}
              {allWhiteboards.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Whiteboards ({allWhiteboards.length})
                  </h4>
                  {allWhiteboards.map((w: any) => (
                    <div
                      key={w.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-slate-800">
                          {w.activity?.title || "Collaborative Whiteboard"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        {w.isSubmitted ? "Submitted" : "In Progress"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <Link
            href={settingsHref}
            onClick={onClose}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Open Full User Settings Page</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParticipantDetailModal;
