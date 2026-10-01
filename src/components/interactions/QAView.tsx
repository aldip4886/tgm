"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import {
  MessageSquare,
  ThumbsUp,
  Send,
  EyeOff,
  User,
  CheckCircle,
  Pin,
  Sparkles,
} from "lucide-react";

interface QAViewProps {
  activity: any;
  mode: "participant" | "facilitator" | "projector";
  sessionId: string;
  participantId?: string;
  token?: string;
  userToken?: string; // for facilitator/admin
}

export function QAView({
  activity,
  mode,
  sessionId,
  participantId,
  token,
  userToken,
}: QAViewProps) {
  const [questionInput, setQuestionInput] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  const loadQuestions = async () => {
    try {
      const res = await fetch(
        `/api/activities/${activity.id}/results${
          participantId ? `?participantId=${participantId}` : ""
        }`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.qa) {
          setQuestions(data.qa);
        }
      }
    } catch (e) {
      console.error("Failed to load Q&A questions:", e);
    }
  };

  useEffect(() => {
    loadQuestions();

    const socket = getSocket();
    const handleUpdate = ({ activityId }: { activityId: string }) => {
      if (activityId === activity.id) {
        loadQuestions();
      }
    };

    socket.on("qa:question_added", handleUpdate);
    socket.on("qa:question_upvoted", handleUpdate);
    socket.on("qa:question_status", handleUpdate);

    return () => {
      socket.off("qa:question_added", handleUpdate);
      socket.off("qa:question_upvoted", handleUpdate);
      socket.off("qa:question_status", handleUpdate);
    };
  }, [activity.id, participantId]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || submitting || activity.state !== "ACTIVE") return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: questionInput.trim(),
          color: isAnonymous ? "ANONYMOUS" : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit question");
      }

      setQuestionInput("");
      setIsAnonymous(false);
      loadQuestions();

      const socket = getSocket();
      socket.emit("qa:new_question", { sessionId, activityId: activity.id });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (questionId: string) => {
    try {
      const res = await fetch(`/api/responses/${questionId}/upvote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ participantId }),
      });

      if (res.ok) {
        loadQuestions();
        const socket = getSocket();
        socket.emit("qa:upvote", { sessionId, activityId: activity.id, questionId });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetStatus = async (
    questionId: string,
    status: "ANSWERED" | "SPOTLIGHT" | "ACTIVE"
  ) => {
    try {
      const res = await fetch(`/api/responses/${questionId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        loadQuestions();
        const socket = getSocket();
        socket.emit("qa:status_change", {
          sessionId,
          activityId: activity.id,
          questionId,
          status,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const spotlightQuestion = questions.find((q) => q.status === "SPOTLIGHT");

  return (
    <div
      className={`rounded-2xl p-6 ${
        mode === "projector"
          ? "bg-slate-900 border border-slate-800 text-white shadow-2xl"
          : "bg-white border border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs rounded-full border border-sky-500/20 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Live Q&A Session
          </span>
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {questions.length} {questions.length === 1 ? "question" : "questions"} asked
        </div>
      </div>

      {/* Spotlight Question Hero Card (for Projector & Facilitator) */}
      {spotlightQuestion && (
        <div className="mb-6 p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl shadow-xl border border-indigo-500/30 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider border border-amber-400/30">
              <Pin className="w-3 h-3" /> Now Answering
            </span>
            <span className="text-xs text-indigo-200 font-medium">
              Asked by {spotlightQuestion.authorName} • {spotlightQuestion.upvotes} upvotes
            </span>
          </div>
          <h4 className="text-lg font-bold text-white leading-snug">{spotlightQuestion.question}</h4>
        </div>
      )}

      {/* Participant Ask Question Input */}
      {mode === "participant" && activity.state === "ACTIVE" && (
        <form onSubmit={handleSubmitQuestion} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <textarea
            rows={2}
            required
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Type your question for the presenter..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="flex items-center gap-1">
                <EyeOff className="w-3.5 h-3.5 text-slate-400" /> Ask anonymously
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !questionInput.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Submitting..." : "Ask Question"}
            </button>
          </div>
        </form>
      )}

      {/* Questions Feed */}
      {questions.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {questions.map((q) => {
            const isAnswered = q.status === "ANSWERED";
            const isSpotlight = q.status === "SPOTLIGHT";

            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSpotlight
                    ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                    : isAnswered
                    ? "border-slate-200 bg-slate-50 opacity-60 dark:bg-slate-900 dark:border-slate-800"
                    : mode === "projector"
                    ? "border-slate-800 bg-slate-800/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {q.isAnonymous ? (
                          <>
                            <EyeOff className="w-3 h-3 text-slate-400" /> Anonymous
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-slate-400" /> {q.authorName}
                          </>
                        )}
                      </span>
                      {isAnswered && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Answered
                        </span>
                      )}
                      {isSpotlight && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="w-3 h-3" /> Spotlight
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        mode === "projector" ? "text-slate-100" : "text-slate-800"
                      }`}
                    >
                      {q.question}
                    </p>
                  </div>

                  {/* Upvote & Facilitator Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleUpvote(q.id)}
                      disabled={mode !== "participant"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                        q.hasUpvoted
                          ? "bg-indigo-600 text-white"
                          : mode === "participant"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-slate-800 text-slate-200"
                      }`}
                      title={mode === "participant" ? "Upvote this question" : "Upvotes count"}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{q.upvotes}</span>
                    </button>

                    {mode === "facilitator" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetStatus(q.id, isSpotlight ? "ACTIVE" : "SPOTLIGHT")}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            isSpotlight
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          title={isSpotlight ? "Remove spotlight" : "Spotlight question"}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSetStatus(q.id, isAnswered ? "ACTIVE" : "ANSWERED")}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            isAnswered
                              ? "bg-emerald-600 text-white border-emerald-700"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          title={isAnswered ? "Mark unanswered" : "Mark as answered"}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
