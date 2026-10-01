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
  Clock,
  Award,
  Sparkles,
  Layers,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  Plus,
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

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) throw new Error("Failed to load session");
        const data = await res.json();
        setSession(data);
        setParticipants(data.participants || []);
        setMappings(data.presentationMappings || []);
        if (data.canvaPresentationUrl) setCanvaUrl(data.canvaPresentationUrl);
        if (data.canvaSlideCount) setSlideCount(data.canvaSlideCount);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();

    const socket = getSocket();
    socket.emit("session:join", { sessionId: id, isFacilitator: true });

    socket.on("session:roster_updated", (data: { participants: any[] }) => {
      setParticipants(data.participants);
    });

    return () => {
      socket.off("session:roster_updated");
    };
  }, [id]);

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

    // Broadcast over Socket.IO to Projector View
    const socket = getSocket();
    socket.emit("presentation:slide_change", { sessionId: id, slideNumber: newSlide });

    // Record slide view event
    await fetch(`/api/sessions/${id}/slide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slideNumber: newSlide }),
    });
  };

  const handleSavePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/sessions/${id}/presentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvaPresentationUrl: canvaUrl,
          canvaSlideCount: Number(slideCount),
        }),
      });
      if (!res.ok) throw new Error("Failed to link presentation");
      const updated = await res.json();
      setSession(updated);
      setShowLinkModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMappingTitle.trim()) return;

    try {
      const res = await fetch(`/api/sessions/${id}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideNumber: Number(newMappingSlide),
          title: newMappingTitle.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to add mapping");
      const mapping = await res.json();
      setMappings((prev) => [...prev, mapping].sort((a, b) => a.slideNumber - b.slideNumber));
      setNewMappingTitle("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Loading session dashboard...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-red-500 font-medium">Session not found.</div>
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

      {/* Main Split-Workspace */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Presentation Navigation & Live Activity Controls */}
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

          {/* Presentation Controller Banner */}
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

            {/* Slide Navigation Stepper */}
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
                  <span>No checkpoint mapped to Slide {currentSlide}</span>
                )}
              </div>
            </div>

            {/* Checkpoint Mapping Accordion/List */}
            <div className="mt-4 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Slide Checkpoint Mappings</span>
              </div>
              <form onSubmit={handleAddMapping} className="flex gap-2 mb-3">
                <input
                  type="number"
                  min={1}
                  max={slideCount}
                  value={newMappingSlide}
                  onChange={(e) => setNewMappingSlide(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                  placeholder="Slide"
                />
                <input
                  type="text"
                  value={newMappingTitle}
                  onChange={(e) => setNewMappingTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                  placeholder="Checkpoint title (e.g. Case Study 1)"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Map Slide
                </button>
              </form>

              {mappings.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {mappings.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => changeSlide(m.slideNumber)}
                      className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition ${
                        m.slideNumber === currentSlide
                          ? "bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>Slide {m.slideNumber}: {m.title}</span>
                      <span className="text-[10px] text-slate-400">Jump</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity Center Placeholder */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Live Activities
              </h2>
            </div>
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No active challenge in progress</p>
              <p className="text-xs text-slate-400 mt-1">
                Advance slides or launch an activity from your presentation checkpoints.
              </p>
            </div>
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

      {/* Modal for Linking Canva Presentation */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">Connect Canva Presentation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Paste the public view or embed URL of your Canva presentation slide deck.
            </p>

            <form onSubmit={handleSavePresentation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Canva View / Embed URL
                </label>
                <input
                  type="url"
                  required
                  value={canvaUrl}
                  onChange={(e) => setCanvaUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/.../view"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Total Slides
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition"
                >
                  Save Presentation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
