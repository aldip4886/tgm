"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { DigitalTimer } from "@/components/DigitalTimer";
import { CollaborativeWhiteboard } from "@/components/CollaborativeWhiteboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { PresentationViewer } from "@/components/PresentationViewer";
import { PollQuizView } from "@/components/interactions/PollQuizView";
import { WordCloudView } from "@/components/interactions/WordCloudView";
import { QAView } from "@/components/interactions/QAView";
import { RankingView } from "@/components/interactions/RankingView";
import { UserAvatarButton } from "@/components/UserAvatarButton";
import { SentConfirmationEffect, SentConfirmationEvent } from "@/components/SentConfirmationEffect";
import {
  Presentation,
  Sparkles,
  QrCode,
  Trophy,
  Activity as ActivityIcon,
  X,
  MessageSquare,
  Eye,
  EyeOff,
  ThumbsUp,
} from "lucide-react";
import QRCode from "qrcode";

export default function ProjectorView() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [currentMapping, setCurrentMapping] = useState<any>(null);
  const [timerState, setTimerState] = useState<any>(null);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [viewOverride, setViewOverride] = useState<"presentation" | "interaction" | null>(null);
  const [projectedWhiteboard, setProjectedWhiteboard] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<{ participants: any[]; teams: any[] }>({
    participants: [],
    teams: [],
  });
  const [leaderboardVisibility, setLeaderboardVisibility] = useState("HIDDEN");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Real-time Live Presentation Chat in Projector View
  const [presentationChatEnabled, setPresentationChatEnabled] = useState(true);
  const [showProjectorChat, setShowProjectorChat] = useState(true);
  const [presentationChatMessages, setPresentationChatMessages] = useState<any[]>([]);
  const [sentConfirmation, setSentConfirmation] = useState<SentConfirmationEvent | null>(null);

  const loadPresentationChat = async () => {
    try {
      const res = await fetch(`/api/sessions/${id}/presentation/chat`);
      if (res.ok) {
        const data = await res.json();
        setPresentationChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("tgms_user");
        if (storedUser) setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }

    async function loadSession() {
      try {
        const [res, lbRes] = await Promise.all([
          fetch(`/api/sessions/${id}`),
          fetch(`/api/sessions/${id}/leaderboard`),
        ]);

        if (!res.ok) throw new Error("Failed to load session");
        const data = await res.json();
        setSession(data);

        if (data.canvaPresentationUrl) {
          const s = getSocket();
          s.emit("presentation:project", {
            sessionId: id,
            isProjected: true,
            canvaPresentationUrl: data.canvaPresentationUrl,
          });
        }

        // Find initial mapping if slide 1 exists
        const mapping = (data.presentationMappings || []).find((m: any) => m.slideNumber === 1);
        if (mapping) setCurrentMapping(mapping);

        // Check active activity (excluding PRESENTATION_CHAT)
        const activeAct = (data.activities || []).find(
          (a: any) =>
            a.type !== "PRESENTATION_CHAT" && (a.state === "ACTIVE" || a.state === "LOCKED")
        );
        if (activeAct) {
          setActiveActivity(activeAct);
          if (activeAct.timerStatus !== "STOPPED") {
            setTimerState({
              status: activeAct.timerStatus,
              endsAt: activeAct.timerEndsAt,
              remainingMs: activeAct.timerRemainingMs,
            });
          }
        }

        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboardData({ participants: lbData.participants, teams: lbData.teams });
          if (lbData.visibility) setLeaderboardVisibility(lbData.visibility);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
    loadPresentationChat();

    const loadLeaderboardData = async () => {
      try {
        const res = await fetch(`/api/sessions/${id}/leaderboard`);
        if (res.ok) {
          const lbData = await res.json();
          setLeaderboardData({ participants: lbData.participants, teams: lbData.teams });
          if (lbData.visibility) setLeaderboardVisibility(lbData.visibility);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const socket = getSocket();
    socket.emit("session:join", { sessionId: id });

    socket.on("presentation:slide_updated", (data: { slideNumber: number }) => {
      if (data.slideNumber >= 1) {
        setCurrentSlide(data.slideNumber);
      }
    });

    socket.on("presentation:projected", (data: any) => {
      if (typeof data.currentSlide === "number" && data.currentSlide >= 1) {
        setCurrentSlide(data.currentSlide);
      }
      if (typeof data.chatEnabled === "boolean") {
        setPresentationChatEnabled(data.chatEnabled);
      }
      setSession((prev: any) =>
        prev
          ? {
              ...prev,
              canvaPresentationUrl: data.isProjected ? data.canvaPresentationUrl : null,
            }
          : prev
      );
    });

    socket.on("presentation:chat_updated", (data?: { message?: any }) => {
      if (data?.message) {
        setPresentationChatMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          const senderName = data.message.participant?.displayName || "Facilitator";
          setSentConfirmation({
            type: "MESSAGE_RECEIVED",
            title: `Live Chat: ${senderName}`,
            detail: data.message.content,
            recipientName: senderName,
          });
          return [...prev, data.message];
        });
      }
      loadPresentationChat();
    });

    socket.on("like:added", () => {
      loadPresentationChat();
    });

    socket.on("comment:added", () => {
      loadPresentationChat();
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

    socket.on("presentation:linked", (data: { canvaPresentationUrl: string | null; slideCount?: number }) => {
      setSession((prev: any) =>
        prev
          ? {
              ...prev,
              canvaPresentationUrl: data.canvaPresentationUrl,
            }
          : prev
      );
      if (data.canvaPresentationUrl) {
        socket.emit("presentation:project", {
          sessionId: id,
          isProjected: true,
          canvaPresentationUrl: data.canvaPresentationUrl,
        });
      }
    });

    socket.on("leaderboard:visibility_updated", ({ visibility }: any) => {
      setLeaderboardVisibility(visibility);
      loadLeaderboardData();
    });

    socket.on("leaderboard:scores_updated", () => {
      loadLeaderboardData();
      loadPresentationChat();
    });

    socket.on("activity:state_updated", ({ activity }: { activity: any }) => {
      if (activity?.type === "PRESENTATION_CHAT") return;
      if (activity.state === "ACTIVE" || activity.state === "LOCKED") {
        setActiveActivity(activity);
        setViewOverride(null);
      } else {
        setActiveActivity((prev: any) => (prev?.id === activity.id ? null : prev));
      }
    });

    return () => {
      socket.off("presentation:slide_updated");
      socket.off("presentation:projected");
      socket.off("presentation:chat_updated");
      socket.off("like:added");
      socket.off("comment:added");
      socket.off("presentation:linked");
      socket.off("timer:updated");
      socket.off("whiteboard:projected");
      socket.off("leaderboard:visibility_updated");
      socket.off("leaderboard:scores_updated");
      socket.off("activity:state_updated");
    };
  }, [id]);

  useEffect(() => {
    if (session?.presentationMappings) {
      const mapping = session.presentationMappings.find((m: any) => m.slideNumber === currentSlide);
      setCurrentMapping(mapping || null);
    }
  }, [currentSlide, session]);

  useEffect(() => {
    if (!session?.code || typeof window === "undefined") return;
    const joinUrl = `${window.location.origin}/?code=${session.code}`;
    QRCode.toDataURL(joinUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation failed:", err));
  }, [session?.code]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
        Loading Projector View...
      </div>
    );
  }

  const presentationUrl = session.canvaPresentationUrl || null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none overflow-hidden">
      {/* Top Ambient Bar */}
      <header className="px-6 py-3 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">
            <Presentation className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100">{session.title}</h1>
            <p className="text-xs text-slate-400">
              {currentMapping
                ? `${currentMapping.title} (Slide ${currentSlide})`
                : presentationUrl
                ? `Live Presentation (Slide ${currentSlide})`
                : "Projector Screen"}
            </p>
          </div>
        </div>

        {/* Center Synchronized Countdown Timer (Active during both Screen Projection & Interactions) */}
        {timerState && timerState.status !== "STOPPED" && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-950/90 border border-amber-500/40 rounded-2xl shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Countdown
            </span>
            <DigitalTimer
              endsAt={timerState.endsAt}
              remainingMs={timerState.remainingMs}
              status={timerState.status}
              size="lg"
            />
          </div>
        )}

        {/* Live Standings Button, Chat Toggle, Interaction Toggle & Join Prompt */}
        <div className="flex items-center gap-3">
          {presentationUrl && presentationChatEnabled && (
            <button
              type="button"
              onClick={() => setShowProjectorChat((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow ${
                showProjectorChat
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
              title={showProjectorChat ? "Hide Presentation Live Chat" : "Unhide Presentation Live Chat"}
            >
              {showProjectorChat ? (
                <>
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                  <span>Hide Live Chat ({presentationChatMessages.length})</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>Unhide Live Chat ({presentationChatMessages.length})</span>
                </>
              )}
            </button>
          )}

          {activeActivity &&
            ["POLL", "QUIZ", "WORD_CLOUD", "QA", "RANKING"].includes(activeActivity.type) &&
            presentationUrl && (
              <button
                onClick={() =>
                  setViewOverride(viewOverride === "presentation" ? "interaction" : "presentation")
                }
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold hover:bg-indigo-600/30 transition shadow"
              >
                <ActivityIcon className="w-4 h-4 text-indigo-400" />
                <span>
                  {viewOverride === "presentation" ? "Show Live Interaction" : "Show Presentation"}
                </span>
              </button>
            )}

          {leaderboardVisibility === "LIVE" && (
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition shadow"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{showLeaderboard ? "Show Screen" : "Show Standings"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            title="Click to show QR Code on screen"
            className="flex items-center gap-4 bg-slate-800/80 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Join Live</span>
              <span className="font-mono text-base font-bold text-indigo-400 tracking-wider">{session.code}</span>
            </div>
            <div className="p-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg">
              <QrCode className="w-5 h-5" />
            </div>
          </button>

          {currentUser && (
            <div className="pl-2 border-l border-slate-800">
              <UserAvatarButton
                user={currentUser}
                showLabel={false}
                onProfileUpdated={(updated) => setCurrentUser(updated)}
              />
            </div>
          )}
        </div>
      </header>

      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-4">
              Scan to Join Session
            </h3>
            <div className="w-64 h-64 bg-white rounded-2xl p-3 flex items-center justify-center shadow-lg mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for session ${session.code}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400 font-mono">Generating QR...</span>
              )}
            </div>
            <div className="text-center">
              <span className="text-xs uppercase text-slate-400 font-semibold block">Session Join Code</span>
              <span className="font-mono text-3xl font-extrabold text-white tracking-widest mt-1 block">
                {session.code}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Projector Presentation Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-3 relative w-full">
        {showLeaderboard ? (
          <div className="w-full max-w-4xl p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <LeaderboardView
              theme="dark"
              participants={leaderboardData.participants}
              teams={leaderboardData.teams}
            />
          </div>
        ) : projectedWhiteboard ? (
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
        ) : activeActivity &&
          ["POLL", "QUIZ", "WORD_CLOUD", "QA", "RANKING"].includes(activeActivity.type) &&
          viewOverride !== "presentation" ? (
          <div className="w-full max-w-5xl bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {activeActivity.type === "POLL" || activeActivity.type === "QUIZ" ? (
              <PollQuizView
                activity={activeActivity}
                mode="projector"
                sessionId={id}
              />
            ) : activeActivity.type === "WORD_CLOUD" ? (
              <WordCloudView
                activity={activeActivity}
                mode="projector"
                sessionId={id}
              />
            ) : activeActivity.type === "QA" ? (
              <QAView
                activity={activeActivity}
                mode="projector"
                sessionId={id}
              />
            ) : activeActivity.type === "RANKING" ? (
              <RankingView
                activity={activeActivity}
                mode="projector"
                sessionId={id}
              />
            ) : null}
          </div>
        ) : presentationUrl ? (
          <div className="w-full h-full max-h-[85vh] flex-1 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black flex flex-col lg:flex-row">
            <div className="flex-1 h-full min-h-[360px] flex flex-col">
              <PresentationViewer
                url={presentationUrl}
                currentSlide={currentSlide}
                allowInteractiveNavigation={true}
                onSlideChange={(slide) => setCurrentSlide(slide)}
                className="w-full flex-1 h-full"
              />
            </div>

            {/* Real-Time Presentation Live Chat Panel in Projector View */}
            {presentationChatEnabled && showProjectorChat && (
              <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/95 flex flex-col h-72 lg:h-full shrink-0">
                <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Presentation Live Chat</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      {presentationChatMessages.length} msgs
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowProjectorChat(false)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition"
                      title="Hide Presentation Live Chat"
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                  {presentationChatMessages.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      Live chat is active! Messages, Q&A, and points from participants and the facilitator appear here in real time.
                    </div>
                  ) : (
                    presentationChatMessages.map((msg: any) => {
                      const likeCount =
                        msg.reactions?.filter((rx: any) => rx.type === "LIKE").length || 0;
                      const comments = msg.comments || [];
                      const ptsSum = (msg.points || []).reduce(
                        (acc: number, p: any) => acc + p.amount,
                        0
                      );

                      return (
                        <div
                          key={msg.id}
                          className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-indigo-300 truncate">
                              {msg.participant?.displayName || "Facilitator"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {ptsSum > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                  +{ptsSum} pts
                                </span>
                              )}
                              {likeCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold text-[10px] flex items-center gap-1">
                                  <ThumbsUp className="w-2.5 h-2.5" />
                                  {likeCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-100 break-words leading-relaxed">{msg.content}</p>

                          {comments.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-700/60 space-y-1 pl-2.5 border-l-2 border-indigo-400">
                              {comments.map((c: any) => (
                                <div key={c.id} className="text-[11px] text-slate-300">
                                  <span className="font-bold text-indigo-300 mr-1">
                                    {c.participant?.displayName || "Facilitator"}:
                                  </span>
                                  <span>{c.content}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Presentation className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {currentMapping?.title || session.title || "Live Session"}
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

      <SentConfirmationEffect
        confirmation={sentConfirmation}
        onDone={() => setSentConfirmation(null)}
      />
    </div>
  );
}
