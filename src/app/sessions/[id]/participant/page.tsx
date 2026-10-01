"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { DigitalTimer } from "@/components/DigitalTimer";
import { CollaborativeWhiteboard } from "@/components/CollaborativeWhiteboard";
import { LeaderboardView } from "@/components/LeaderboardView";
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
            if (current.type === "WHITEBOARD") {
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

        // Socket connection
        const socket = getSocket();
        socket.emit("session:join", {
          sessionId: id,
          participantId: partData.id,
        });

        socket.on("activity:state_updated", ({ activity }: { activity: any }) => {
          if (activity.state === "ACTIVE" || activity.state === "LOCKED") {
            setActiveActivity(activity);
            if (activity.type === "WHITEBOARD") {
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initParticipant();

    return () => {
      const socket = getSocket();
      socket.off("activity:state_updated");
      socket.off("response:added");
      socket.off("team:roster_updated");
      socket.off("team:member_reassigned");
      socket.off("timer:updated");
      socket.off("leaderboard:visibility_updated");
      socket.off("leaderboard:scores_updated");
    };
  }, [id]);

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

  const handleAwardPoints = async (responseId: string, amount: number) => {
    try {
      const res = await fetch(`/api/responses/${responseId}/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to award points");
        return;
      }
      const data = await res.json();
      setParticipant((prev: any) => ({ ...prev, peerPointBudget: data.remainingBudget }));
      if (activeActivity) loadActivityResponses(activeActivity.id, token);
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

          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-indigo-600" />
            <span>{participant.peerPointBudget} budget</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col justify-start space-y-6">
        {(showLeaderboard || leaderboardVisibility === "LIVE") && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <LeaderboardView
              participants={leaderboardData.participants}
              teams={leaderboardData.teams}
            />
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

              {/* Whiteboard Workspace OR Text Response Submission */}
              {activeActivity.type === "WHITEBOARD" ? (
                <div className="mt-4">
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

            {/* Peer Responses Feed */}
            {(activeActivity.revealMode === "IMMEDIATE" || activeActivity.state === "LOCKED") && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Participant Contributions ({peerResponses.length})
                </h3>

                <div className="space-y-4">
                  {peerResponses.map((r) => {
                    const isMine = r.participantId === participant?.id;
                    const likeCount = r.reactions?.filter((rx: any) => rx.type === "LIKE").length || 0;
                    const hasLiked = r.reactions?.some(
                      (rx: any) => rx.type === "LIKE" && rx.participantId === participant?.id
                    );
                    const comments = r.comments || [];
                    const currentComment = commentInputs[r.id] || "";

                    return (
                      <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            {r.participant?.displayName || "Participant"} {isMine && <span className="text-[10px] text-indigo-600 font-semibold">(You)</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 mb-3">{r.content}</p>

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
                                    onClick={() => handleAwardPoints(r.id, pts)}
                                    title={`Award +${pts} points from your peer budget`}
                                    className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-slate-200 hover:border-amber-300 rounded-lg text-[11px] font-bold transition disabled:opacity-30 disabled:pointer-events-none"
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
                            placeholder="Write a peer comment..."
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
      </main>
    </div>
  );
}
