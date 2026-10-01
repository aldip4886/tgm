"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket-client";
import { CheckCircle2, XCircle, Award, BarChart3, HelpCircle } from "lucide-react";

interface PollQuizViewProps {
  activity: any;
  mode: "participant" | "facilitator" | "projector";
  sessionId: string;
  participantId?: string;
  token?: string;
  myResponse?: any;
  onVoteSubmitted?: (option: string, isCorrect?: boolean, points?: number) => void;
}

export function PollQuizView({
  activity,
  mode,
  sessionId,
  participantId,
  token,
  myResponse,
  onVoteSubmitted,
}: PollQuizViewProps) {
  const isQuiz = activity.type === "QUIZ";
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [pollData, setPollData] = useState<{
    options: string[];
    counts: Record<string, number>;
    totalVotes: number;
    correctAnswer?: number | string;
  }>({
    options: [],
    counts: {},
    totalVotes: 0,
  });

  // Parse config options
  let configOptions: string[] = [];
  let correctAnswer: number | string | undefined;
  let quizPoints = 10;
  if (activity.config) {
    try {
      const cfg = JSON.parse(activity.config);
      configOptions = cfg.options || [];
      correctAnswer = cfg.correctAnswer;
      if (cfg.points) quizPoints = Number(cfg.points);
    } catch {}
  }

  const loadResults = async () => {
    try {
      const res = await fetch(`/api/activities/${activity.id}/results`);
      if (res.ok) {
        const data = await res.json();
        if (data.poll) {
          setPollData(data.poll);
        }
      }
    } catch (e) {
      console.error("Failed to load poll results:", e);
    }
  };

  useEffect(() => {
    loadResults();

    const socket = getSocket();
    const handlePollUpdate = ({ activityId }: { activityId: string }) => {
      if (activityId === activity.id) {
        loadResults();
      }
    };

    socket.on("poll:voted", handlePollUpdate);
    return () => {
      socket.off("poll:voted", handlePollUpdate);
    };
  }, [activity.id]);

  useEffect(() => {
    if (myResponse?.content) {
      setSelectedOption(myResponse.content);
    }
  }, [myResponse]);

  const handleVote = async (option: string) => {
    if (mode !== "participant" || activity.state !== "ACTIVE" || submitting) return;
    if (isQuiz && myResponse) return; // quiz can only be answered once

    setSelectedOption(option);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: option }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit vote");
      }

      const response = await res.json();
      loadResults();

      const socket = getSocket();
      socket.emit("poll:vote", { sessionId, activityId: activity.id });
      socket.emit("response:new", { sessionId, response });

      if (onVoteSubmitted) {
        onVoteSubmitted(option, response.isCorrectAnswer, response.quizAwardedPoints);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const optionsList = pollData.options.length > 0 ? pollData.options : configOptions;
  const isLockedOrCompleted = activity.state === "LOCKED" || activity.state === "COMPLETED";
  const hasSubmitted = !!myResponse || !!selectedOption;

  // Option letter helper
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // Helper to determine if an option is the designated correct answer
  const isOptionCorrect = (opt: string, index: number) => {
    if (correctAnswer === undefined || correctAnswer === null) return false;
    return (
      String(correctAnswer) === String(index) ||
      String(correctAnswer) === opt ||
      (typeof correctAnswer === "number" && correctAnswer === index)
    );
  };

  return (
    <div
      className={`rounded-2xl p-6 ${
        mode === "projector"
          ? "bg-slate-900 border border-slate-800 text-white shadow-2xl"
          : "bg-white border border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {isQuiz ? (
            <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-full border border-amber-500/20 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Competitive Quiz ({quizPoints} pts)
            </span>
          ) : (
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-full border border-indigo-500/20 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Live Audience Poll
            </span>
          )}
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {pollData.totalVotes} {pollData.totalVotes === 1 ? "response" : "responses"}
        </div>
      </div>

      {/* Participant Result Reveal Banner */}
      {mode === "participant" && isQuiz && (isLockedOrCompleted || myResponse) && (
        <div className="mb-4">
          {myResponse?.isCorrectAnswer || isOptionCorrect(selectedOption, optionsList.indexOf(selectedOption)) ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-bold">Spot on! Correct Answer!</div>
                <div className="text-xs text-emerald-700">You earned +{quizPoints} points for your team!</div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <div className="text-sm font-bold">Incorrect Answer</div>
                <div className="text-xs text-rose-700">
                  {isLockedOrCompleted
                    ? `The correct answer was: ${
                        typeof correctAnswer === "number"
                          ? optionsList[correctAnswer] || correctAnswer
                          : correctAnswer
                      }`
                    : "Better luck on the next challenge!"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Options List */}
      <div className="space-y-3">
        {optionsList.map((opt, index) => {
          const voteCount = pollData.counts[opt] || 0;
          const percentage = pollData.totalVotes > 0 ? Math.round((voteCount / pollData.totalVotes) * 100) : 0;
          const isSelected = selectedOption === opt;
          const isCorrect = isOptionCorrect(opt, index);
          const showCorrectReveal = isQuiz && (mode !== "participant" || isLockedOrCompleted);

          return (
            <div
              key={opt + index}
              onClick={() => {
                if (mode === "participant" && activity.state === "ACTIVE" && (!isQuiz || !myResponse)) {
                  handleVote(opt);
                }
              }}
              className={`relative overflow-hidden rounded-xl border transition-all ${
                mode === "participant" && activity.state === "ACTIVE" && (!isQuiz || !myResponse)
                  ? "cursor-pointer hover:border-indigo-400 hover:shadow-md active:scale-[0.99]"
                  : ""
              } ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40"
                  : showCorrectReveal && isCorrect
                  ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30"
                  : mode === "projector"
                  ? "border-slate-800 bg-slate-800/40"
                  : "border-slate-200 bg-slate-50/50"
              } p-3.5`}
            >
              {/* Background Progress Bar (when results are visible or participant voted) */}
              {(mode !== "participant" || hasSubmitted || isLockedOrCompleted) && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out opacity-20 ${
                    showCorrectReveal && isCorrect
                      ? "bg-emerald-500"
                      : isSelected
                      ? "bg-indigo-600"
                      : "bg-slate-400 dark:bg-slate-600"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : showCorrectReveal && isCorrect
                        ? "bg-emerald-600 text-white"
                        : mode === "projector"
                        ? "bg-slate-700 text-slate-200"
                        : "bg-white border border-slate-200 text-slate-700 shadow-sm"
                    }`}
                  >
                    {letters[index] || index + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      mode === "projector" ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {opt}
                  </span>
                  {isSelected && mode === "participant" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Your Choice
                    </span>
                  )}
                  {showCorrectReveal && isCorrect && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Correct
                    </span>
                  )}
                </div>

                {/* Vote stats */}
                {(mode !== "participant" || hasSubmitted || isLockedOrCompleted) && (
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold font-mono ${
                        mode === "projector" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {percentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {voteCount} {voteCount === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {mode === "participant" && !hasSubmitted && activity.state === "ACTIVE" && (
        <p className="text-center text-xs text-slate-400 mt-4">
          Click an option above to cast your live vote!
        </p>
      )}
    </div>
  );
}
