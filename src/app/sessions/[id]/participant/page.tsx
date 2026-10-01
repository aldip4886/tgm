"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { DigitalTimer } from "@/components/DigitalTimer";
import { CollaborativeWhiteboard } from "@/components/CollaborativeWhiteboard";
import { LeaderboardView } from "@/components/LeaderboardView";
import { BadgeCelebrationModal } from "@/components/BadgeCelebrationModal";
import { PollQuizView } from "@/components/interactions/PollQuizView";
import { WordCloudView } from "@/components/interactions/WordCloudView";
import { QAView } from "@/components/interactions/QAView";
import { RankingView } from "@/components/interactions/RankingView";
import { AwardNotificationModal } from "@/components/AwardNotificationModal";
import { ProjectedWorkModal } from "@/components/ProjectedWorkModal";
import {
  Sparkles,
  Users,
  Award,
  ShieldAlert,
  Heart,
  Send,
  Lock,
  CheckCircle2,
  ThumbsUp,
  MessageCircle,
  Plus,
  Trophy,
  ExternalLink,
  Presentation,
  Palette,
  HelpCircle,
  X,
} from "lucide-react";

export default function ParticipantSessionView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Activity & Responses State
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [myResponse, setMyResponse] = useState<any>(null);
  const [responseInput, setResponseInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [peerResponses, setPeerResponses] = useState<any[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [myWhiteboard, setMyWhiteboard] = useState<any>(null);

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState<{ participants: any[]; teams: any[] }>({
    participants: [],
    teams: [],
  });
  const [leaderboardVisibility, setLeaderboardVisibility] = useState("HIDDEN");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Badges State
  const [badges, setBadges] = useState<any[]>([]);
  const [celebratingBadge, setCelebratingBadge] = useState<{ badge: any; reason?: string } | null>(null);

  // Pop-up Award Notification State (Points & Comments)
  const [awardedNotification, setAwardedNotification] = useState<{
    type: "POINTS" | "COMMENT";
    amount?: number;
    reason?: string;
    giverName?: string;
    commenterName?: string;
    content?: string;
  } | null>(null);

  // Projected Work & Inspection State
  const [projectedWork, setProjectedWork] = useState<any | null>(null);
  const [showProjectedModal, setShowProjectedModal] = useState(false);
  const [showRewardsExplainer, setShowRewardsExplainer] = useState(false);
  const [pointReasonInputs, setPointReasonInputs] = useState<Record<string, string>>({});
  const [activeReasonResponseId, setActiveReasonResponseId] = useState<string | null>(null);

  useEffect(() => {
    async function initParticipant() {
      try {
        const storedToken = localStorage.getItem(`tgms_token_${id}`);
        if (!storedToken) {
          setError("No participant session token found. Please join from the home page.");
          setLoading(false);
          return;
        }
        setToken(storedToken);

        const res = await fetch("/api/sessions/reconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: storedToken }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to reconnect session");
        }

        const partData = await res.json();
        setParticipant(partData);
        setSession(partData.session);

        // Fetch any currently active activity
        const actRes = await fetch(`/api/sessions/${id}/activities`);
        if (actRes.ok) {
          const actData = await actRes.json();
          const current = actData.find((a: any) => a.state === "ACTIVE" || a.state === "LOCKED");
          if (current) {
            setActiveActivity(current);
            if (current.type?.startsWith("WHITEBOARD")) {
              loadWhiteboard(current.id, partData.id, partData.teamId);
            } else {
              loadActivityResponses(current.id, storedToken);
            }
          }
        }

        // Fetch leaderboard state
        const lbRes = await fetch(`/api/sessions/${id}/leaderboard`);
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboardData({ participants: lbData.participants, teams: lbData.teams });
          if (lbData.visibility) setLeaderboardVisibility(lbData.visibility);
        }

        // Fetch participant badges
        loadBadges(partData.id);

        // Socket connection
        const socket = getSocket();
        socket.emit("session:join", {
          sessionId: id,
          participantId: partData.id,
        });

        socket.on("badge:celebrate", ({ participantId, badge, reason }: any) => {
          if (participantId === partData.id) {
            setCelebratingBadge({ badge, reason });
            loadBadges(partData.id);
          }
        });

        socket.on("activity:state_updated", ({ activity }: { activity: any }) => {
          if (activity.state === "ACTIVE" || activity.state === "LOCKED") {
            setActiveActivity(activity);
            if (activity.type?.startsWith("WHITEBOARD")) {
              loadWhiteboard(activity.id, partData.id, partData.teamId);
            } else {
              loadActivityResponses(activity.id, storedToken);
            }
          } else {
            setActiveActivity(null);
            setMyResponse(null);
            setPeerResponses([]);
            setMyWhiteboard(null);
          }
        });

        socket.on("response:added", ({ response }: { response: any }) => {
          setPeerResponses((prev) => [response, ...prev.filter((r) => r.id !== response.id)]);
        });

        socket.on("team:roster_updated", ({ teams }: { teams: any[] }) => {
          for (const team of teams) {
            const member = team.members?.find((m: any) => m.id === partData.id);
            if (member) {
              setParticipant((prev: any) => (prev ? { ...prev, team, teamId: team.id } : prev));
              return;
            }
          }
        });

        socket.on("team:member_reassigned", ({ participantId, teamId }: { participantId: string; teamId: string | null }) => {
          if (participantId === partData.id) {
            fetch("/api/sessions/reconnect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: storedToken }),
            })
              .then((r) => r.json())
              .then((data) => {
                if (data?.id) setParticipant(data);
              })
              .catch(console.error);
          }
        });

        socket.on("timer:updated", ({ timerStatus, timerEndsAt, timerRemainingMs }: any) => {
          setActiveActivity((prev: any) =>
            prev ? { ...prev, timerStatus, timerEndsAt, timerRemainingMs } : prev
          );
        });

        socket.on("leaderboard:visibility_updated", ({ visibility }: any) => {
          setLeaderboardVisibility(visibility);
          loadLeaderboard();
        });

        socket.on("leaderboard:scores_updated", () => {
          loadLeaderboard();
          loadBadges(partData.id);
          fetch("/api/sessions/reconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: storedToken }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.id) setParticipant(data);
            });
        });

        // Pop-up when points awarded by facilitator or peer
        socket.on("point:awarded_notification", ({ recipientId, amount, reason, giverName }: any) => {
          if (recipientId === partData.id) {
            setAwardedNotification({
              type: "POINTS",
              amount,
              reason,
              giverName: giverName || "Facilitator",
            });
            loadLeaderboard();
            fetch("/api/sessions/reconnect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: storedToken }),
            })
              .then((r) => r.json())
              .then((data) => {
                if (data?.id) setParticipant(data);
              })
              .catch(console.error);
          }
        });

        // Pop-up when comment received
        socket.on("comment:received_notification", ({ recipientId, commenterName, content }: any) => {
          if (recipientId === partData.id) {
            setAwardedNotification({
              type: "COMMENT",
              commenterName: commenterName || "A peer",
              content,
            });
          }
        });

        // Facilitator projected whiteboard
        socket.on("whiteboard:projected", async ({ whiteboardId }: { whiteboardId: string }) => {
          if (whiteboardId) {
            try {
              const res = await fetch(`/api/whiteboards/${whiteboardId}`);
              if (res.ok) {
                const wb = await res.json();
                let responseId = undefined;
                let reactions: any[] = [];
                let comments: any[] = [];
                try {
                  const rRes = await fetch(`/api/activities/${wb.activityId}/responses`, {
                    headers: { Authorization: `Bearer ${storedToken}` },
                  });
                  if (rRes.ok) {
                    const allR = await rRes.json();
                    const matching = allR.find(
                      (r: any) => r.color === "WHITEBOARD" && r.content.includes(whiteboardId)
                    );
                    if (matching) {
                      responseId = matching.id;
                      reactions = matching.reactions || [];
                      comments = matching.comments || [];
                    }
                  }
                } catch {}

                setProjectedWork({
                  type: "WHITEBOARD",
                  id: wb.id,
                  title: wb.team?.name
                    ? `Team ${wb.team.name}'s Canvas`
                    : wb.participant?.displayName
                    ? `${wb.participant.displayName}'s Canvas`
                    : "Collaborative Whiteboard",
                  authorName: wb.participant?.displayName,
                  teamName: wb.team?.name,
                  participantId: wb.participantId,
                  sceneData: wb.sceneData,
                  responseId,
                  reactions,
                  comments,
                });
              }
            } catch (e) {
              console.error(e);
            }
          } else {
            setProjectedWork(null);
            setShowProjectedModal(false);
          }
        });

        // Facilitator projected response
        socket.on("response:projected", async ({ responseId }: { responseId: string }) => {
          if (responseId) {
            try {
              if (activeActivity) {
                const rRes = await fetch(`/api/activities/${activeActivity.id}/responses`, {
                  headers: { Authorization: `Bearer ${storedToken}` },
                });
                if (rRes.ok) {
                  const allR = await rRes.json();
                  const target = allR.find((r: any) => r.id === responseId);
                  if (target) {
                    setProjectedWork({
                      type: "RESPONSE",
                      id: target.id,
                      responseId: target.id,
                      title: "Participant Submission",
                      authorName: target.participant?.displayName,
                      teamName: target.team?.name,
                      participantId: target.participantId,
                      content: target.content,
                      reactions: target.reactions || [],
                      comments: target.comments || [],
                    });
                  }
                }
              }
            } catch (e) {
              console.error(e);
            }
          } else {
            setProjectedWork(null);
            setShowProjectedModal(false);
          }
        });

        // Reload responses when any whiteboard is submitted
        socket.on("whiteboard:submitted", () => {
          if (activeActivity) {
            loadActivityResponses(activeActivity.id, storedToken);
          }
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initParticipant();

    return () => {
      const socket = getSocket();
      socket.off("badge:celebrate");
      socket.off("activity:state_updated");
      socket.off("response:added");
      socket.off("team:roster_updated");
      socket.off("team:member_reassigned");
      socket.off("timer:updated");
      socket.off("leaderboard:visibility_updated");
      socket.off("leaderboard:scores_updated");
      socket.off("point:awarded_notification");
      socket.off("comment:received_notification");
      socket.off("whiteboard:projected");
      socket.off("response:projected");
      socket.off("whiteboard:submitted");
    };
  }, [id, activeActivity]);

  const loadBadges = async (partId: string) => {
    try {
      const res = await fetch(`/api/participants/${partId}/badges`);
      if (res.ok) {
        const data = await res.json();
        setBadges(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await fetch(`/api/sessions/${id}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData({ participants: data.participants, teams: data.teams });
        if (data.visibility) setLeaderboardVisibility(data.visibility);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadWhiteboard = async (activityId: string, partId: string, tId?: string) => {
    try {
      const res = await fetch(
        `/api/activities/${activityId}/whiteboards?participantId=${partId}&teamId=${tId || ""}`
      );
      if (res.ok) {
        const data = await res.json();
        setMyWhiteboard(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadActivityResponses = async (activityId: string, authToken: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/responses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPeerResponses(data);
        const mine = data.find((r: any) => r.participantId === participant?.id);
        if (mine) setMyResponse(mine);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseInput.trim() || !activeActivity) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activeActivity.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: responseInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit response");
      }

      const response = await res.json();
      setMyResponse(response);
      setResponseInput("");

      // Notify room via socket
      const socket = getSocket();
      socket.emit("response:new", { sessionId: id, response });

      if (response.newBadges && response.newBadges.length > 0) {
        for (const b of response.newBadges) {
          socket.emit("badge:award", {
            sessionId: id,
            participantId: b.participantId,
            badge: b.badge,
            reason: b.reason,
          });
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (responseId: string) => {
    try {
      const res = await fetch(`/api/responses/${responseId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        if (activeActivity) loadActivityResponses(activeActivity.id, token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAwardPoints = async (responseId: string, amount: number, reason?: string) => {
    try {
      const res = await fetch(`/api/responses/${responseId}/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, reason: reason?.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to award points");
        return;
      }
      const data = await res.json();
      setParticipant((prev: any) => ({ ...prev, peerPointBudget: data.remainingBudget }));
      setActiveReasonResponseId(null);
      setPointReasonInputs((prev) => ({ ...prev, [responseId]: "" }));
      if (activeActivity) loadActivityResponses(activeActivity.id, token);
      const socket = getSocket();
      socket.emit("leaderboard:points_awarded", { sessionId: id });

      if (data.newBadges && data.newBadges.length > 0) {
        for (const b of data.newBadges) {
          socket.emit("badge:award", {
            sessionId: id,
            participantId: b.participantId,
            badge: b.badge,
            reason: b.reason,
          });
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddComment = async (responseId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const res = await fetch(`/api/responses/${responseId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        if (activeActivity) loadActivityResponses(activeActivity.id, token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Entering training room...</div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Connection Error</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Return to Join Screen
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">{session?.title}</h1>
          <p className="text-xs text-slate-500">
            Welcome, <strong className="text-indigo-600">{participant.displayName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {leaderboardVisibility !== "HIDDEN" && (
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 transition shadow-sm"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Standings</span>
            </button>
          )}

          {participant.team && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>{participant.team.name}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-600" />
            <span>{participant.totalPoints} pts</span>
          </div>

          {badges.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:brightness-95 transition"
              title={badges.map((b) => b.badge?.name).join(", ")}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{badges.length} {badges.length === 1 ? "Badge" : "Badges"}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-indigo-600" />
            <span>{participant.peerPointBudget} budget</span>
          </div>

          <button
            onClick={() => setShowRewardsExplainer(!showRewardsExplainer)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition"
            title="Peer Rewards & Points Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-start space-y-6">
        {/* Peer Rewards Explainer Card */}
        {showRewardsExplainer && (
          <div className="bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-slate-700 shadow-sm relative animate-in fade-in duration-200">
            <button
              onClick={() => setShowRewardsExplainer(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 font-bold text-amber-900 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Peer Recognition & Point Rules</span>
            </div>
            <ul className="space-y-1 text-slate-600 pl-4 list-disc">
              <li><strong>20 pts Peer Budget:</strong> Each participant starts with 20 points to gift during the session.</li>
              <li><strong>Gift +1, +3, or +5:</strong> Award points directly to peer submissions and their team!</li>
              <li><strong>Free Appreciation:</strong> Likes and constructive feedback comments cost 0 points.</li>
              <li><strong>Fairness:</strong> You cannot award points to your own submissions.</li>
            </ul>
          </div>
        )}

        {/* Facilitator Projected Work Banner */}
        {projectedWork && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 rounded-2xl shadow-md border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Presentation className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>Facilitator is Projecting</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <h4 className="text-sm font-bold leading-tight">
                  {projectedWork.title || "Live Participant Work"}
                </h4>
                <p className="text-xs text-white/80">
                  By {projectedWork.teamName ? `Team ${projectedWork.teamName}` : projectedWork.authorName || "Participant"} • Click to view canvas, comment, & award points!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowProjectedModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-white text-indigo-700 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>View & Give Points</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeActivity ? (
          <div className="space-y-6">
            {/* Active Activity Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Live Challenge
                  </span>
                  {activeActivity.timerStatus && activeActivity.timerStatus !== "STOPPED" && (
                    <DigitalTimer
                      endsAt={activeActivity.timerEndsAt}
                      remainingMs={activeActivity.timerRemainingMs}
                      status={activeActivity.timerStatus}
                      size="sm"
                    />
                  )}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    activeActivity.state === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {activeActivity.state === "ACTIVE" ? "Open for Submissions" : "Submissions Locked"}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-1">{activeActivity.title}</h2>
              <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {activeActivity.prompt}
              </p>

              {/* Specialized Interaction Views */}
              {activeActivity.type === "POLL" || activeActivity.type === "QUIZ" ? (
                <div className="mt-4">
                  <PollQuizView
                    activity={activeActivity}
                    mode="participant"
                    sessionId={id}
                    participantId={participant?.id}
                    token={token}
                    myResponse={myResponse}
                    onVoteSubmitted={(_opt, isCorrect, pts) => {
                      if (isCorrect && pts) {
                        setParticipant((prev: any) => ({
                          ...prev,
                          totalPoints: (prev?.totalPoints || 0) + pts,
                        }));
                      }
                    }}
                  />
                </div>
              ) : activeActivity.type === "WORD_CLOUD" ? (
                <div className="mt-4">
                  <WordCloudView
                    activity={activeActivity}
                    mode="participant"
                    sessionId={id}
                    token={token}
                  />
                </div>
              ) : activeActivity.type === "QA" ? (
                <div className="mt-4">
                  <QAView
                    activity={activeActivity}
                    mode="participant"
                    sessionId={id}
                    participantId={participant?.id}
                    token={token}
                  />
                </div>
              ) : activeActivity.type === "RANKING" ? (
                <div className="mt-4">
                  <RankingView
                    activity={activeActivity}
                    mode="participant"
                    sessionId={id}
                    token={token}
                    myResponse={myResponse}
                  />
                </div>
              ) : activeActivity.type?.startsWith("WHITEBOARD") ? (
                <div className="mt-4">
                  {/* Scope Indicator Banner */}
                  {activeActivity.type === "WHITEBOARD_TEAM" && (
                    <div className="mb-3 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 flex items-center justify-between">
                      <span className="font-medium">🤝 Team Whiteboard: Collaborative canvas with your team.</span>
                      <span className="font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                        {participant.team ? participant.team.name : "Unassigned"}
                      </span>
                    </div>
                  )}
                  {activeActivity.type === "WHITEBOARD_INDIVIDUAL" && (
                    <div className="mb-3 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <span className="font-medium">🔒 Individual Whiteboard: Only visible to you and the facilitator.</span>
                      <span className="font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {participant.displayName}
                      </span>
                    </div>
                  )}
                  {activeActivity.type === "WHITEBOARD_PUBLIC" && (
                    <div className="mb-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <span className="font-medium">🌐 Public Whiteboard: Shared live with the entire room!</span>
                      <span className="font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
                        Public Canvas
                      </span>
                    </div>
                  )}

                  {myWhiteboard ? (
                    <CollaborativeWhiteboard
                      whiteboardId={myWhiteboard.id}
                      sessionId={id}
                      participantId={participant.id}
                      teamId={participant.teamId}
                      readOnly={activeActivity.state === "LOCKED"}
                      initialSceneData={myWhiteboard.sceneData}
                      onSubmitted={() => setMyWhiteboard((prev: any) => ({ ...prev, isSubmitted: true }))}
                    />
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Loading whiteboard canvas...
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Response Submission Form */}
                  {activeActivity.state === "ACTIVE" && !myResponse && (
                    <form onSubmit={handleSubmitResponse} className="mt-4 space-y-3">
                      <textarea
                        rows={3}
                        required
                        value={responseInput}
                        onChange={(e) => setResponseInput(e.target.value)}
                        placeholder="Type your response here..."
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? "Submitting..." : "Submit Response"}
                      </button>
                    </form>
                  )}

                  {/* Already Submitted Feedback */}
                  {myResponse && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Your Submission
                      </div>
                      <p className="text-xs text-slate-800">{myResponse.content}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Peer Contributions Feed (Works, Whiteboards, Messages, & Points) */}
            {((activeActivity.type === "OPEN_QUESTION" || !activeActivity.type || activeActivity.type === "OPEN_ENDED") &&
              (activeActivity.revealMode === "IMMEDIATE" || activeActivity.state === "LOCKED") ||
              (activeActivity.type?.startsWith("WHITEBOARD") && peerResponses.length > 0)) && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Participant Contributions ({peerResponses.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {participant.peerPointBudget} budget remaining
                  </span>
                </div>

                <div className="space-y-4">
                  {peerResponses.map((r) => {
                    const isMine = r.participantId === participant?.id;
                    const likeCount = r.reactions?.filter((rx: any) => rx.type === "LIKE").length || 0;
                    const hasLiked = r.reactions?.some(
                      (rx: any) => rx.type === "LIKE" && rx.participantId === participant?.id
                    );
                    const comments = r.comments || [];
                    const currentComment = commentInputs[r.id] || "";

                    let wbInfo: any = null;
                    if (r.color === "WHITEBOARD") {
                      try {
                        wbInfo = JSON.parse(r.content);
                      } catch {}
                    }

                    return (
                      <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {r.participant?.displayName || "Participant"}{" "}
                            {isMine && <span className="text-[10px] text-indigo-600 font-semibold">(You)</span>}
                            {r.team && (
                              <span className="text-[10px] font-medium bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                {r.team.name}
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {wbInfo ? (
                          <div className="mb-3 p-3 bg-white border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Palette className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">
                                  {wbInfo.title || r.participant?.displayName || "Whiteboard Drawing"}
                                </h4>
                                <p className="text-[10px] text-slate-400">Collaborative canvas submission</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                const wbId = wbInfo.whiteboardId;
                                if (wbId) {
                                  try {
                                    const res = await fetch(`/api/whiteboards/${wbId}`);
                                    if (res.ok) {
                                      const wb = await res.json();
                                      setProjectedWork({
                                        type: "WHITEBOARD",
                                        id: wb.id,
                                        title: wb.team?.name
                                          ? `Team ${wb.team.name}'s Canvas`
                                          : wb.participant?.displayName
                                          ? `${wb.participant.displayName}'s Canvas`
                                          : "Whiteboard Canvas",
                                        authorName: wb.participant?.displayName,
                                        teamName: wb.team?.name,
                                        participantId: wb.participantId,
                                        sceneData: wb.sceneData,
                                        responseId: r.id,
                                        reactions: r.reactions || [],
                                        comments: r.comments || [],
                                      });
                                      setShowProjectedModal(true);
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                              <Presentation className="w-3.5 h-3.5" />
                              <span>Inspect Canvas</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-800 mb-3">{r.content}</p>
                        )}

                        {/* Interaction Bar */}
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {/* Like Button */}
                            <button
                              onClick={() => handleLike(r.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                hasLiked
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>{likeCount}</span>
                            </button>

                            {/* Peer Points Gift Buttons */}
                            {!isMine && (
                              <div className="flex items-center gap-1">
                                {[1, 3, 5].map((pts) => (
                                  <button
                                    key={pts}
                                    disabled={participant.peerPointBudget < pts}
                                    onClick={() => {
                                      if (activeReasonResponseId === `${r.id}_${pts}`) {
                                        setActiveReasonResponseId(null);
                                      } else {
                                        setActiveReasonResponseId(`${r.id}_${pts}`);
                                      }
                                    }}
                                    title={`Award +${pts} points from your peer budget (${participant.peerPointBudget} pts remaining)`}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition border ${
                                      activeReasonResponseId === `${r.id}_${pts}`
                                        ? "bg-amber-500 text-white border-amber-600"
                                        : "bg-white hover:bg-amber-50 text-amber-800 border-slate-200 hover:border-amber-300"
                                    } disabled:opacity-30 disabled:pointer-events-none`}
                                  >
                                    +{pts}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-400 font-medium">
                            {comments.length} {comments.length === 1 ? "comment" : "comments"}
                          </span>
                        </div>

                        {/* Reason prompt when points clicked */}
                        {activeReasonResponseId?.startsWith(r.id) && (
                          <div className="mt-2.5 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in duration-150">
                            <input
                              type="text"
                              placeholder="Reasoning (e.g. 'Great insight!')..."
                              value={pointReasonInputs[r.id] || ""}
                              onChange={(e) =>
                                setPointReasonInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              className="flex-1 px-2.5 py-1 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setActiveReasonResponseId(null)}
                                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const pts = parseInt(activeReasonResponseId.split("_")[1], 10);
                                  handleAwardPoints(r.id, pts, pointReasonInputs[r.id]);
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition"
                              >
                                Gift +{activeReasonResponseId.split("_")[1]} Pts
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Threaded Comments Section */}
                        {comments.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5 pl-3 border-l-2 border-indigo-200">
                            {comments.map((c: any) => (
                              <div key={c.id} className="text-xs">
                                <span className="font-bold text-slate-700 mr-1.5">{c.participant?.displayName}:</span>
                                <span className="text-slate-600">{c.content}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Comment Input */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddComment(r.id, currentComment);
                            setCommentInputs((prev) => ({ ...prev, [r.id]: "" }));
                          }}
                          className="mt-3 flex gap-2"
                        >
                          <input
                            type="text"
                            value={currentComment}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            placeholder="Write a constructive peer comment..."
                            className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={!currentComment.trim()}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition disabled:opacity-40"
                          >
                            Reply
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-slate-800">You're in the Session!</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
              The facilitator is presenting. Watch the main screen. Interactive challenges will appear here automatically when launched.
            </p>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-around text-xs text-slate-500">
              <div>
                <span className="block text-slate-400">Team</span>
                <strong className="text-slate-700">{participant.team?.name || "Unassigned"}</strong>
              </div>
              <div>
                <span className="block text-slate-400">Role</span>
                <strong className="text-slate-700">{participant.role}</strong>
              </div>
              <div>
                <span className="block text-slate-400">Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard View: Placed at the VERY BOTTOM of the participant page */}
        {(showLeaderboard || leaderboardVisibility === "LIVE") && (
          <div id="session-leaderboard" className="pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Session Standings</h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {leaderboardVisibility === "LIVE" ? "Live Updates" : "Revealed by Host"}
              </span>
            </div>
            <LeaderboardView
              participants={leaderboardData.participants}
              teams={leaderboardData.teams}
            />
          </div>
        )}
      </main>

      {/* Pop-up Award Notification Modal (Points & Comments) */}
      {awardedNotification && (
        <AwardNotificationModal
          type={awardedNotification.type}
          amount={awardedNotification.amount}
          reason={awardedNotification.reason}
          giverName={awardedNotification.giverName}
          commenterName={awardedNotification.commenterName}
          content={awardedNotification.content}
          onClose={() => setAwardedNotification(null)}
        />
      )}

      {/* Facilitator Projected Work Modal (Canvas, Likes, Points, Comments) */}
      {showProjectedModal && projectedWork && (
        <ProjectedWorkModal
          work={projectedWork}
          sessionId={id}
          currentParticipant={participant}
          userToken={token}
          onClose={() => setShowProjectedModal(false)}
          onPointsAwarded={(newBudget) => {
            setParticipant((prev: any) => ({ ...prev, peerPointBudget: newBudget }));
          }}
        />
      )}

      {celebratingBadge && (
        <BadgeCelebrationModal
          badge={celebratingBadge.badge}
          reason={celebratingBadge.reason}
          onClose={() => setCelebratingBadge(null)}
        />
      )}
    </div>
  );
}
