"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSocket } from "@/lib/socket-client";
import { DigitalTimer } from "@/components/DigitalTimer";
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
  Shuffle,
  ArrowRightLeft,
  Trophy,
  Award,
  UserPlus,
  Download,
  ShieldCheck,
  ThumbsUp,
  MessageCircle,
} from "lucide-react";
import QRCode from "qrcode";
import { LeaderboardView } from "@/components/LeaderboardView";
import { PollQuizView } from "@/components/interactions/PollQuizView";
import { WordCloudView } from "@/components/interactions/WordCloudView";
import { QAView } from "@/components/interactions/QAView";
import { RankingView } from "@/components/interactions/RankingView";

export default function FacilitatorDashboard() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [facilitatorCommentForId, setFacilitatorCommentForId] = useState<string | null>(null);
  const [facilitatorCommentText, setFacilitatorCommentText] = useState("");
  const [facilitatorLikeForId, setFacilitatorLikeForId] = useState<string | null>(null);
  const [facilitatorLikeReason, setFacilitatorLikeReason] = useState("");

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
  const [whiteboards, setWhiteboards] = useState<any[]>([]);
  const [projectedWbId, setProjectedWbId] = useState<string | null>(null);
  const [projectedResponseId, setProjectedResponseId] = useState<string | null>(null);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [newActTitle, setNewActTitle] = useState("");
  const [newActPrompt, setNewActPrompt] = useState("");
  const [newActReveal, setNewActReveal] = useState("UPON_LOCK");
  const [newActType, setNewActType] = useState("OPEN_QUESTION");
  const [pollOptions, setPollOptions] = useState<string[]>(["Option A", "Option B", "Option C", "Option D"]);
  const [quizCorrectOption, setQuizCorrectOption] = useState<number>(0);
  const [quizPoints, setQuizPoints] = useState<number>(10);
  const [rankingItems, setRankingItems] = useState<string[]>(["Item 1", "Item 2", "Item 3", "Item 4"]);

  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [splitCount, setSplitCount] = useState(2);
  const [splitting, setSplitting] = useState(false);

  // Leaderboard & Points State
  const [leaderboardData, setLeaderboardData] = useState<{ participants: any[]; teams: any[] }>({
    participants: [],
    teams: [],
  });
  const [leaderboardVisibility, setLeaderboardVisibility] = useState("HIDDEN");
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardTargetParticipant, setAwardTargetParticipant] = useState<string>("");
  const [awardAmount, setAwardAmount] = useState<number>(10);
  const [awardCategory, setAwardCategory] = useState<string>("FACILITATOR");
  const [awardReason, setAwardReason] = useState<string>("");

  // Badges State
  const [availableBadges, setAvailableBadges] = useState<any[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeTargetParticipant, setBadgeTargetParticipant] = useState<string>("");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("");
  const [badgeReason, setBadgeReason] = useState<string>("");

  // Facilitator Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token =
      userToken || (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    const token = localStorage.getItem("tgms_user_token");
    const rawUser = localStorage.getItem("tgms_user");

    if (token && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed.role === "FACILITATOR" || parsed.role === "ADMIN" || parsed.role === "SUPER_ADMIN") {
          setCurrentUser(parsed);
          setUserToken(token);
        } else {
          setShowLoginModal(true);
        }
      } catch {
        setShowLoginModal(true);
      }
    } else {
      setShowLoginModal(true);
    }
  }, []);

  useEffect(() => {
    if (!session?.code || typeof window === "undefined") return;
    const joinUrl = `${window.location.origin}/?code=${session.code}`;
    QRCode.toDataURL(joinUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR generation failed:", err));
  }, [session?.code]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid credentials");

      if (
        data.user?.role !== "FACILITATOR" &&
        data.user?.role !== "ADMIN" &&
        data.user?.role !== "SUPER_ADMIN"
      ) {
        throw new Error(
          "Access restricted: Only facilitators and administrators can access the control dashboard."
        );
      }

      localStorage.setItem("tgms_user_token", data.userToken);
      localStorage.setItem("tgms_user", JSON.stringify(data.user));

      setCurrentUser(data.user);
      setUserToken(data.userToken);
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tgms_user_token");
    localStorage.removeItem("tgms_user");
    setCurrentUser(null);
    setUserToken(null);
    setShowLoginModal(true);
  };

  useEffect(() => {
    async function fetchSessionData() {
      try {
        const [resSession, resActivities, resTeams, resLb, resBadges] = await Promise.all([
          fetch(`/api/sessions/${id}`),
          fetch(`/api/sessions/${id}/activities`),
          fetch(`/api/sessions/${id}/teams`),
          fetch(`/api/sessions/${id}/leaderboard`),
          fetch(`/api/badges`),
        ]);

        if (resBadges.ok) {
          const bData = await resBadges.json();
          setAvailableBadges(bData);
          if (bData.length > 0) setSelectedBadgeId(bData[0].id);
        }

        if (!resSession.ok) throw new Error("Failed to load session");
        const sessionData = await resSession.json();
        setSession(sessionData);
        setParticipants(sessionData.participants || []);
        setMappings(sessionData.presentationMappings || []);
        if (sessionData.canvaPresentationUrl) setCanvaUrl(sessionData.canvaPresentationUrl);
        if (sessionData.canvaSlideCount) setSlideCount(sessionData.canvaSlideCount);
        if (sessionData.leaderboardVisibility) setLeaderboardVisibility(sessionData.leaderboardVisibility);

        if (resActivities.ok) {
          const actData = await resActivities.json();
          setActivities(actData);
          const current = actData.find((a: any) => a.state === "ACTIVE" || a.state === "LOCKED");
          if (current) {
            setActiveActivity(current);
            if (current.type?.startsWith("WHITEBOARD")) {
              loadWhiteboards(current.id);
            } else {
              loadResponses(current.id);
            }
          }
        }

        if (resTeams.ok) {
          const teamsData = await resTeams.json();
          setTeams(teamsData);
        }

        if (resLb.ok) {
          const lbData = await resLb.json();
          setLeaderboardData({ participants: lbData.participants, teams: lbData.teams });
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

    socket.on("team:roster_updated", ({ teams }: { teams: any[] }) => {
      setTeams(teams);
    });

    socket.on("team:member_reassigned", async () => {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/sessions/${id}/teams`),
        fetch(`/api/sessions/${id}`),
      ]);
      if (tRes.ok) setTeams(await tRes.json());
      if (pRes.ok) {
        const sData = await pRes.json();
        setParticipants(sData.participants || []);
      }
    });

    socket.on("response:added", ({ response }: { response: any }) => {
      setResponses((prev) => [response, ...prev.filter((r) => r.id !== response.id)]);
    });

    socket.on("whiteboard:submitted", () => {
      if (activeActivity?.id) {
        loadWhiteboards(activeActivity.id);
      }
    });

    socket.on("leaderboard:scores_updated", () => {
      loadLeaderboard();
      fetch(`/api/sessions/${id}`).then((r) => r.json()).then((s) => {
        if (s?.participants) setParticipants(s.participants);
      });
    });

    return () => {
      socket.off("session:roster_updated");
      socket.off("team:roster_updated");
      socket.off("team:member_reassigned");
      socket.off("response:added");
      socket.off("whiteboard:submitted");
      socket.off("leaderboard:scores_updated");
    };
  }, [id, activeActivity?.id]);

  const loadWhiteboards = async (actId: string) => {
    try {
      const res = await fetch(`/api/activities/${actId}/whiteboards?isFacilitator=true`);
      if (res.ok) {
        setWhiteboards(await res.json());
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

  const handleUpdateVisibility = async (newVisibility: "HIDDEN" | "LIVE" | "END_OF_ACTIVITY") => {
    try {
      const res = await fetch(`/api/sessions/${id}/leaderboard/visibility`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (res.ok) {
        setLeaderboardVisibility(newVisibility);
        const socket = getSocket();
        socket.emit("leaderboard:visibility_changed", { sessionId: id, visibility: newVisibility });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardTargetParticipant || awardAmount <= 0) return;
    const facilitatorGiverName = currentUser?.name || currentUser?.username
      ? `Facilitator (${currentUser.name || currentUser.username})`
      : "Facilitator";
    try {
      const res = await fetch(`/api/sessions/${id}/points`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          participantId: awardTargetParticipant,
          category: awardCategory,
          amount: awardAmount,
          reason: awardReason,
          giverName: facilitatorGiverName,
        }),
      });
      if (res.ok) {
        const pData = await res.json();
        const usedReason = awardReason || `Facilitator Award (${awardCategory})`;
        setShowAwardModal(false);
        setAwardReason("");
        loadLeaderboard();
        const socket = getSocket();
        socket.emit("leaderboard:points_awarded", { sessionId: id });
        socket.emit("point:award", {
          sessionId: id,
          notificationId: pData.id,
          recipientId: awardTargetParticipant,
          amount: awardAmount,
          reason: usedReason,
          giverName: facilitatorGiverName,
        });

        if (pData.newBadges && pData.newBadges.length > 0) {
          for (const b of pData.newBadges) {
            socket.emit("badge:award", {
              sessionId: id,
              participantId: b.participantId,
              badge: b.badge,
              reason: b.reason,
            });
          }
        }

        const sRes = await fetch(`/api/sessions/${id}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setParticipants(sData.participants || []);
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFacilitatorLike = (resp: any) => {
    const facilitatorGiverName = currentUser?.name || currentUser?.username
      ? `Facilitator (${currentUser.name || currentUser.username})`
      : "Facilitator";
    const reasonText = facilitatorLikeReason.trim() || "Great contribution recognized by the Facilitator!";
    const socket = getSocket();
    socket.emit("like:add", {
      sessionId: id,
      notificationId: `fac-like-${resp.id}-${Date.now()}`,
      responseId: resp.id,
      recipientId: resp.participantId,
      giverName: facilitatorGiverName,
      reason: reasonText,
    });
    setFacilitatorLikeForId(null);
    setFacilitatorLikeReason("");
  };

  const handleFacilitatorComment = (resp: any) => {
    const contentText = facilitatorCommentText.trim();
    if (!contentText) return;
    const facilitatorName = currentUser?.name || currentUser?.username
      ? `Facilitator (${currentUser.name || currentUser.username})`
      : "Facilitator";
    const socket = getSocket();
    socket.emit("comment:add", {
      sessionId: id,
      notificationId: `fac-comment-${resp.id}-${Date.now()}`,
      responseId: resp.id,
      recipientId: resp.participantId,
      commenterName: facilitatorName,
      content: contentText,
      reason: contentText,
    });
    setFacilitatorCommentForId(null);
    setFacilitatorCommentText("");
  };

  const handleAwardBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeTargetParticipant || !selectedBadgeId) return;
    try {
      const res = await fetch(`/api/participants/${badgeTargetParticipant}/badges`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          sessionId: id,
          badgeId: selectedBadgeId,
          facilitatorId: currentUser?.id || session?.facilitatorId || "FACILITATOR",
          reason: badgeReason || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowBadgeModal(false);
        setBadgeReason("");
        loadLeaderboard();
        const socket = getSocket();
        socket.emit("badge:award", {
          sessionId: id,
          participantId: badgeTargetParticipant,
          badge: data.badge,
          reason: data.reason,
        });
        socket.emit("leaderboard:points_awarded", { sessionId: id });
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setShowLoginModal(true);
        }
        alert(err.error || "Failed to award badge");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

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

  const handleSavePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvaUrl.trim()) return;
    try {
      const res = await fetch(`/api/sessions/${id}/presentation`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          canvaPresentationUrl: canvaUrl.trim(),
          canvaSlideCount: slideCount || 1,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSession((prev: any) => ({
          ...prev,
          canvaPresentationUrl: updated.canvaPresentationUrl,
          canvaSlideCount: updated.canvaSlideCount,
        }));
        setCanvaUrl(updated.canvaPresentationUrl || "");
        setSlideCount(updated.canvaSlideCount || 1);
        setShowLinkModal(false);

        const socket = getSocket();
        socket.emit("presentation:linked", {
          sessionId: id,
          canvaPresentationUrl: updated.canvaPresentationUrl,
          canvaSlideCount: updated.canvaSlideCount,
        });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to link presentation");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const changeSlide = async (newSlide: number) => {
    if (newSlide < 1 || newSlide > slideCount) return;
    setCurrentSlide(newSlide);

    const socket = getSocket();
    socket.emit("presentation:slide_change", { sessionId: id, slideNumber: newSlide });

    await fetch(`/api/sessions/${id}/slide`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ slideNumber: newSlide }),
    });
  };

  const createNewActivityRequest = async (autoLaunch: boolean = false) => {
    if (!newActTitle.trim() || !newActPrompt.trim()) {
      alert("Please enter both an Activity Title and a Prompt.");
      return;
    }

    let config: string | undefined = undefined;
    if (newActType === "POLL" || newActType === "QUIZ") {
      config = JSON.stringify({
        options: pollOptions.filter((o) => o.trim().length > 0),
        correctAnswer: newActType === "QUIZ" ? quizCorrectOption : undefined,
        points: newActType === "QUIZ" ? quizPoints : undefined,
      });
    } else if (newActType === "RANKING") {
      config = JSON.stringify({
        items: rankingItems.filter((i) => i.trim().length > 0),
      });
    }

    try {
      const res = await fetch(`/api/sessions/${id}/activities`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: newActTitle.trim(),
          prompt: newActPrompt.trim(),
          revealMode: newActReveal,
          type: newActType,
          config,
          presentationSlide: Math.max(1, currentSlide || 1),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setShowLoginModal(true);
        }
        throw new Error(errData.error || "Failed to create activity");
      }
      const created = await res.json();
      setActivities((prev) => [...prev, created]);
      setShowCreateActivity(false);
      setNewActTitle("");
      setNewActPrompt("");

      if (autoLaunch && created?.id) {
        await transitionActivity(created.id, "ACTIVE");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create activity");
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    await createNewActivityRequest(false);
  };

  const transitionActivity = async (activityId: string, state: "ACTIVE" | "LOCKED" | "COMPLETED") => {
    try {
      const res = await fetch(`/api/activities/${activityId}/state`, {
        method: "PATCH",
        headers: getAuthHeaders(),
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
        if (updated.type?.startsWith("WHITEBOARD")) {
          loadWhiteboards(updated.id);
        } else {
          loadResponses(updated.id);
        }
      } else if (state === "COMPLETED") {
        setActiveActivity(null);
        setResponses([]);
        setWhiteboards([]);
      }

      // Broadcast over socket to participants and projector view
      const socket = getSocket();
      socket.emit("activity:change_state", { sessionId: id, activity: updated });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleProjectWhiteboard = (whiteboardId: string) => {
    const targetId = projectedWbId === whiteboardId ? "" : whiteboardId;
    setProjectedWbId(targetId || null);
    const socket = getSocket();
    socket.emit("whiteboard:project", { sessionId: id, whiteboardId: targetId });
  };

  const handleToggleProjectResponse = (responseId: string) => {
    const targetId = projectedResponseId === responseId ? "" : responseId;
    setProjectedResponseId(targetId || null);
    const socket = getSocket();
    socket.emit("response:project", { sessionId: id, responseId: targetId });
  };

  const handleTimerAction = async (
    action: "start" | "pause" | "resume" | "extend" | "complete",
    durationSeconds?: number,
    extraSeconds?: number
  ) => {
    if (!activeActivity) return;
    try {
      const res = await fetch(`/api/activities/${activeActivity.id}/timer`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, durationSeconds, extraSeconds }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveActivity(updated);
        const socket = getSocket();
        socket.emit("timer:sync", {
          sessionId: id,
          activityId: activeActivity.id,
          timerStatus: updated.timerStatus,
          timerEndsAt: updated.timerEndsAt,
          timerRemainingMs: updated.timerRemainingMs,
        });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleModerate = async (responseId: string, currentHidden: boolean) => {
    try {
      const res = await fetch(`/api/responses/${responseId}/moderate`, {
        method: "PATCH",
        headers: getAuthHeaders(),
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

  const handleAutoSplit = async () => {
    if (splitting) return;
    setSplitting(true);
    try {
      const res = await fetch(`/api/sessions/${id}/teams`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ teamCount: splitCount }),
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        const socket = getSocket();
        socket.emit("team:split", { sessionId: id, teams: data });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSplitting(false);
    }
  };

  const handleReassign = async (participantId: string, targetTeamId: string | null) => {
    try {
      const res = await fetch(`/api/participants/${participantId}/team`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ teamId: targetTeamId }),
      });
      if (res.ok) {
        const socket = getSocket();
        socket.emit("team:member_moved", { sessionId: id, participantId, teamId: targetTeamId });
        const tRes = await fetch(`/api/sessions/${id}/teams`);
        if (tRes.ok) setTeams(await tRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConcludeSession = async () => {
    if (!confirm("Are you sure you want to conclude this session? This will complete all active activities.")) {
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${id}/conclude`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSession((prev: any) => ({ ...prev, status: "COMPLETED" }));
        setActiveActivity(null);
        const aRes = await fetch(`/api/sessions/${id}/activities`);
        if (aRes.ok) setActivities(await aRes.json());
        alert("Session successfully concluded. You can now download the complete JSON dataset or create a new session.");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadJson = async () => {
    try {
      const res = await fetch(`/api/sessions/${id}/export/json`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to export session JSON. Please ensure you are signed in as Facilitator.");
      }
      const data = await res.json();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `session-${session?.code || id}-dataset.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download JSON dataset.");
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
          {currentUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800">{currentUser.name || currentUser.username}</div>
                <div className="text-[10px] font-bold text-indigo-600 tracking-wider">{currentUser.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                title="Sign out of facilitator console"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
            >
              Sign In as Facilitator
            </button>
          )}

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

          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl border border-slate-200 shadow-sm transition"
            title="Download Complete Session JSON Dataset"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export JSON
          </button>

          {session.status !== "COMPLETED" ? (
            <button
              onClick={handleConcludeSession}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-sm rounded-xl border border-rose-200 shadow-sm transition"
              title="Conclude Session & Lock Activities"
            >
              <CheckCircle className="w-4 h-4 text-rose-600" />
              Conclude
            </button>
          ) : (
            <Link
              href="/sessions/create"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
              title="Create a New Training Session"
            >
              <Plus className="w-4 h-4" />
              Create New Session
            </Link>
          )}
        </div>
      </header>

      {/* Concluded Session Banner */}
      {session.status === "COMPLETED" && (
        <div className="mx-6 mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">This Session Has Concluded</h3>
              <p className="text-xs text-emerald-700">
                All activities are completed. You can export the session JSON dataset or start a new session right away.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-emerald-100/50 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-300 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>
            <Link
              href="/sessions/create"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create New Session
            </Link>
          </div>
        </div>
      )}

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
              <div className="w-56 h-56 bg-white flex items-center justify-center rounded-xl border border-slate-200 mb-3 p-2 shadow-inner">
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
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                  Code: {session.code}
                </span>
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`session-${session.code}-qr.png`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download QR
                  </a>
                )}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Activity Type:</label>
                    <select
                      value={newActType}
                      onChange={(e) => setNewActType(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                    >
                      <option value="OPEN_QUESTION">Open Discussion & Feedback</option>
                      <option value="POLL">Live Audience Poll (Multiple Choice)</option>
                      <option value="QUIZ">Competitive Trivia Quiz (Scored)</option>
                      <option value="WORD_CLOUD">Word Cloud (Audience Clustering)</option>
                      <option value="QA">Live Q&A Session (Upvoting & Spotlight)</option>
                      <option value="RANKING">Prioritization & Ranking (Borda Count)</option>
                      <option value="WHITEBOARD_TEAM">Collaborative Whiteboard (Team-Only)</option>
                      <option value="WHITEBOARD_INDIVIDUAL">Individual Whiteboard (Participant-Only)</option>
                      <option value="WHITEBOARD_PUBLIC">Public Whiteboard (All Participants)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Reveal Mode:</label>
                    <select
                      value={newActReveal}
                      onChange={(e) => setNewActReveal(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="UPON_LOCK">Hide responses until Locked (Anti-bias)</option>
                      <option value="IMMEDIATE">Stream responses live (Brainstorm)</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Configuration for POLL & QUIZ */}
                {(newActType === "POLL" || newActType === "QUIZ") && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        {newActType === "QUIZ" ? "Quiz Options & Correct Answer" : "Poll Options"}
                      </span>
                      {newActType === "QUIZ" && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <span>Award:</span>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={quizPoints}
                            onChange={(e) => setQuizPoints(Math.max(1, parseInt(e.target.value) || 10))}
                            className="w-16 px-2 py-0.5 border border-slate-200 rounded text-xs font-bold font-mono"
                          />
                          <span>pts</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {newActType === "QUIZ" && (
                            <input
                              type="radio"
                              name="quizCorrectOption"
                              checked={quizCorrectOption === idx}
                              onChange={() => setQuizCorrectOption(idx)}
                              title="Mark as correct answer"
                              className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                          )}
                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => {
                              const updated = [...pollOptions];
                              updated[idx] = e.target.value;
                              setPollOptions(updated);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = pollOptions.filter((_, i) => i !== idx);
                                setPollOptions(updated);
                                if (quizCorrectOption >= updated.length) {
                                  setQuizCorrectOption(0);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 px-1 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {pollOptions.length < 8 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold pt-1 flex items-center gap-1"
                      >
                        + Add Another Option
                      </button>
                    )}
                  </div>
                )}

                {/* Dynamic Configuration for RANKING */}
                {newActType === "RANKING" && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 block">
                      Items to Prioritize & Rank:
                    </span>
                    <div className="space-y-2">
                      {rankingItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 text-center text-xs font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            value={item}
                            onChange={(e) => {
                              const updated = [...rankingItems];
                              updated[idx] = e.target.value;
                              setRankingItems(updated);
                            }}
                            placeholder={`Item ${idx + 1}`}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                          />
                          {rankingItems.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setRankingItems(rankingItems.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 px-1 text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {rankingItems.length < 8 && (
                      <button
                        type="button"
                        onClick={() => setRankingItems([...rankingItems, `Item ${rankingItems.length + 1}`])}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold pt-1 flex items-center gap-1"
                      >
                        + Add Item to Rank
                      </button>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    Save Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => createNewActivityRequest(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Save & Launch Now
                  </button>
                </div>
              </form>
            )}

            {/* If an activity is active/locked, show prompt and live responses */}
            {activeActivity && (
              <div className="space-y-4 mb-6 pb-6 border-b border-slate-100">
                {/* Timer Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 text-white rounded-xl">
                  <div className="flex items-center gap-3">
                    <DigitalTimer
                      endsAt={activeActivity.timerEndsAt}
                      remainingMs={activeActivity.timerRemainingMs}
                      status={activeActivity.timerStatus || "STOPPED"}
                      onExpire={() => handleTimerAction("complete")}
                      size="sm"
                    />
                    <div className="flex items-center gap-1.5">
                      {activeActivity.timerStatus !== "RUNNING" ? (
                        <>
                          <button
                            onClick={() => handleTimerAction("start", 120)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition"
                          >
                            2m
                          </button>
                          <button
                            onClick={() => handleTimerAction("start", 300)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition"
                          >
                            5m
                          </button>
                          {activeActivity.timerStatus === "PAUSED" && (
                            <button
                              onClick={() => handleTimerAction("resume")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded-lg text-white transition"
                            >
                              Resume
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleTimerAction("pause")}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-xs font-semibold rounded-lg text-white transition"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => handleTimerAction("extend", undefined, 60)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg text-white transition"
                          >
                            +1m
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {activeActivity.timerStatus === "RUNNING" && (
                    <span className="text-[11px] text-emerald-400 font-mono animate-pulse">● Live Synchronized</span>
                  )}
                </div>

                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="block text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Current Prompt</span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{activeActivity.prompt}</p>
                </div>

                {/* Specialized Interaction Views */}
                {activeActivity.type === "POLL" || activeActivity.type === "QUIZ" ? (
                  <PollQuizView
                    activity={activeActivity}
                    mode="facilitator"
                    sessionId={id}
                  />
                ) : activeActivity.type === "WORD_CLOUD" ? (
                  <WordCloudView
                    activity={activeActivity}
                    mode="facilitator"
                    sessionId={id}
                  />
                ) : activeActivity.type === "QA" ? (
                  <QAView
                    activity={activeActivity}
                    mode="facilitator"
                    sessionId={id}
                    userToken={userToken || undefined}
                  />
                ) : activeActivity.type === "RANKING" ? (
                  <RankingView
                    activity={activeActivity}
                    mode="facilitator"
                    sessionId={id}
                  />
                ) : activeActivity.type?.startsWith("WHITEBOARD") ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Whiteboard Submissions ({whiteboards.filter((w) => w.isSubmitted).length}/{whiteboards.length})
                      </span>
                    </div>

                    {whiteboards.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Waiting for teams or participants to draw and submit their boards...
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {whiteboards.map((wb) => {
                          const isProjected = projectedWbId === wb.id;
                          return (
                            <div
                              key={wb.id}
                              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800">
                                    {wb.team?.name ||
                                      wb.participant?.displayName ||
                                      (activeActivity.type === "WHITEBOARD_PUBLIC"
                                        ? "Public Whiteboard (All)"
                                        : "Whiteboard")}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      wb.isSubmitted
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {wb.isSubmitted ? "Submitted" : "Drawing"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {wb.team?.members
                                    ? `${wb.team.members.length} members`
                                    : wb.participant
                                    ? "Individual"
                                    : "Public (All participants)"}
                                  {wb.submittedAt && ` • Submitted ${new Date(wb.submittedAt).toLocaleTimeString()}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleProjectWhiteboard(wb.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                                    isProjected
                                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  }`}
                                >
                                  <Presentation className="w-3.5 h-3.5" />
                                  {isProjected ? "Unproject" : "Project on Screen"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
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
                              <div className="flex items-center gap-1.5">
                                {resp.isHidden && (
                                  <span className="text-[10px] text-red-600 font-bold uppercase">Hidden</span>
                                )}
                                <button
                                  onClick={() => {
                                    setFacilitatorLikeForId(facilitatorLikeForId === resp.id ? null : resp.id);
                                    setFacilitatorCommentForId(null);
                                  }}
                                  title="Send Like notification to participant"
                                  className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-pink-600 hover:bg-pink-50 border border-pink-100 transition"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  Like
                                </button>
                                <button
                                  onClick={() => {
                                    setFacilitatorCommentForId(facilitatorCommentForId === resp.id ? null : resp.id);
                                    setFacilitatorLikeForId(null);
                                  }}
                                  title="Send Comment notification to participant"
                                  className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  Comment
                                </button>
                                {resp.participantId && (
                                  <button
                                    onClick={() => {
                                      setAwardTargetParticipant(resp.participantId);
                                      setAwardCategory("FACILITATOR");
                                      setShowAwardModal(true);
                                    }}
                                    title="Award points to participant"
                                    className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-amber-700 hover:bg-amber-50 border border-amber-200 transition"
                                  >
                                    <Award className="w-3 h-3" />
                                    +Pts
                                  </button>
                                )}
                                <button
                                  onClick={() => handleToggleProjectResponse(resp.id)}
                                  title={projectedResponseId === resp.id ? "Unproject response" : "Project response to room"}
                                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                    projectedResponseId === resp.id
                                      ? "bg-rose-600 text-white shadow-sm"
                                      : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                  }`}
                                >
                                  <Presentation className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleModerate(resp.id, resp.isHidden)}
                                  title={resp.isHidden ? "Unhide response" : "Hide response from participants"}
                                  className="text-slate-400 hover:text-slate-700 transition p-1.5"
                                >
                                  {resp.isHidden ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-800">{resp.content}</p>

                            {facilitatorLikeForId === resp.id && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={facilitatorLikeReason}
                                  onChange={(e) => setFacilitatorLikeReason(e.target.value)}
                                  placeholder="Reason for liking (optional)..."
                                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                />
                                <button
                                  onClick={() => handleFacilitatorLike(resp)}
                                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg transition"
                                >
                                  Send Like
                                </button>
                              </div>
                            )}

                            {facilitatorCommentForId === resp.id && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={facilitatorCommentText}
                                  onChange={(e) => setFacilitatorCommentText(e.target.value)}
                                  placeholder="Write feedback/reason for participant..."
                                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={() => handleFacilitatorComment(resp)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                                >
                                  Send Comment
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-3">
                Session Activities ({activities.length}):
              </p>
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
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        act.state === "ACTIVE"
                          ? "bg-indigo-50/70 border-indigo-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800">{act.title}</h4>
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/80 px-1.5 py-0.5 rounded">
                            {act.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">{act.prompt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            act.state === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
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
              <div className="flex items-center gap-2">
                <Link
                  href="/users"
                  target="_blank"
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Manage Users
                </Link>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                  {participants.length}
                </span>
              </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{p.totalPoints} pts</span>
                      <button
                        onClick={() => {
                          setBadgeTargetParticipant(p.id);
                          setShowBadgeModal(true);
                        }}
                        title="Award Badge"
                        className="p-1 hover:bg-amber-50 rounded text-slate-400 hover:text-amber-600 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teams & Breakouts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-indigo-600" />
                Teams & Breakouts
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">
                {teams.length} Teams
              </span>
            </div>

            {/* Split controls */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Teams:</span>
              <input
                type="number"
                min={2}
                max={10}
                value={splitCount}
                onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white"
              />
              <button
                onClick={handleAutoSplit}
                disabled={splitting || participants.length === 0}
                className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Shuffle className="w-3.5 h-3.5" />
                {splitting ? "Splitting..." : "Auto-Split"}
              </button>
            </div>

            {/* Teams List */}
            {teams.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No teams created yet. Use auto-split above to divide participants into groups.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {teams.map((team) => (
                  <div key={team.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="text-xs font-bold text-slate-800">{team.name}</span>
                        <span className="text-[10px] text-slate-400">({team.members?.length || 0})</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-indigo-600">
                        {team.totalPoints} pts
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {team.members?.map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs"
                        >
                          <span className="text-slate-700 truncate max-w-[120px]">{m.displayName}</span>
                          <select
                            value={team.id}
                            onChange={(e) => handleReassign(m.id, e.target.value === "none" ? null : e.target.value)}
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none"
                          >
                            <option value={team.id}>Move...</option>
                            {teams
                              .filter((t) => t.id !== team.id)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  to {t.name}
                                </option>
                              ))}
                            <option value="none">Remove</option>
                          </select>
                        </div>
                      ))}
                      {(!team.members || team.members.length === 0) && (
                        <p className="text-[11px] text-slate-400 italic">No members</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Championship Leaderboard Panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-800">Championship Standings</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAwardModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Award className="w-3.5 h-3.5" />
                  Award Points
                </button>
                <button
                  onClick={() => {
                    if (participants.length > 0 && !badgeTargetParticipant) {
                      setBadgeTargetParticipant(participants[0].id);
                    }
                    setShowBadgeModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Award Badge
                </button>
              </div>
            </div>

            {/* Visibility Settings Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600 font-medium">Audience Visibility:</span>
              <select
                value={leaderboardVisibility}
                onChange={(e) => handleUpdateVisibility(e.target.value as any)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-semibold focus:outline-none"
              >
                <option value="HIDDEN">Hidden from Participants</option>
                <option value="LIVE">Live Streamed to All</option>
                <option value="END_OF_ACTIVITY">Show upon Activity End</option>
              </select>
            </div>

            <LeaderboardView
              participants={leaderboardData.participants}
              teams={leaderboardData.teams}
              compact={true}
            />
          </div>
        </div>
      </div>

      {/* Manual Point Award Modal */}
      {showAwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Award Discretionary Points
              </h3>
              <button
                onClick={() => setShowAwardModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAwardPoints} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Recipient Participant:</label>
                <select
                  required
                  value={awardTargetParticipant}
                  onChange={(e) => setAwardTargetParticipant(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="">Select a participant...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} {p.team ? `(${p.team.name})` : ""} - {p.totalPoints} pts
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Category:</label>
                  <select
                    value={awardCategory}
                    onChange={(e) => setAwardCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                  >
                    <option value="FACILITATOR">Facilitator Award</option>
                    <option value="CHALLENGE">Challenge</option>
                    <option value="BONUS">Bonus Point</option>
                    <option value="PARTICIPATION">Participation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Point Amount:</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={awardAmount}
                    onChange={(e) => setAwardAmount(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Reason (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Brilliant architecture breakdown"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAwardModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!awardTargetParticipant}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Award Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Badge Award Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Award Facilitator Badge
              </h3>
              <button
                onClick={() => setShowBadgeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAwardBadge} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Recipient Participant:</label>
                <select
                  required
                  value={badgeTargetParticipant}
                  onChange={(e) => setBadgeTargetParticipant(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  <option value="">Select a participant...</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} {p.team ? `(${p.team.name})` : ""} - {p.totalPoints} pts
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Select Badge:</label>
                <select
                  required
                  value={selectedBadgeId}
                  onChange={(e) => setSelectedBadgeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                >
                  {availableBadges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.ruleType === "MANUAL" ? "Facilitator Award" : "Automatic"}) - {b.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Citation / Reason:</label>
                <input
                  type="text"
                  placeholder="e.g. Exceptional teamwork during Case Study"
                  value={badgeReason}
                  onChange={(e) => setBadgeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBadgeModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!badgeTargetParticipant || !selectedBadgeId}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Award Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Canva Presentation Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Presentation className="w-5 h-5 text-indigo-600" />
                Link Canva Presentation
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePresentation} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Canva Share / View / Embed URL:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Paste Canva view link or <iframe src='...'></iframe> embed code"
                  value={canvaUrl}
                  onChange={(e) => setCanvaUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports Canva Public View links (<code>https://www.canva.com/design/.../view</code>) or full HTML embed iframes.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Total Slide Count:
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={slideCount}
                  onChange={(e) => setSlideCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 font-bold"
                />
              </div>

              {/* Live Preview if URL contains canva */}
              {canvaUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Embed Preview
                  </span>
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-200">
                    <iframe
                      src={
                        canvaUrl.includes("view?embed")
                          ? canvaUrl
                          : canvaUrl.replace("/view", "/view?embed")
                      }
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canvaUrl.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                >
                  Save Presentation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facilitator Sign In Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-medium mb-3 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Facilitator Authentication Required
              </div>
              <h3 className="text-xl font-bold">Sign In to Continue</h3>
              <p className="text-xs text-indigo-200 mt-1">
                Facilitator controls (state changes, timers, activities, scoring, and teams) are protected and require a signed-in facilitator or administrator account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. facilitator_maya or admin_alex"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
                <span className="font-semibold text-slate-700 block">Available Demo Accounts:</span>
                <div>• Facilitator: <code className="text-indigo-600 font-mono">facilitator_maya</code> / <code className="text-indigo-600 font-mono">FacilitatorPass123</code></div>
                <div>• Administrator: <code className="text-indigo-600 font-mono">admin_alex</code> / <code className="text-indigo-600 font-mono">AdminPassword123</code></div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium transition"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-md flex items-center gap-2"
                >
                  {loginLoading ? "Authenticating..." : "Sign In & Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
