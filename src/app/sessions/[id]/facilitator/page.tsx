"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSocket } from "@/lib/socket-client";
import {
  Users,
  QrCode,
  ExternalLink,
  Presentation,
  Play,
  Lock,
  CheckCircle,
  Sparkles,
  Layers,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  Plus,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";

export default function FacilitatorDashboard() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Presentation State
  const [currentSlide, setCurrentSlide] = useState(1);
  const [canvaUrl, setCanvaUrl] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  const [newMappingTitle, setNewMappingTitle] = useState("");
  const [newMappingSlide, setNewMappingSlide] = useState(1);

  // Activity State
  const [activities, setActivities] = useState<any[]>([]);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [newActTitle, setNewActTitle] = useState("");
  const [newActPrompt, setNewActPrompt] = useState("");
  const [newActReveal, setNewActReveal] = useState("UPON_LOCK");

  useEffect(() => {
    async function fetchSessionData() {
      try {
        const [resSession, resActivities] = await Promise.all([
          fetch(`/api/sessions/${id}`),
          fetch(`/api/sessions/${id}/activities`),
        ]);

        if (!resSession.ok) throw new Error("Failed to load session");
        const sessionData = await resSession.json();
        setSession(sessionData);
        setParticipants(sessionData.participants || []);
        setMappings(sessionData.presentationMappings || []);
        if (sessionData.canvaPresentationUrl) setCanvaUrl(sessionData.canvaPresentationUrl);
        if (sessionData.canvaSlideCount) setSlideCount(sessionData.canvaSlideCount);

        if (resActivities.ok) {
          const actData = await resActivities.json();
          setActivities(actData);
          const current = actData.find((a: any) => a.state === "ACTIVE" || a.state === "LOCKED");
          if (current) {
            setActiveActivity(current);
            loadResponses(current.id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSessionData();

    const socket = getSocket();
    socket.emit("session:join", { sessionId: id, isFacilitator: true });

    socket.on("session:roster_updated", (data: { participants: any[] }) => {
      setParticipants(data.participants);
    });

    socket.on("response:added", ({ response }: { response: any }) => {
      setResponses((prev) => [response, ...prev.filter((r) => r.id !== response.id)]);
    });

    return () => {
      socket.off("session:roster_updated");
      socket.off("response:added");
    };
  }, [id]);

  const loadResponses = async (actId: string) => {
    try {
      const res = await fetch(`/api/activities/${actId}/responses?isFacilitator=true`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const changeSlide = async (newSlide: number) => {
    if (newSlide < 1 || newSlide > slideCount) return;
    setCurrentSlide(newSlide);

    const socket = getSocket();
    socket.emit("presentation:slide_change", { sessionId: id, slideNumber: newSlide });

    await fetch(`/api/sessions/${id}/slide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideNumber: newSlide }),
    });
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim() || !newActPrompt.trim()) return;

    try {
      const res = await fetch(`/api/sessions/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newActTitle.trim(),
          prompt: newActPrompt.trim(),
          revealMode: newActReveal,
          presentationSlide: currentSlide,
        }),
      });

      if (!res.ok) throw new Error("Failed to create activity");
      const created = await res.json();
      setActivities((prev) => [...prev, created]);
      setShowCreateActivity(false);
      setNewActTitle("");
      setNewActPrompt("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const transitionActivity = async (activityId: string, state: "ACTIVE" | "LOCKED" | "COMPLETED") => {
    try {
      const res = await fetch(`/api/activities/${activityId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });

      if (!res.ok) throw new Error("Failed to transition activity state");
      const updated = await res.json();

      // Update local activities list
      setActivities((prev) =>
        prev.map((a) => {
          if (a.id === activityId) return updated;
          if (state === "ACTIVE" && a.state === "ACTIVE") return { ...a, state: "COMPLETED" };
          return a;
        })
      );

      if (state === "ACTIVE" || state === "LOCKED") {
        setActiveActivity(updated);
        loadResponses(updated.id);
      } else if (state === "COMPLETED") {
        setActiveActivity(null);
        setResponses([]);
      }

      // Broadcast over socket to participants and projector view
      const socket = getSocket();
      socket.emit("activity:change_state", { sessionId: id, activity: updated });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleModerate = async (responseId: string, currentHidden: boolean) => {
    try {
      const res = await fetch(`/api/responses/${responseId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !currentHidden }),
      });
      if (res.ok) {
        setResponses((prev) =>
          prev.map((r) => (r.id === responseId ? { ...r, isHidden: !currentHidden } : r))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Loading session dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{session.title}</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              {session.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Facilitator: {session.facilitator?.name || "Trainer"}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs text-slate-500 mr-2 font-medium">Join Code:</span>
            <span className="font-mono text-lg font-bold text-indigo-600 tracking-wider mr-2">
              {session.code}
            </span>
            <button
              onClick={copyCode}
              title="Copy Code"
              className="text-slate-400 hover:text-slate-700 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setShowQr(!showQr)}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition text-slate-700"
            title="Show QR Code"
          >
            <QrCode className="w-5 h-5 text-indigo-600" />
          </button>

          <Link
            href={`/sessions/${id}/projector`}
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition"
          >
            <ExternalLink className="w-4 h-4" />
            Launch Projector View
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Presentation Controller & Active Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* QR Code Banner */}
          {showQr && (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Scan to Join Session
              </h3>
              <div className="w-48 h-48 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-200 mb-3">
                <span className="text-xs text-slate-400 font-mono">Code: {session.code}</span>
              </div>
            </div>
          )}

          {/* Presentation Controller */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Presentation className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">Presentation Controller</h2>
              </div>
              <button
                onClick={() => setShowLinkModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg transition"
              >
                <Link2 className="w-3.5 h-3.5" />
                {session.canvaPresentationUrl ? "Edit Presentation Link" : "Link Canva Presentation"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeSlide(currentSlide - 1)}
                  disabled={currentSlide <= 1}
                  className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <div className="px-4 py-1.5 bg-white rounded-lg border border-slate-200 text-sm font-bold text-slate-800 font-mono">
                  Slide {currentSlide} / {slideCount}
                </div>
                <button
                  onClick={() => changeSlide(currentSlide + 1)}
                  disabled={currentSlide >= slideCount}
                  className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
              </div>

              <div className="text-xs text-slate-500">
                {mappings.find((m) => m.slideNumber === currentSlide)?.title ? (
                  <span>Checkpoint: <strong className="text-slate-800">{mappings.find((m) => m.slideNumber === currentSlide).title}</strong></span>
                ) : (
                  <span>No checkpoint on Slide {currentSlide}</span>
                )}
              </div>
            </div>
          </div>

          {/* Active Activity & Live Responses Command Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">
                  {activeActivity ? activeActivity.title : "Activity Engine"}
                </h2>
                {activeActivity && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      activeActivity.state === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {activeActivity.state}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeActivity?.state === "ACTIVE" && (
                  <button
                    onClick={() => transitionActivity(activeActivity.id, "LOCKED")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock Responses
                  </button>
                )}
                {activeActivity?.state === "LOCKED" && (
                  <button
                    onClick={() => transitionActivity(activeActivity.id, "COMPLETED")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Complete Activity
                  </button>
                )}
                <button
                  onClick={() => setShowCreateActivity(!showCreateActivity)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Activity
                </button>
              </div>
            </div>

            {/* Create Activity Drawer */}
            {showCreateActivity && (
              <form onSubmit={handleCreateActivity} className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configure New Activity</h3>
                <div>
                  <input
                    type="text"
                    required
                    value={newActTitle}
                    onChange={(e) => setNewActTitle(e.target.value)}
                    placeholder="Activity Title (e.g. Case Challenge 1)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <textarea
                    rows={2}
                    required
                    value={newActPrompt}
                    onChange={(e) => setNewActPrompt(e.target.value)}
                    placeholder="Prompt / Question for participants"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 font-medium">Reveal Mode:</label>
                    <select
                      value={newActReveal}
                      onChange={(e) => setNewActReveal(e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="UPON_LOCK">Hide responses until Locked (Anti-bias)</option>
                      <option value="IMMEDIATE">Stream responses live (Brainstorm)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    Save Activity
                  </button>
                </div>
              </form>
            )}

            {/* If an activity is active/locked, show prompt and live responses */}
            {activeActivity ? (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="block text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Current Prompt</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{activeActivity.prompt}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Submissions ({responses.length})
                    </span>
                    <span className="text-xs text-slate-400">
                      Mode: <strong className="text-slate-600">{activeActivity.revealMode}</strong>
                    </span>
                  </div>

                  {responses.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Waiting for participant submissions...
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {responses.map((resp) => (
                        <div
                          key={resp.id}
                          className={`p-3.5 rounded-xl border transition ${
                            resp.isHidden ? "bg-red-50/50 border-red-200 opacity-60" : "bg-white border-slate-200 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-700">
                              {resp.participant?.displayName || "Participant"}
                            </span>
                            <div className="flex items-center gap-2">
                              {resp.isHidden && (
                                <span className="text-[10px] text-red-600 font-bold uppercase">Hidden</span>
                              )}
                              <button
                                onClick={() => toggleModerate(resp.id, resp.isHidden)}
                                title={resp.isHidden ? "Unhide response" : "Hide response from participants"}
                                className="text-slate-400 hover:text-slate-700 transition"
                              >
                                {resp.isHidden ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-800">{resp.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-3">Activities created for this session:</p>
                {activities.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No activities created yet. Click "New Activity" above to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{act.title}</h4>
                          <p className="text-[11px] text-slate-500 truncate max-w-sm">{act.prompt}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-white rounded border border-slate-200">
                            {act.state}
                          </span>
                          {act.state !== "ACTIVE" && (
                            <button
                              onClick={() => transitionActivity(act.id, "ACTIVE")}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Play className="w-3 h-3" />
                              Launch
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Participant Roster */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Connected Participants
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                {participants.length}
              </span>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Waiting for participants to join with code <strong className="text-indigo-600">{session.code}</strong>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {participants.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          p.isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        }`}
                      />
                      <span className="text-sm font-medium text-slate-800">{p.displayName}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{p.totalPoints} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
