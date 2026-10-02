"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParticipantDetailModal } from "@/components/ParticipantDetailModal";
import { UserAvatarButton } from "@/components/UserAvatarButton";
import {
  Presentation,
  Users,
  UserPlus,
  Layers,
  Play,
  CheckCircle,
  Trash2,
  Edit3,
  Eye,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Plus,
  KeyRound,
  Search,
  Filter,
  X,
  QrCode,
  Lock,
  Clock,
  Trophy,
  Share2,
  MessageSquare,
  Award,
  Palette,
} from "lucide-react";
import QRCode from "qrcode";

const SESSIONS_PER_PAGE = 6;

export default function SessionsManagementPage() {
  const router = useRouter();

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [facilitatorFilter, setFacilitatorFilter] = useState("ALL");

  // Notifications
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Authenticated User
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Selected Session for Detail / CRUD View
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [inspectingParticipantId, setInspectingParticipantId] = useState<string | null>(null);

  // Add Participant Form state
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantUsername, setNewParticipantUsername] = useState("");

  // Edit Session Form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"WAITING" | "ACTIVE" | "COMPLETED">("ACTIVE");
  const [editCanvaUrl, setEditCanvaUrl] = useState("");
  const [editSlideCount, setEditSlideCount] = useState<string>("10");
  const [editLeaderboardVisibility, setEditLeaderboardVisibility] = useState<"HIDDEN" | "LIVE" | "END_OF_ACTIVITY">("LIVE");
  const [editFacilitatorId, setEditFacilitatorId] = useState("");

  // Create Session Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newFacilitatorName, setNewFacilitatorName] = useState("");
  const [newFacilitatorEmail, setNewFacilitatorEmail] = useState("");
  const [newFacilitatorId, setNewFacilitatorId] = useState("");
  const [allFacilitatorUsers, setAllFacilitatorUsers] = useState<any[]>([]);

  // Add Activity Form state
  const [newActTitle, setNewActTitle] = useState("");
  const [newActPrompt, setNewActPrompt] = useState("");
  const [newActType, setNewActType] = useState("OPEN_QUESTION");

  const [submitting, setSubmitting] = useState(false);

  const isAuthorizedRole = (role?: string) =>
    role === "FACILITATOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  const isAdminRole = (role?: string) =>
    role === "ADMIN" || role === "SUPER_ADMIN";

  const loadFacilitatorAccounts = async (token: string) => {
    try {
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const users = await res.json();
        setAllFacilitatorUsers(
          users.filter(
            (u: any) =>
              u.role === "FACILITATOR" || u.role === "ADMIN" || u.role === "SUPER_ADMIN"
          )
        );
      }
    } catch {}
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("tgms_user_token");
      const rawUser = localStorage.getItem("tgms_user");
      let parsedUser: any = null;
      if (rawUser) {
        try {
          parsedUser = JSON.parse(rawUser);
          setCurrentUser(parsedUser);
        } catch (e) {}
      }

      if (token && parsedUser && isAuthorizedRole(parsedUser.role)) {
        setUserToken(token);
        loadSessions(token);
        if (isAdminRole(parsedUser.role)) {
          loadFacilitatorAccounts(token);
        }
      } else {
        setLoading(false);
        setShowLoginModal(true);
      }
    }
  }, []);

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

      if (!isAuthorizedRole(data.user?.role)) {
        throw new Error("Access denied: Facilitator or Administrator role required.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("tgms_user_token", data.token);
        localStorage.setItem("tgms_user", JSON.stringify(data.user));
      }

      setUserToken(data.token);
      setCurrentUser(data.user);
      setShowLoginModal(false);
      loadSessions(data.token);
      if (isAdminRole(data.user?.role)) {
        loadFacilitatorAccounts(data.token);
      }
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tgms_user_token");
      localStorage.removeItem("tgms_user");
    }
    setUserToken(null);
    setCurrentUser(null);
    setShowLoginModal(true);
  };

  const loadSessions = async (token?: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const activeToken =
        token ||
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch("/api/sessions", {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sessions");

      setSessions(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSessionDetail = async (session: any) => {
    setSelectedSession(session);
    setShowDetailModal(true);
    setLoadingDetails(true);
    setQrDataUrl("");

    // Generate QR code
    if (session.code) {
      QRCode.toDataURL(
        JSON.stringify({ code: session.code, type: "tgms_session_join" }),
        { width: 250, margin: 2 }
      ).then((url) => setQrDataUrl(url)).catch(() => {});
    }

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch(`/api/sessions/${session.id}`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch session details");
      setSessionDetails(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditSession = (session: any) => {
    setSelectedSession(session);
    setEditTitle(session.title || "");
    setEditDescription(session.description || "");
    setEditStatus(session.status || "ACTIVE");
    setEditCanvaUrl(session.canvaPresentationUrl || "");
    setEditSlideCount(session.canvaSlideCount ? String(session.canvaSlideCount) : "10");
    setEditLeaderboardVisibility(session.leaderboardVisibility || "LIVE");
    setEditFacilitatorId(session.facilitatorId || session.facilitator?.id || "");
    setShowEditSessionModal(true);
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus,
        canvaPresentationUrl: editCanvaUrl.trim() || null,
        canvaSlideCount: editSlideCount ? parseInt(editSlideCount, 10) : null,
        leaderboardVisibility: editLeaderboardVisibility,
      };

      if (isAdminRole(currentUser?.role) && editFacilitatorId) {
        payload.facilitatorId = editFacilitatorId;
      }

      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update session");

      setSuccessMsg(`Session '${data.title}' successfully updated!`);
      setShowEditSessionModal(false);
      loadSessions();
      if (showDetailModal && selectedSession.id === data.id) {
        openSessionDetail(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "DELETE",
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete session");

      setSuccessMsg(`Session '${selectedSession.title}' deleted successfully!`);
      setShowDeleteSessionModal(false);
      setShowDetailModal(false);
      setSelectedSession(null);
      setSessionDetails(null);
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          facilitatorName: newFacilitatorName.trim() || currentUser?.name || "Facilitator",
          facilitatorEmail: newFacilitatorEmail.trim() || currentUser?.email || "facilitator@training.local",
          ...(isAdminRole(currentUser?.role) && newFacilitatorId
            ? { facilitatorId: newFacilitatorId }
            : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");

      setSuccessMsg(`Session '${data.title}' created with code ${data.code}!`);
      setShowCreateSessionModal(false);
      setNewTitle("");
      setNewDescription("");
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDataset = (sessionId: string, sessionCode: string) => {
    const activeToken =
      userToken ||
      (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : "");

    // Download via link or window
    const url = `/api/sessions/${sessionId}/export/json${activeToken ? `?token=${activeToken}` : ""}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `session-${sessionCode || sessionId}-dataset.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg(`Dataset export initiated for session ${sessionCode || sessionId}!`);
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCreateActivityInSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/sessions/${selectedSession.id}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          title: newActTitle.trim(),
          prompt: newActPrompt.trim(),
          type: newActType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create activity");
      setSuccessMsg(`Activity '${data.title}' added to session!`);
      setShowAddActivityModal(false);
      setNewActTitle("");
      setNewActPrompt("");
      openSessionDetail(selectedSession);
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivityFromSession = async (actId: string, actTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete activity "${actTitle}"?`)) return;
    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/activities/${actId}`, {
        method: "DELETE",
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete activity");
      }
      setSuccessMsg(`Activity '${actTitle}' deleted!`);
      openSessionDetail(selectedSession);
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddParticipantToSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || (!newParticipantName.trim() && !newParticipantUsername.trim())) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/sessions/${selectedSession.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          displayName: newParticipantName.trim() || undefined,
          username: newParticipantUsername.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add participant");
      setSuccessMsg(`Participant '${data.participant?.displayName || newParticipantName}' added to session!`);
      setShowAddParticipantModal(false);
      setNewParticipantName("");
      setNewParticipantUsername("");
      openSessionDetail(selectedSession);
      loadSessions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const facilitatorsList = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => {
      if (s.facilitator?.id) {
        map.set(s.facilitator.id, s.facilitator.name || s.facilitator.username || s.facilitator.email);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.facilitator?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.facilitator?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || s.status === statusFilter;

      const matchesFacilitator =
        facilitatorFilter === "ALL" || s.facilitatorId === facilitatorFilter;

      return matchesSearch && matchesStatus && matchesFacilitator;
    });
  }, [sessions, searchQuery, statusFilter, facilitatorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSessions = useMemo(() => {
    return filteredSessions.slice(
      (safePage - 1) * SESSIONS_PER_PAGE,
      safePage * SESSIONS_PER_PAGE
    );
  }, [filteredSessions, safePage]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((s) => s.status === "ACTIVE").length;
    const waiting = sessions.filter((s) => s.status === "WAITING").length;
    const completed = sessions.filter((s) => s.status === "COMPLETED").length;
    const totalParticipants = sessions.reduce(
      (acc, s) => acc + (s.participantCount || s._count?.participants || 0),
      0
    );
    const totalActivities = sessions.reduce(
      (acc, s) => acc + (s.activityCount || s._count?.activities || 0),
      0
    );
    return { total, active, waiting, completed, totalParticipants, totalActivities };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Presentation className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {isAdminRole(currentUser?.role)
                    ? "All Training Sessions (Admin View)"
                    : "My Training Sessions"}
                </h1>
                <p className="text-xs text-slate-500">
                  {isAdminRole(currentUser?.role)
                    ? "Global management across all facilitators, session data inspection, and CRUD"
                    : "Manage, configure, inspect data, and control your own training sessions"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sessions"
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-sm flex items-center gap-1.5"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Sessions</span>
            </Link>
            <Link
              href="/activities"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Activities Database</span>
            </Link>
            <Link
              href="/users"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users</span>
            </Link>
            <button
              onClick={() => {
                setNewTitle("");
                setNewDescription("");
                setNewFacilitatorName(currentUser?.name || "");
                setNewFacilitatorEmail(currentUser?.email || "");
                setShowCreateSessionModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <UserAvatarButton
                  user={currentUser}
                  onProfileUpdated={(updated) => {
                    setCurrentUser(updated);
                    loadSessions();
                  }}
                />
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Role Notice Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        {currentUser && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-sm ${
              isAdminRole(currentUser.role)
                ? "bg-purple-50 border-purple-200 text-purple-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <strong className="font-bold">
                  {isAdminRole(currentUser.role)
                    ? "Administrator Global Session Access:"
                    : "Facilitator Session Isolation:"}
                </strong>{" "}
                <span>
                  {isAdminRole(currentUser.role)
                    ? "You have full administrator privileges to view, inspect, modify, export data, and delete sessions created by all facilitators."
                    : "You are viewing sessions created by you. Sessions created by other facilitators are private and will not appear in this list."}
                </span>
              </div>
            </div>
            <span className="shrink-0 font-bold px-2 py-0.5 bg-white/80 rounded-md border border-slate-200">
              {currentUser.role}
            </span>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-4 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sessions</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Now</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Waiting</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.waiting}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="text-2xl font-black text-slate-600 mt-1">{stats.completed}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Participants</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{stats.totalParticipants}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Activities</p>
            <p className="text-2xl font-black text-teal-700 mt-1">{stats.totalActivities}</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search sessions by title, code, description, or host..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="WAITING">Waiting</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Facilitator Filter (only visible for ADMIN) */}
            {isAdminRole(currentUser?.role) && facilitatorsList.length > 0 && (
              <select
                value={facilitatorFilter}
                onChange={(e) => {
                  setFacilitatorFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Facilitators</option>
                {facilitatorsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => loadSessions()}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              title="Refresh Sessions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading training sessions...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No training sessions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {sessions.length === 0
                ? "No sessions created yet. Click 'New Session' to create your first training session!"
                : "No sessions match your search or filter criteria."}
            </p>
            {sessions.length === 0 && (
              <button
                onClick={() => setShowCreateSessionModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Session
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSessions.map((s) => {
                const partCount = s.participantCount ?? s._count?.participants ?? 0;
                const actCount = s.activityCount ?? s._count?.activities ?? 0;
                const teamCount = s.teamCount ?? s._count?.teams ?? 0;

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header: Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
                              s.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : s.status === "WAITING"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            {s.status}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 line-clamp-1">{s.title}</h3>
                        </div>

                        {/* Code Badge */}
                        <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                          <span className="font-mono text-xs font-bold text-indigo-700">{s.code}</span>
                          <button
                            onClick={() => handleCopyCode(s.code)}
                            className="text-indigo-400 hover:text-indigo-600 p-0.5"
                            title="Copy session code"
                          >
                            {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                        {s.description || "No description provided for this session."}
                      </p>

                      {/* Facilitator info */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                        <Shield className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="truncate">
                          Host: <strong className="text-slate-800">{s.facilitator?.name || s.facilitator?.username || "Facilitator"}</strong>
                        </span>
                      </div>

                      {/* Stats badges */}
                      <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Users</p>
                          <p className="text-sm font-bold text-slate-800">{partCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Activities</p>
                          <p className="text-sm font-bold text-slate-800">{actCount}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Teams</p>
                          <p className="text-sm font-bold text-slate-800">{teamCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => openSessionDetail(s)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Session Data & CRUD
                      </button>

                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <Link
                          href={`/sessions/${s.id}/facilitator`}
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition text-center flex items-center justify-center gap-1"
                          title="Open Live Facilitator Control Room"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Host Room
                        </Link>

                        <Link
                          href={`/sessions/${s.id}/projector`}
                          target="_blank"
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition text-center flex items-center justify-center gap-1"
                          title="Open Big-Screen Projector"
                        >
                          <Presentation className="w-3 h-3" />
                          Projector
                        </Link>

                        <button
                          onClick={() => handleDownloadDataset(s.id, s.code)}
                          className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 transition"
                          title="Download JSON Dataset"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditSession(s)}
                          className="p-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-600 transition"
                          title="Edit Session Settings"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedSession(s);
                            setShowDeleteSessionModal(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-600 transition"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-600">
                <span>
                  Showing{" "}
                  <strong className="text-slate-900">
                    {(safePage - 1) * SESSIONS_PER_PAGE + 1}
                  </strong>{" "}
                  –{" "}
                  <strong className="text-slate-900">
                    {Math.min(safePage * SESSIONS_PER_PAGE, filteredSessions.length)}
                  </strong>{" "}
                  of <strong className="text-slate-900">{filteredSessions.length}</strong> sessions
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 font-semibold text-slate-700 flex items-center gap-1 transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg font-bold transition ${
                        page === safePage
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 font-semibold text-slate-700 flex items-center gap-1 transition"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* SESSION DATA & CRUD DETAIL MODAL */}
      {showDetailModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800">{selectedSession.title}</h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        selectedSession.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : selectedSession.status === "WAITING"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                    >
                      {selectedSession.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Session Code: <strong className="font-mono text-indigo-700">{selectedSession.code}</strong> • ID: {selectedSession.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDataset(selectedSession.id, selectedSession.code)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                  title="Download complete session JSON dataset"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Dataset
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
              {/* Quick Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/sessions/${selectedSession.id}/facilitator`}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Facilitator Room
                  </Link>
                  <Link
                    href={`/sessions/${selectedSession.id}/projector`}
                    target="_blank"
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1.5"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    Open Projector View
                  </Link>
                  <Link
                    href={`/activities?sessionId=${selectedSession.id}`}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Activities Database
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditSession(selectedSession)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-200 transition flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Session
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteSessionModal(true);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Session
                  </button>
                </div>
              </div>

              {/* Session Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left 2 Cols: Details */}
                <div className="md:col-span-2 space-y-3">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <p className="font-bold text-slate-500 uppercase text-[10px]">Description</p>
                    <p className="text-slate-800">
                      {selectedSession.description || "No detailed description provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <p className="font-bold text-slate-500 uppercase text-[10px]">Host / Facilitator</p>
                      <p className="font-bold text-slate-800">{selectedSession.facilitator?.name || "Facilitator"}</p>
                      <p className="text-slate-500 text-[11px]">{selectedSession.facilitator?.email || "No email"}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <p className="font-bold text-slate-500 uppercase text-[10px]">Leaderboard Visibility</p>
                      <p className="font-bold text-indigo-700">{selectedSession.leaderboardVisibility || "LIVE"}</p>
                      <p className="text-slate-400 text-[11px]">Visibility for participants</p>
                    </div>
                  </div>

                  {selectedSession.canvaPresentationUrl && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-500 uppercase text-[10px]">Linked Canva Presentation</p>
                        <a
                          href={selectedSession.canvaPresentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline truncate max-w-md block font-medium"
                        >
                          {selectedSession.canvaPresentationUrl}
                        </a>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-50 rounded text-indigo-700">
                        All Slides Linked
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Col: QR & Join info */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Scan to Join Session</p>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Join QR Code" className="w-36 h-36 bg-white p-2 rounded-lg border border-slate-200 mb-2" />
                  ) : (
                    <div className="w-36 h-36 bg-white rounded-lg border flex items-center justify-center text-xs text-slate-400 mb-2">
                      Generating QR...
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm text-indigo-700 bg-white px-3 py-1 rounded-md border border-slate-200">
                      {selectedSession.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(selectedSession.code)}
                      className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-slate-600 transition"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Activities / Interactions in this Session (with nested Messages, Replies/Comments & Whiteboards) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Session Interactions & Activities ({sessionDetails?.activities?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowAddActivityModal(true)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Activity
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading interactions...</div>
                ) : (!sessionDetails?.activities || sessionDetails.activities.length === 0) ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed text-xs text-slate-400">
                    No interactions created yet in this session.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessionDetails.activities.map((act: any) => {
                      const actResponses = act.responses || act.messages || [];
                      const actWhiteboards = act.whiteboards || [];

                      return (
                        <div
                          key={act.id}
                          className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">{act.title}</span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                  {act.type}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    act.state === "ACTIVE"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {act.state}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  • {actResponses.length} messages/responses • {actWhiteboards.length} whiteboards
                                </span>
                              </div>
                              <p className="text-slate-500 truncate text-[11px]">{act.prompt}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/activities?sessionId=${selectedSession.id}`}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                                title="Inspect in Activities Database"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteActivityFromSession(act.id, act.title)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Nested Messages / Responses, Replies / Comments, and Feedbacks */}
                          {actResponses.length > 0 && (
                            <div className="pl-3 border-l-2 border-indigo-200 space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>Messages, Replies & Comments ({actResponses.length})</span>
                              </p>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {actResponses.map((r: any) => {
                                  const comments = r.comments || r.replies || [];
                                  const reactions = r.reactions || [];
                                  return (
                                    <div key={r.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <button
                                          type="button"
                                          onClick={() => r.participantId && setInspectingParticipantId(r.participantId)}
                                          className="font-bold text-indigo-700 hover:underline text-left"
                                        >
                                          {r.participant?.displayName || "Participant"}
                                        </button>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                          {reactions.length > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold">
                                              👍 {reactions.length}
                                            </span>
                                          )}
                                          {comments.length > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold">
                                              💬 {comments.length} replies
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-slate-800 break-words">{r.content}</p>

                                      {comments.length > 0 && (
                                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 pl-2.5 border-l-2 border-indigo-300 space-y-1">
                                          {comments.map((c: any) => (
                                            <div key={c.id} className="text-[11px] text-slate-600">
                                              <span className="font-bold text-slate-800 mr-1">
                                                {c.participant?.displayName || "User"}:
                                              </span>
                                              <span>{c.content}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Nested Whiteboards */}
                          {actWhiteboards.length > 0 && (
                            <div className="pl-3 border-l-2 border-purple-200 space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                                <Palette className="w-3 h-3" />
                                <span>Whiteboards ({actWhiteboards.length})</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {actWhiteboards.map((wb: any) => (
                                  <div
                                    key={wb.id}
                                    className="p-2 bg-purple-50/50 rounded-lg border border-purple-100 flex items-center justify-between text-[11px]"
                                  >
                                    <span className="font-semibold text-slate-800 truncate">
                                      {wb.team?.name
                                        ? `Team ${wb.team.name}`
                                        : wb.participant?.displayName || "Collaborative Canvas"}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-white border border-purple-200 text-purple-700 text-[10px] font-bold">
                                      {wb.isSubmitted ? "Submitted" : "Active Canvas"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Participants Roster in this Session (with Related Points & Awards + Click to Inspect) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Enrolled Participants — Points & Awards ({sessionDetails?.participants?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowAddParticipantModal(true)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Participant
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading participants...</div>
                ) : (!sessionDetails?.participants || sessionDetails.participants.length === 0) ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed text-xs text-slate-400">
                    No participants have joined this session yet. Click &quot;Add Participant&quot; to enroll one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sessionDetails.participants.map((p: any) => {
                      const pBadges = p.badges || p.awards || [];
                      const pPoints = p.pointsReceived || p.points || [];

                      return (
                        <div
                          key={p.id}
                          onClick={() => setInspectingParticipantId(p.id)}
                          className="p-3.5 bg-white hover:bg-indigo-50/40 rounded-xl border border-slate-200 hover:border-indigo-300 text-xs space-y-2.5 cursor-pointer transition shadow-sm"
                          title="Click to inspect full participant profile, session info, points, awards & interactions"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="underline decoration-dotted underline-offset-2">
                                  {p.displayName}
                                </span>
                                {p.team?.name && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-semibold">
                                    {p.team.name}
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Joined {new Date(p.joinedAt).toLocaleTimeString()} • Click to inspect
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                {p.totalPoints || 0} pts
                              </span>
                              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                                🏅 {pBadges.length}
                              </span>
                            </div>
                          </div>

                          {/* Related Awards / Badges */}
                          {pBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                              {pBadges.map((b: any) => (
                                <span
                                  key={b.id}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold"
                                >
                                  {b.badge?.icon || "🏅"} {b.badge?.name || b.name || "Award"}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Related Points History Preview */}
                          {pPoints.length > 0 && (
                            <div className="pt-1 border-t border-slate-100 space-y-1">
                              <p className="text-[10px] font-bold uppercase text-slate-400">
                                Recent Points ({pPoints.length} awards):
                              </p>
                              {pPoints.slice(0, 2).map((pt: any) => (
                                <div key={pt.id} className="flex items-center justify-between text-[11px] text-slate-600">
                                  <span className="truncate">{pt.reason || pt.source}</span>
                                  <span className="font-mono font-bold text-amber-600 shrink-0 ml-2">
                                    +{pt.amount} pts
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                Created on {new Date(selectedSession.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PARTICIPANT TO SESSION MODAL */}
      {showAddParticipantModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Add Participant to {selectedSession.title}
              </h3>
              <button
                onClick={() => setShowAddParticipantModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddParticipantToSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Participant Display Name *
                </label>
                <input
                  type="text"
                  required={!newParticipantUsername.trim()}
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Existing Username (Optional)
                </label>
                <input
                  type="text"
                  value={newParticipantUsername}
                  onChange={(e) => setNewParticipantUsername(e.target.value)}
                  placeholder="e.g. alice_lead"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddParticipantModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Add Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTICIPANT INSPECTOR MODAL */}
      {inspectingParticipantId && (
        <ParticipantDetailModal
          participantId={inspectingParticipantId}
          onClose={() => setInspectingParticipantId(null)}
        />
      )}

      {/* EDIT SESSION MODAL */}
      {showEditSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                Edit Session: {selectedSession.title}
              </h3>
              <button onClick={() => setShowEditSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="WAITING">WAITING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Leaderboard Visibility</label>
                  <select
                    value={editLeaderboardVisibility}
                    onChange={(e) => setEditLeaderboardVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="LIVE">LIVE</option>
                    <option value="HIDDEN">HIDDEN</option>
                    <option value="END_OF_ACTIVITY">END_OF_ACTIVITY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Canva Presentation Link</label>
                <input
                  type="url"
                  value={editCanvaUrl}
                  onChange={(e) => setEditCanvaUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {isAdminRole(currentUser?.role) ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Facilitator (Admin Only)
                  </label>
                  <select
                    value={editFacilitatorId}
                    onChange={(e) => setEditFacilitatorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    {allFacilitatorUsers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (@{f.username}) — {f.role}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600">
                  <span>
                    Assigned Facilitator:{" "}
                    <strong className="text-slate-800">
                      {selectedSession.facilitator?.name || currentUser?.name}
                    </strong>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Admin Only
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditSessionModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SESSION MODAL */}
      {showDeleteSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete Session</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete session <strong className="text-slate-800">{selectedSession.title}</strong> ({selectedSession.code})?
              All enrolled participants, interactive activities, responses, whiteboards, and points will be permanently deleted.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteSessionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create New Training Session
              </h3>
              <button onClick={() => setShowCreateSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Leadership Workshop 2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Goals and background of the training session"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {isAdminRole(currentUser?.role) ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign to Facilitator (Admin Only)
                  </label>
                  <select
                    value={newFacilitatorId || currentUser?.id || ""}
                    onChange={(e) => {
                      const fId = e.target.value;
                      setNewFacilitatorId(fId);
                      const found = allFacilitatorUsers.find((u) => u.id === fId);
                      if (found) {
                        setNewFacilitatorName(found.name || found.username);
                        setNewFacilitatorEmail(found.email || `${found.username}@training.local`);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    {allFacilitatorUsers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (@{f.username}) — {f.role}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Assigned Facilitator: {currentUser?.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {currentUser?.email || `${currentUser?.username}@training.local`}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Locked to You
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ACTIVITY MODAL */}
      {showAddActivityModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Add Activity to {selectedSession.title}
              </h3>
              <button onClick={() => setShowAddActivityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivityInSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={newActTitle}
                  onChange={(e) => setNewActTitle(e.target.value)}
                  placeholder="e.g. Brainstorming Core Principles"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prompt / Question *</label>
                <textarea
                  rows={2}
                  required
                  value={newActPrompt}
                  onChange={(e) => setNewActPrompt(e.target.value)}
                  placeholder="Question or challenge for the participants"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Type</label>
                <select
                  value={newActType}
                  onChange={(e) => setNewActType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="OPEN_QUESTION">Discussion / Brainstorm</option>
                  <option value="POLL">Live Poll</option>
                  <option value="QUIZ">Competitive Trivia Quiz</option>
                  <option value="WORD_CLOUD">Word Cloud</option>
                  <option value="QA">Live Q&A Session</option>
                  <option value="RANKING">Prioritization & Ranking</option>
                  <option value="WHITEBOARD_TEAM">Team Whiteboard</option>
                  <option value="WHITEBOARD_INDIVIDUAL">Individual Whiteboard</option>
                  <option value="WHITEBOARD_PUBLIC">Public Whiteboard</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIGN IN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Facilitator / Admin Sign In</h2>
              <p className="text-xs text-slate-500">
                Sign in to view your sessions or manage all sessions
              </p>
            </div>

            {loginError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. facilitator_maya or admin_alex"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                {loginLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
