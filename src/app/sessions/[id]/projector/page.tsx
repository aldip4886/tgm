"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { DigitalTimer } from "@/components/DigitalTimer";
import { CollaborativeWhiteboard } from "@/components/CollaborativeWhiteboard";
import { Presentation, Sparkles, QrCode } from "lucide-react";

export default function ProjectorView() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [currentMapping, setCurrentMapping] = useState<any>(null);
  const [timerState, setTimerState] = useState<any>(null);
  const [projectedWhiteboard, setProjectedWhiteboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) throw new Error("Failed to load session");
        const data = await res.json();
        setSession(data);

        // Find initial mapping if slide 1 exists
        const mapping = (data.presentationMappings || []).find((m: any) => m.slideNumber === 1);
        if (mapping) setCurrentMapping(mapping);

        // Check active activity timer
        const activeAct = (data.activities || []).find((a: any) => a.state === "ACTIVE");
        if (activeAct && activeAct.timerStatus !== "STOPPED") {
          setTimerState({
            status: activeAct.timerStatus,
            endsAt: activeAct.timerEndsAt,
            remainingMs: activeAct.timerRemainingMs,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const socket = getSocket();
    socket.emit("session:join", { sessionId: id });

    socket.on("presentation:slide_updated", (data: { slideNumber: number }) => {
      setCurrentSlide(data.slideNumber);
    });

    socket.on("timer:updated", (data: any) => {
      setTimerState({
        status: data.timerStatus,
        endsAt: data.timerEndsAt,
        remainingMs: data.timerRemainingMs,
      });
    });

    socket.on("whiteboard:projected", async ({ whiteboardId }: { whiteboardId: string }) => {
      if (whiteboardId) {
        try {
          const res = await fetch(`/api/whiteboards/${whiteboardId}`);
          if (res.ok) {
            const data = await res.json();
            setProjectedWhiteboard(data);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setProjectedWhiteboard(null);
      }
    });

    return () => {
      socket.off("presentation:slide_updated");
      socket.off("timer:updated");
      socket.off("whiteboard:projected");
    };
  }, [id]);

  useEffect(() => {
    if (session?.presentationMappings) {
      const mapping = session.presentationMappings.find((m: any) => m.slideNumber === currentSlide);
      setCurrentMapping(mapping || null);
    }
  }, [currentSlide, session]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
        Loading Projector View...
      </div>
    );
  }

  // Convert canva view link to embed link if applicable
  const embedUrl = session.canvaPresentationUrl
    ? session.canvaPresentationUrl.includes("view?embed")
      ? session.canvaPresentationUrl
      : session.canvaPresentationUrl.replace("/view", "/view?embed")
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none overflow-hidden">
      {/* Top Ambient Bar */}
      <header className="px-8 py-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">
            {currentSlide}
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100">{session.title}</h1>
            <p className="text-xs text-slate-400">
              {currentMapping ? currentMapping.title : `Slide ${currentSlide} of ${session.canvaSlideCount || 1}`}
            </p>
          </div>
        </div>

        {/* Center Synchronized Timer */}
        {timerState && timerState.status !== "STOPPED" && (
          <div>
            <DigitalTimer
              endsAt={timerState.endsAt}
              remainingMs={timerState.remainingMs}
              status={timerState.status}
              size="lg"
            />
          </div>
        )}

        {/* Join Prompt Banner for Audience */}
        <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
          <div className="text-right">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Join Live</span>
            <span className="font-mono text-base font-bold text-indigo-400 tracking-wider">{session.code}</span>
          </div>
          <div className="p-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
      </header>

      {/* Main Projector Presentation Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {projectedWhiteboard ? (
          <div className="w-full max-w-5xl bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold border border-indigo-500/30">
                  Projected Whiteboard
                </span>
                <h3 className="text-xl font-bold text-white">
                  {projectedWhiteboard.team?.name ||
                    projectedWhiteboard.participant?.displayName ||
                    "Collaborative Whiteboard"}
                </h3>
              </div>
            </div>
            <div className="w-full bg-white rounded-2xl overflow-hidden text-slate-900 shadow-inner">
              <CollaborativeWhiteboard
                whiteboardId={projectedWhiteboard.id}
                sessionId={id}
                readOnly={true}
                initialSceneData={projectedWhiteboard.sceneData}
              />
            </div>
          </div>
        ) : embedUrl ? (
          <div className="w-full h-full max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="fullscreen"
            />
          </div>
        ) : (
          <div className="max-w-2xl text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Presentation className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {currentMapping?.title || `Slide ${currentSlide}`}
            </h2>
            {currentMapping?.checkpoint && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-medium border border-indigo-500/30">
                <Sparkles className="w-4 h-4" />
                Checkpoint: {currentMapping.checkpoint}
              </div>
            )}
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Follow along with the facilitator. Interactive challenges will activate automatically.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
