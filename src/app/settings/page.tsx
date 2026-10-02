"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  User,
  Shield,
  Save,
  CheckCircle2,
  Presentation,
  Award,
  Trophy,
  ExternalLink,
} from "lucide-react";
import {
  getStoredAvatarConfig,
  saveStoredAvatarConfig,
} from "@/components/ParticipantDetailModal";
import { UserAvatarButton } from "@/components/UserAvatarButton";

const AVATAR_GRADIENTS = [
  { id: "indigo", label: "Indigo", bg: "from-indigo-500 to-purple-600" },
  { id: "emerald", label: "Emerald", bg: "from-emerald-500 to-teal-600" },
  { id: "amber", label: "Amber", bg: "from-amber-500 to-orange-600" },
  { id: "rose", label: "Rose", bg: "from-rose-500 to-pink-600" },
  { id: "cyan", label: "Cyan", bg: "from-cyan-500 to-blue-600" },
];

function UserSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryUserId = searchParams.get("userId");
  const queryParticipantId = searchParams.get("participantId");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [participantData, setParticipantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [avatarGradient, setAvatarGradient] = useState("from-indigo-500 to-purple-600");
  const [avatarEmoji, setAvatarEmoji] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const storedToken = localStorage.getItem("tgms_user_token");
        const rawUser = localStorage.getItem("tgms_user");
        let parsedUser: any = null;
        if (rawUser) {
          try {
            parsedUser = JSON.parse(rawUser);
            setCurrentUser(parsedUser);
          } catch {}
        }
        if (storedToken) setUserToken(storedToken);

        const headers: Record<string, string> = storedToken
          ? { Authorization: `Bearer ${storedToken}` }
          : {};

        if (queryParticipantId) {
          const res = await fetch(`/api/participants/${queryParticipantId}`, { headers });
          if (res.ok) {
            const pData = await res.json();
            setParticipantData(pData);
            setEditName(pData.displayName || pData.user?.name || "");
            setEditUsername(pData.user?.username || "");
            setEditEmail(pData.user?.email || "");
            const cfg = getStoredAvatarConfig(pData.user?.id || pData.id);
            setAvatarGradient(cfg.gradient);
            setAvatarEmoji(cfg.emoji);
          }
        } else {
          const targetUid = queryUserId || parsedUser?.id;
          if (targetUid) {
            const res = await fetch(`/api/users/${targetUid}`, { headers });
            if (res.ok) {
              const uData = await res.json();
              setProfileData(uData);
              setEditName(uData.name || "");
              setEditUsername(uData.username || "");
              setEditEmail(uData.email || "");
              const cfg = getStoredAvatarConfig(uData.id);
              setAvatarGradient(cfg.gradient);
              setAvatarEmoji(cfg.emoji);
            }
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [queryUserId, queryParticipantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
      };

      const targetKey =
        profileData?.id || participantData?.user?.id || participantData?.id || currentUser?.id;
      if (targetKey) {
        saveStoredAvatarConfig(targetKey, {
          gradient: avatarGradient,
          emoji: avatarEmoji,
        });
      }

      if (participantData?.id) {
        const res = await fetch(`/api/participants/${participantData.id}`, {
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
        setSuccessMsg("Participant profile and avatar settings saved!");
      } else {
        const targetUid = profileData?.id || currentUser?.id;
        if (!targetUid) throw new Error("No user profile selected");
        const res = await fetch(`/api/users/${targetUid}`, {
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
        setProfileData((prev: any) => ({
          ...prev,
          name: updated.name,
          username: updated.username,
          email: updated.email,
        }));
        if (currentUser?.id === targetUid) {
          const nextCurrent = {
            ...currentUser,
            name: updated.name,
            username: updated.username,
            email: updated.email,
          };
          setCurrentUser(nextCurrent);
          localStorage.setItem("tgms_user", JSON.stringify(nextCurrent));
        }
        setEditPassword("");
        setSuccessMsg("User profile and settings updated successfully!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    editName ||
    participantData?.displayName ||
    profileData?.name ||
    currentUser?.name ||
    "User";
  const role =
    profileData?.role ||
    participantData?.user?.role ||
    participantData?.role ||
    currentUser?.role ||
    "PARTICIPANT";
  const createdSessions =
    profileData?.sessions || participantData?.user?.sessions || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header with Avatar on Upper Right Corner */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                User Profile & Account Settings
              </h1>
              <p className="text-xs text-slate-500">
                Manage your personal info, avatar appearance, password, and session history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UserAvatarButton
              user={profileData || currentUser}
              participant={participantData}
              userToken={userToken}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-400">
            Loading profile & settings...
          </div>
        ) : (
          <>
            {/* Profile Hero Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient} border-2 border-white/30 flex items-center justify-center text-2xl font-extrabold text-white shadow-lg`}
                >
                  {avatarEmoji || displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold">{displayName}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
                      {role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {editUsername ? `@${editUsername}` : "Guest Profile"} •{" "}
                    {editEmail || "No email linked"}
                  </p>
                </div>
              </div>

              {createdSessions.length > 0 && (
                <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-right">
                  <span className="block text-[10px] font-bold uppercase text-indigo-200">
                    Sessions Created / Hosted
                  </span>
                  <span className="text-lg font-extrabold text-white">
                    {createdSessions.length} Sessions
                  </span>
                </div>
              )}
            </div>

            {/* Edit Form */}
            <form
              onSubmit={handleSave}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5"
            >
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-indigo-600" />
                Edit Personal Info & Avatar
              </h3>

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Avatar Customizer */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Customize Your Avatar
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center text-xl font-extrabold shadow-md`}
                  >
                    {avatarEmoji || displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {AVATAR_GRADIENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setAvatarGradient(g.bg)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${g.bg} ${
                            avatarGradient === g.bg
                              ? "ring-2 ring-offset-2 ring-indigo-600"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">Avatar Badge / Emoji:</span>
                      {["", "🚀", "🌟", "🎯", "🔥", "💡", "👑", "🦁", "🎓"].map((emo) => (
                        <button
                          key={emo || "initial"}
                          type="button"
                          onClick={() => setAvatarEmoji(emo)}
                          className={`w-8 h-8 rounded-xl border text-xs flex items-center justify-center transition ${
                            avatarEmoji === emo
                              ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700"
                              : "border-slate-200 bg-white hover:bg-slate-100"
                          }`}
                        >
                          {emo || "Initial"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Full / Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {(profileData?.id || participantData?.userId || currentUser?.id) && (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        New Password (optional)
                      </label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Leave blank to keep existing password"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving Changes..." : "Save Profile & Settings"}</span>
                </button>
              </div>
            </form>

            {/* Created Sessions Overview for Facilitators */}
            {createdSessions.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-indigo-600" />
                    Created / Hosted Sessions ({createdSessions.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {createdSessions.map((sess: any) => (
                    <div
                      key={sess.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {sess.code}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{sess.title}</span>
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
                        <p className="text-slate-500">
                          Created: {new Date(sess.createdAt).toLocaleString()} •{" "}
                          {sess._count?.participants ?? 0} participants •{" "}
                          {sess._count?.activities ?? 0} activities
                        </p>
                      </div>
                      <Link
                        href={`/sessions/${sess.id}/facilitator`}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition"
                      >
                        <span>Open Console</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function UserSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-400">
          Loading settings...
        </div>
      }
    >
      <UserSettingsContent />
    </Suspense>
  );
}
