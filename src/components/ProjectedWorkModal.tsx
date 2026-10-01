"use client";

import { useState } from "react";
import { CollaborativeWhiteboard } from "@/components/CollaborativeWhiteboard";
import {
  X,
  ThumbsUp,
  Award,
  MessageSquare,
  Sparkles,
  Send,
  Users,
  User,
  ExternalLink,
} from "lucide-react";

export interface ProjectedWorkModalProps {
  work: {
    type: "WHITEBOARD" | "RESPONSE";
    id: string; // whiteboardId or responseId
    title?: string;
    authorName?: string;
    teamName?: string;
    participantId?: string;
    sceneData?: string;
    content?: string;
    responseId?: string; // linked response ID for comments/reactions
    reactions?: any[];
    comments?: any[];
  };
  sessionId: string;
  currentParticipant: any;
  userToken: string;
  onClose: () => void;
  onPointsAwarded?: (newBudget: number) => void;
}

export function ProjectedWorkModal({
  work,
  sessionId,
  currentParticipant,
  userToken,
  onClose,
  onPointsAwarded,
}: ProjectedWorkModalProps) {
  const isMine = work.participantId === currentParticipant?.id;
  const targetResponseId = work.responseId || (work.type === "RESPONSE" ? work.id : null);

  const [reactions, setReactions] = useState<any[]>(work.reactions || []);
  const [comments, setComments] = useState<any[]>(work.comments || []);
  const [commentInput, setCommentInput] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [selectedPointAmount, setSelectedPointAmount] = useState<number | null>(null);
  const [submittingPoints, setSubmittingPoints] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const hasLiked = reactions.some(
    (rx) => rx.type === "LIKE" && rx.participantId === currentParticipant?.id
  );
  const likeCount = reactions.filter((rx) => rx.type === "LIKE").length;

  const handleToggleLike = async () => {
    if (!targetResponseId) return;
    try {
      const res = await fetch(`/api/responses/${targetResponseId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ type: "LIKE" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reacted) {
          setReactions((prev) => [...prev, { type: "LIKE", participantId: currentParticipant.id }]);
        } else {
          setReactions((prev) =>
            prev.filter(
              (rx) => !(rx.type === "LIKE" && rx.participantId === currentParticipant.id)
            )
          );
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResponseId || !commentInput.trim()) return;

    setSubmittingComment(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/responses/${targetResponseId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ content: commentInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to post comment");
      }

      const newC = await res.json();
      setComments((prev) => [...prev, newC]);
      setCommentInput("");
      setSuccessMsg("Comment posted!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleGiftPoints = async (amount: number) => {
    if (!targetResponseId) {
      setErrorMsg("Cannot award points: work is not yet indexed as a submission.");
      return;
    }
    if (isMine) {
      setErrorMsg("You cannot award peer points to your own work.");
      return;
    }
    if (currentParticipant.peerPointBudget < amount) {
      setErrorMsg(`Insufficient peer budget (${currentParticipant.peerPointBudget} pts remaining).`);
      return;
    }

    setSubmittingPoints(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/responses/${targetResponseId}/points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          amount,
          reason: pointReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to award points");
      }

      const data = await res.json();
      setSuccessMsg(`Awarded +${amount} points successfully!`);
      setSelectedPointAmount(null);
      setPointReason("");
      if (onPointsAwarded && typeof data.remainingBudget === "number") {
        onPointsAwarded(data.remainingBudget);
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingPoints(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Projected Work
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {work.title || (work.type === "WHITEBOARD" ? "Collaborative Whiteboard" : "Participant Response")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created by{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {work.teamName ? `Team ${work.teamName}` : work.authorName || "Participant"}
                </span>{" "}
                {isMine && <span className="text-indigo-600 font-bold">(You)</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl">
            {successMsg}
          </div>
        )}

        {/* Body Canvas / Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {work.type === "WHITEBOARD" ? (
            <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner h-[380px] sm:h-[440px]">
              <CollaborativeWhiteboard
                whiteboardId={work.id}
                sessionId={sessionId}
                readOnly={true}
                initialSceneData={work.sceneData}
              />
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm whitespace-pre-wrap">
              {work.content}
            </div>
          )}

          {/* Social Feedback Bar (Likes & Points) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
            {/* Like Action */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleLike}
                disabled={!targetResponseId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  hasLiked
                    ? "bg-indigo-600 text-white shadow-indigo-500/20"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
              </button>

              <span className="text-xs text-slate-400">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            {/* Peer Points Awarding */}
            {!isMine && targetResponseId && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Award Points:
                </span>
                {[1, 3, 5].map((pts) => (
                  <button
                    key={pts}
                    disabled={currentParticipant.peerPointBudget < pts || submittingPoints}
                    onClick={() => {
                      setSelectedPointAmount(pts);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                      selectedPointAmount === pts
                        ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/20"
                        : "bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-slate-200 dark:border-slate-700 hover:border-amber-300"
                    } disabled:opacity-30 disabled:pointer-events-none`}
                    title={`Award +${pts} points from your peer budget (${currentParticipant.peerPointBudget} remaining)`}
                  >
                    +{pts}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Optional Reason Input when Points Selected */}
          {selectedPointAmount !== null && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                <span>Awarding +{selectedPointAmount} Points to {work.authorName || work.teamName || "Author"}</span>
                <span className="text-amber-600 font-semibold">{currentParticipant.peerPointBudget} budget remaining</span>
              </div>
              <input
                type="text"
                placeholder="Add a reason or encouraging message (optional)..."
                value={pointReason}
                onChange={(e) => setPointReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPointAmount(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingPoints}
                  onClick={() => handleGiftPoints(selectedPointAmount)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {submittingPoints ? "Gifting..." : `Confirm Gift +${selectedPointAmount} Pts`}
                </button>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Comments & Peer Feedback ({comments.length})
            </h4>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {comments.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {c.participant?.displayName || "Participant"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Post Comment Input */}
            {targetResponseId && (
              <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  required
                  placeholder="Write a constructive peer comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || submittingComment}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
