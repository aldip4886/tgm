"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ParticipantDetailModal } from "@/components/ParticipantDetailModal";
import { UserAvatarButton } from "@/components/UserAvatarButton";
import {
  Layers,
  Search,
  Plus,
  Play,
  Lock,
  CheckCircle,
  Trash2,
  Edit3,
  Eye,
  ArrowLeft,
  Users,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Shield,
  ExternalLink,
  ChevronDown,
  ListOrdered,
  MessageSquare,
  Cloud,
  HelpCircle,
  BarChart3,
  Palette,
  Check,
  Clock,
  Presentation,
  KeyRound,
  Filter,
  X,
  Award,
} from "lucide-react";

export default function ActivitiesDatabasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sessions & Selected Session
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");

  // Notifications
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Current authenticated user state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // CRUD Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inspectingParticipantId, setInspectingParticipantId] = useState<string | null>(null);

  // Selected Activity for Edit / Inspect / Delete
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [detailedActivity, setDetailedActivity] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form Fields for Create / Edit
  const [formTitle, setFormTitle] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formType, setFormType] = useState("OPEN_QUESTION");
  const [formRevealMode, setFormRevealMode] = useState<"UPON_LOCK" | "IMMEDIATE">("UPON_LOCK");
  const [formTimerSeconds, setFormTimerSeconds] = useState<string>("");
  const [formSlide, setFormSlide] = useState<string>("");
  const [formState, setFormState] = useState<string>("DRAFT");
  const [formOrderIndex, setFormOrderIndex] = useState<string>("0");

  // Config options (for Poll / Quiz / Ranking)
  const [formOptions, setFormOptions] = useState<string[]>(["Option A", "Option B", "Option C", "Option D"]);
  const [formCorrectOption, setFormCorrectOption] = useState<number>(0);
  const [formQuizPoints, setFormQuizPoints] = useState<number>(10);
  const [formRankingItems, setFormRankingItems] = useState<string[]>(["Priority Item 1", "Priority Item 2", "Priority Item 3"]);

  const [submitting, setSubmitting] = useState(false);

  const isAuthorizedRole = (role?: string) =>
    role === "FACILITATOR" || role === "ADMIN" || role === "SUPER_ADMIN";

  // Check auth on mount
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
      } else {
        setLoadingSessions(false);
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
    setLoadingSessions(true);
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

      const querySessionId = searchParams.get("sessionId");
      if (querySessionId && data.some((s: any) => s.id === querySessionId)) {
        setSelectedSessionId(querySessionId);
        loadActivities(querySessionId, activeToken);
      } else if (data.length > 0) {
        setSelectedSessionId(data[0].id);
        loadActivities(data[0].id, activeToken);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadActivities = async (sessionId: string, token?: string | null) => {
    if (!sessionId) return;
    setLoadingActivities(true);
    setErrorMsg("");
    try {
      const activeToken =
        token ||
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch(`/api/sessions/${sessionId}/activities`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load activities");

      setActivities(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    router.replace(`/activities?sessionId=${sessionId}`);
    loadActivities(sessionId);
  };

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  const resetForm = () => {
    setFormTitle("");
    setFormPrompt("");
    setFormType("OPEN_QUESTION");
    setFormRevealMode("UPON_LOCK");
    setFormTimerSeconds("");
    setFormSlide("");
    setFormState("DRAFT");
    setFormOrderIndex(String(activities.length));
    setFormOptions(["Option A", "Option B", "Option C", "Option D"]);
    setFormCorrectOption(0);
    setFormQuizPoints(10);
    setFormRankingItems(["Priority Item 1", "Priority Item 2", "Priority Item 3"]);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (act: any) => {
    setSelectedActivity(act);
    setFormTitle(act.title || "");
    setFormPrompt(act.prompt || "");
    setFormType(act.type || "OPEN_QUESTION");
    setFormRevealMode(act.revealMode === "IMMEDIATE" ? "IMMEDIATE" : "UPON_LOCK");
    setFormTimerSeconds(act.timerSeconds ? String(act.timerSeconds) : "");
    setFormSlide(act.presentationSlide ? String(act.presentationSlide) : "");
    setFormState(act.state || "DRAFT");
    setFormOrderIndex(String(act.orderIndex ?? 0));

    if (act.config) {
      try {
        const parsed = JSON.parse(act.config);
        if (parsed.options) setFormOptions(parsed.options);
        if (parsed.correctAnswer !== undefined) {
          const idx = parsed.options?.indexOf(parsed.correctAnswer);
          setFormCorrectOption(idx >= 0 ? idx : 0);
        }
        if (parsed.points) setFormQuizPoints(parsed.points);
        if (parsed.items) setFormRankingItems(parsed.items);
      } catch (e) {}
    } else {
      setFormOptions(["Option A", "Option B", "Option C", "Option D"]);
      setFormCorrectOption(0);
      setFormQuizPoints(10);
      setFormRankingItems(["Priority Item 1", "Priority Item 2", "Priority Item 3"]);
    }

    setShowEditModal(true);
  };

  const openDetailsModal = async (act: any) => {
    setSelectedActivity(act);
    setShowDetailsModal(true);
    setLoadingDetails(true);
    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);
      const res = await fetch(`/api/activities/${act.id}`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch activity details");
      setDetailedActivity(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openDeleteModal = (act: any) => {
    setSelectedActivity(act);
    setShowDeleteModal(true);
  };

  const buildConfigPayload = () => {
    if (formType === "POLL") {
      return JSON.stringify({
        options: formOptions.filter((o) => o.trim() !== ""),
      });
    }
    if (formType === "QUIZ") {
      const filtered = formOptions.filter((o) => o.trim() !== "");
      return JSON.stringify({
        options: filtered,
        correctAnswer: filtered[formCorrectOption] || filtered[0] || "",
        points: formQuizPoints,
      });
    }
    if (formType === "RANKING") {
      return JSON.stringify({
        items: formRankingItems.filter((i) => i.trim() !== ""),
      });
    }
    return undefined;
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const payload: any = {
        title: formTitle.trim(),
        prompt: formPrompt.trim(),
        type: formType,
        revealMode: formRevealMode,
      };

      const cfg = buildConfigPayload();
      if (cfg) payload.config = cfg;
      if (formTimerSeconds) payload.timerSeconds = parseInt(formTimerSeconds, 10);
      if (formSlide) payload.presentationSlide = parseInt(formSlide, 10);

      const res = await fetch(`/api/sessions/${selectedSessionId}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create activity");

      setSuccessMsg(`Activity '${data.title}' successfully created!`);
      setShowCreateModal(false);
      resetForm();
      loadActivities(selectedSessionId);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const payload: any = {
        title: formTitle.trim(),
        prompt: formPrompt.trim(),
        type: formType,
        revealMode: formRevealMode,
        state: formState,
        orderIndex: parseInt(formOrderIndex, 10) || 0,
      };

      const cfg = buildConfigPayload();
      if (cfg) payload.config = cfg;
      payload.timerSeconds = formTimerSeconds ? parseInt(formTimerSeconds, 10) : null;
      payload.presentationSlide = formSlide ? parseInt(formSlide, 10) : null;

      const res = await fetch(`/api/activities/${selectedActivity.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update activity");

      setSuccessMsg(`Activity '${data.title}' updated successfully!`);
      setShowEditModal(false);
      setSelectedActivity(null);
      loadActivities(selectedSessionId);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch(`/api/activities/${selectedActivity.id}`, {
        method: "DELETE",
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete activity");

      setSuccessMsg(`Activity '${selectedActivity.title}' deleted successfully!`);
      setShowDeleteModal(false);
      setSelectedActivity(null);
      loadActivities(selectedSessionId);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStateTransition = async (act: any, newState: string) => {
    setErrorMsg("");
    try {
      const activeToken =
        userToken ||
        (typeof window !== "undefined" ? localStorage.getItem("tgms_user_token") : null);

      const res = await fetch(`/api/activities/${act.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ state: newState }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transition activity");

      setSuccessMsg(`Activity '${act.title}' state set to ${newState}!`);
      loadActivities(selectedSessionId);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "WHITEBOARD" && act.type?.startsWith("WHITEBOARD")) ||
        (typeFilter === "POLL_QUIZ" && (act.type === "POLL" || act.type === "QUIZ")) ||
        (typeFilter === "WORD_CLOUD" && act.type === "WORD_CLOUD") ||
        (typeFilter === "QA" && act.type === "QA") ||
        (typeFilter === "RANKING" && act.type === "RANKING") ||
        (typeFilter === "OPEN" && (act.type === "OPEN_QUESTION" || act.type === "OPEN_ENDED"));

      const matchesState = stateFilter === "ALL" || act.state === stateFilter;

      return matchesSearch && matchesType && matchesState;
    });
  }, [activities, searchQuery, typeFilter, stateFilter]);

  const stats = useMemo(() => {
    const total = activities.length;
    const active = activities.filter((a) => a.state === "ACTIVE").length;
    const completed = activities.filter((a) => a.state === "COMPLETED").length;
    const responses = activities.reduce(
      (sum, a) => sum + (a._count?.responses || a.responseCount || 0),
      0
    );
    const whiteboards = activities.reduce(
      (sum, a) => sum + (a._count?.whiteboards || a.whiteboardCount || 0),
      0
    );
    return { total, active, completed, responses, whiteboards };
  }, [activities]);

  const getActivityTypeMeta = (type: string) => {
    switch (type) {
      case "POLL":
        return { label: "Live Poll", color: "bg-blue-50 text-blue-700 border-blue-200", icon: BarChart3 };
      case "QUIZ":
        return { label: "Trivia Quiz", color: "bg-purple-50 text-purple-700 border-purple-200", icon: HelpCircle };
      case "WORD_CLOUD":
        return { label: "Word Cloud", color: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: Cloud };
      case "QA":
        return { label: "Q&A Session", color: "bg-violet-50 text-violet-700 border-violet-200", icon: MessageSquare };
      case "RANKING":
        return { label: "Ranking", color: "bg-amber-50 text-amber-700 border-amber-200", icon: ListOrdered };
      case "WHITEBOARD_TEAM":
        return { label: "Team Whiteboard", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Palette };
      case "WHITEBOARD_INDIVIDUAL":
        return { label: "Individual Whiteboard", color: "bg-teal-50 text-teal-700 border-teal-200", icon: Palette };
      case "WHITEBOARD_PUBLIC":
        return { label: "Public Whiteboard", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Palette };
      case "OPEN_QUESTION":
      case "OPEN_ENDED":
      default:
        return { label: "Discussion / Brainstorm", color: "bg-slate-100 text-slate-700 border-slate-300", icon: MessageSquare };
    }
  };

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
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Learning Activities Database</h1>
                <p className="text-xs text-slate-500">
                  Browse, inspect, configure, and manage learning activities by session
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sessions"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Sessions</span>
            </Link>
            <Link
              href="/users"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users</span>
            </Link>
            <Link
              href="/activities"
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Activities Database</span>
            </Link>
            <Link
              href="/sessions/create"
              className="px-3 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 font-semibold text-xs rounded-xl transition"
            >
              + Create Session
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <UserAvatarButton
                  user={currentUser}
                  onProfileUpdated={(updated) => setCurrentUser(updated)}
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

      {/* Notifications */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
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
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center justify-between">
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
      <main className="max-w-7xl mx-auto px-6 pt-2 space-y-6">
        {/* Session Selector Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Selected Training Session:
            </label>
            <div className="relative">
              <select
                value={selectedSessionId}
                onChange={(e) => handleSelectSession(e.target.value)}
                disabled={loadingSessions || sessions.length === 0}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 transition appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {sessions.length === 0 ? (
                  <option value="">No sessions available</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.code}) {s.facilitator?.name ? `• Host: ${s.facilitator.name}` : ""} [{s.status}]
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {selectedSession && (
            <div className="flex items-center gap-3">
              <Link
                href={`/sessions/${selectedSession.id}/facilitator`}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 shadow-sm transition"
              >
                <Layers className="w-3.5 h-3.5" />
                Facilitator View
              </Link>
              <Link
                href={`/sessions/${selectedSession.id}/projector`}
                target="_blank"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Projector
              </Link>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Activity
              </button>
            </div>
          )}
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Activities</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Right Now</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="text-2xl font-black text-slate-600 mt-1">{stats.completed}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Total Responses</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{stats.responses}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Whiteboards</p>
            <p className="text-2xl font-black text-teal-700 mt-1">{stats.whiteboards}</p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities by title, prompt, or type..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Activity Types</option>
              <option value="POLL_QUIZ">Polls & Quizzes</option>
              <option value="WORD_CLOUD">Word Clouds</option>
              <option value="QA">Q&A Sessions</option>
              <option value="RANKING">Ranking & Prioritization</option>
              <option value="WHITEBOARD">Whiteboards (All Types)</option>
              <option value="OPEN">Brainstorm & Discussion</option>
            </select>

            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All States</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="LOCKED">Locked</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <button
              onClick={() => selectedSessionId && loadActivities(selectedSessionId)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
              title="Refresh Activities"
            >
              <RefreshCw className={`w-4 h-4 ${loadingActivities ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Activities List */}
        {loadingActivities ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading activities from database...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No activities found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {activities.length === 0
                ? "No activities created in this session yet. Click 'Add Activity' to get started!"
                : "No activities match your current search or type filter."}
            </p>
            {activities.length === 0 && selectedSession && (
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Activity
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map((act, index) => {
              const meta = getActivityTypeMeta(act.type);
              const Icon = meta.icon;
              const respCount = act._count?.responses ?? act.responseCount ?? 0;
              const wbCount = act._count?.whiteboards ?? act.whiteboardCount ?? 0;

              return (
                <div
                  key={act.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    act.state === "ACTIVE"
                      ? "border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20"
                      : "border-slate-200"
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 shrink-0 font-mono text-xs font-bold">
                      <span>#{act.orderIndex ?? index + 1}</span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{act.title}</h3>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${meta.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>

                        {/* State Badge */}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            act.state === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                              : act.state === "LOCKED"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : act.state === "COMPLETED"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {act.state}
                        </span>

                        {act.presentationSlide && (
                          <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Presentation className="w-2.5 h-2.5" />
                            Slide {act.presentationSlide}
                          </span>
                        )}

                        {act.timerSeconds && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {act.timerSeconds}s
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">{act.prompt}</p>

                      {/* Stats & Metadata */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-medium">
                        <span>
                          Responses: <strong className="text-slate-700">{respCount}</strong>
                        </span>
                        {act.type?.startsWith("WHITEBOARD") && (
                          <span>
                            Whiteboards: <strong className="text-slate-700">{wbCount}</strong>
                          </span>
                        )}
                        <span>
                          Reveal: <strong className="text-slate-600">{act.revealMode}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
                    {/* Quick State Toggle */}
                    {act.state !== "ACTIVE" && (
                      <button
                        onClick={() => handleQuickStateTransition(act, "ACTIVE")}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                        title="Launch Activity"
                      >
                        <Play className="w-3 h-3" />
                        Launch
                      </button>
                    )}
                    {act.state === "ACTIVE" && (
                      <button
                        onClick={() => handleQuickStateTransition(act, "LOCKED")}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                        title="Lock Activity"
                      >
                        <Lock className="w-3 h-3" />
                        Lock
                      </button>
                    )}
                    {act.state === "LOCKED" && (
                      <button
                        onClick={() => handleQuickStateTransition(act, "COMPLETED")}
                        className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1"
                        title="Complete Activity"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Complete
                      </button>
                    )}

                    {/* Inspect Button */}
                    <button
                      onClick={() => openDetailsModal(act)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition"
                      title="Inspect Details & Submissions"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(act)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 rounded-lg transition"
                      title="Edit Activity"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => openDeleteModal(act)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                      title="Delete Activity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE ACTIVITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create Learning Activity
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Brainstorming: Innovation Drivers"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prompt / Question *</label>
                <textarea
                  rows={3}
                  required
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="What are the top 3 growth blockers facing your team this quarter?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="OPEN_QUESTION">Brainstorm / Open Discussion</option>
                    <option value="POLL">Live Audience Poll (Multiple Choice)</option>
                    <option value="QUIZ">Competitive Trivia Quiz</option>
                    <option value="WORD_CLOUD">Word Cloud (Clustering)</option>
                    <option value="QA">Live Q&A Session</option>
                    <option value="RANKING">Prioritization & Ranking</option>
                    <option value="WHITEBOARD_TEAM">Team Whiteboard (Collab)</option>
                    <option value="WHITEBOARD_INDIVIDUAL">Individual Whiteboard</option>
                    <option value="WHITEBOARD_PUBLIC">Public Whiteboard (All)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reveal Mode</label>
                  <select
                    value={formRevealMode}
                    onChange={(e) => setFormRevealMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="UPON_LOCK">Hide until Locked (Anti-bias)</option>
                    <option value="IMMEDIATE">Stream Live Immediately</option>
                  </select>
                </div>
              </div>

              {/* Dynamic options for Poll & Quiz */}
              {(formType === "POLL" || formType === "QUIZ") && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      {formType === "QUIZ" ? "Quiz Choices & Correct Answer" : "Poll Choices"}
                    </label>
                    {formType === "QUIZ" && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span>Points:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formQuizPoints}
                          onChange={(e) => setFormQuizPoints(parseInt(e.target.value) || 10)}
                          className="w-16 px-2 py-0.5 border border-slate-300 rounded text-xs font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {formOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {formType === "QUIZ" && (
                          <input
                            type="radio"
                            name="quizCorrect"
                            checked={formCorrectOption === idx}
                            onChange={() => setFormCorrectOption(idx)}
                            className="text-indigo-600 focus:ring-indigo-500"
                            title="Select as correct choice"
                          />
                        )}
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const updated = [...formOptions];
                            updated[idx] = e.target.value;
                            setFormOptions(updated);
                          }}
                          placeholder={`Choice ${idx + 1}`}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setFormOptions(formOptions.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {formOptions.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setFormOptions([...formOptions, `Choice ${formOptions.length + 1}`])}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      + Add Choice
                    </button>
                  )}
                </div>
              )}

              {/* Dynamic items for Ranking */}
              {formType === "RANKING" && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">Items to Prioritize</label>
                  <div className="space-y-2">
                    {formRankingItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-center text-xs font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={item}
                          onChange={(e) => {
                            const updated = [...formRankingItems];
                            updated[idx] = e.target.value;
                            setFormRankingItems(updated);
                          }}
                          placeholder={`Item ${idx + 1}`}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        {formRankingItems.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setFormRankingItems(formRankingItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {formRankingItems.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setFormRankingItems([...formRankingItems, `Item ${formRankingItems.length + 1}`])}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      + Add Item
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Timer (seconds, optional)</label>
                  <input
                    type="number"
                    min={5}
                    value={formTimerSeconds}
                    onChange={(e) => setFormTimerSeconds(e.target.value)}
                    placeholder="e.g. 60"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Canva Slide # (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={formSlide}
                    onChange={(e) => setFormSlide(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACTIVITY MODAL */}
      {showEditModal && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                Edit Activity: {selectedActivity.title}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prompt / Question *</label>
                <textarea
                  rows={3}
                  required
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="OPEN_QUESTION">Discussion</option>
                    <option value="POLL">Live Poll</option>
                    <option value="QUIZ">Trivia Quiz</option>
                    <option value="WORD_CLOUD">Word Cloud</option>
                    <option value="QA">Q&A Session</option>
                    <option value="RANKING">Ranking</option>
                    <option value="WHITEBOARD_TEAM">Team WB</option>
                    <option value="WHITEBOARD_INDIVIDUAL">Indiv WB</option>
                    <option value="WHITEBOARD_PUBLIC">Public WB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <select
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LOCKED">LOCKED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reveal Mode</label>
                  <select
                    value={formRevealMode}
                    onChange={(e) => setFormRevealMode(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="UPON_LOCK">UPON_LOCK</option>
                    <option value="IMMEDIATE">IMMEDIATE</option>
                  </select>
                </div>
              </div>

              {/* Dynamic options for Poll & Quiz */}
              {(formType === "POLL" || formType === "QUIZ") && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      {formType === "QUIZ" ? "Quiz Choices & Correct Answer" : "Poll Choices"}
                    </label>
                    {formType === "QUIZ" && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span>Points:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formQuizPoints}
                          onChange={(e) => setFormQuizPoints(parseInt(e.target.value) || 10)}
                          className="w-16 px-2 py-0.5 border border-slate-300 rounded text-xs font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {formOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {formType === "QUIZ" && (
                          <input
                            type="radio"
                            name="editQuizCorrect"
                            checked={formCorrectOption === idx}
                            onChange={() => setFormCorrectOption(idx)}
                            className="text-indigo-600 focus:ring-indigo-500"
                            title="Select as correct choice"
                          />
                        )}
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const updated = [...formOptions];
                            updated[idx] = e.target.value;
                            setFormOptions(updated);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setFormOptions(formOptions.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {formOptions.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setFormOptions([...formOptions, `Choice ${formOptions.length + 1}`])}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      + Add Choice
                    </button>
                  )}
                </div>
              )}

              {/* Dynamic items for Ranking */}
              {formType === "RANKING" && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">Items to Prioritize</label>
                  <div className="space-y-2">
                    {formRankingItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-center text-xs font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={item}
                          onChange={(e) => {
                            const updated = [...formRankingItems];
                            updated[idx] = e.target.value;
                            setFormRankingItems(updated);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                        {formRankingItems.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setFormRankingItems(formRankingItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {formRankingItems.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setFormRankingItems([...formRankingItems, `Item ${formRankingItems.length + 1}`])}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      + Add Item
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Order Index</label>
                  <input
                    type="number"
                    min={0}
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Timer (s)</label>
                  <input
                    type="number"
                    min={5}
                    value={formTimerSeconds}
                    onChange={(e) => setFormTimerSeconds(e.target.value)}
                    placeholder="None"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Canva Slide</label>
                  <input
                    type="number"
                    min={1}
                    value={formSlide}
                    onChange={(e) => setFormSlide(e.target.value)}
                    placeholder="None"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT DETAILS MODAL */}
      {showDetailsModal && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">
                  {selectedActivity.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailedActivity(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Prompt box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Prompt</p>
                <p className="text-xs text-slate-800 font-medium">{selectedActivity.prompt}</p>
              </div>

              {/* Meta tags */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono text-slate-600 border border-slate-200">
                  Type: <strong>{selectedActivity.type}</strong>
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono text-slate-600 border border-slate-200">
                  State: <strong>{selectedActivity.state}</strong>
                </span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono text-slate-600 border border-slate-200">
                  Reveal: <strong>{selectedActivity.revealMode}</strong>
                </span>
                {selectedActivity.presentationSlide && (
                  <span className="px-2.5 py-1 bg-indigo-50 rounded-lg text-indigo-700 border border-indigo-200">
                    Slide #{selectedActivity.presentationSlide}
                  </span>
                )}
                {selectedActivity.timerSeconds && (
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                    Timer: {selectedActivity.timerSeconds}s
                  </span>
                )}
              </div>

              {loadingDetails ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading activity submissions and analytics...
                </div>
              ) : detailedActivity ? (
                <div className="space-y-4">
                  {/* Poll / Quiz Visual Stats */}
                  {detailedActivity.pollQuizStats && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700">Vote Distribution</h4>
                        <span className="text-xs font-semibold text-slate-500">
                          Total Votes: {detailedActivity.pollQuizStats.totalVotes}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {detailedActivity.pollQuizStats.options?.map((opt: string, i: number) => {
                          const count = detailedActivity.pollQuizStats.optionCounts?.[opt] || 0;
                          const total = detailedActivity.pollQuizStats.totalVotes || 1;
                          const pct = Math.round((count / (total || 1)) * 100);
                          const isCorrect = detailedActivity.pollQuizStats.correctAnswer === opt;

                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
                                  <span className={isCorrect ? "font-bold text-emerald-800" : ""}>
                                    {opt}
                                  </span>
                                </span>
                                <span className="font-mono text-slate-500">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isCorrect ? "bg-emerald-500" : "bg-indigo-600"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Whiteboards Preview */}
                  {detailedActivity.whiteboards && detailedActivity.whiteboards.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700">
                        Whiteboard Boards ({detailedActivity.whiteboards.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {detailedActivity.whiteboards.map((wb: any) => (
                          <div
                            key={wb.id}
                            className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800">
                              {wb.team?.name || wb.participant?.displayName || "Participant Board"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                wb.isSubmitted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {wb.isSubmitted ? "Submitted" : "Drawing"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responses / Messages, Replies, Comments, Feedbacks & Points */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700">
                      Participant Messages, Replies & Comments ({detailedActivity.responses?.length || 0})
                    </h4>
                    {(!detailedActivity.responses || detailedActivity.responses.length === 0) ? (
                      <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl border border-dashed">
                        No responses submitted yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {detailedActivity.responses.map((r: any) => {
                          const ptsTotal = (r.points || []).reduce((acc: number, p: any) => acc + p.amount, 0);
                          return (
                            <div
                              key={r.id}
                              className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-2 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => r.participant?.id && setInspectingParticipantId(r.participant.id)}
                                    className="font-bold text-indigo-700 hover:underline text-left"
                                    title="Click to inspect participant profile, points, awards & interactions"
                                  >
                                    {r.participant?.displayName || "Anonymous Participant"}
                                  </button>
                                  <p className="text-slate-700 mt-0.5 break-words">{r.content}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 font-mono">
                                  {ptsTotal > 0 && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold">
                                      +{ptsTotal} pts
                                    </span>
                                  )}
                                  {r.reactions?.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded font-bold">
                                      👍 {r.reactions.length}
                                    </span>
                                  )}
                                  {r.comments?.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-bold">
                                      💬 {r.comments.length}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Nested Replies / Comments */}
                              {r.comments?.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 pl-3 border-l-2 border-indigo-200 space-y-1">
                                  {r.comments.map((c: any) => (
                                    <div key={c.id} className="text-[11px] text-slate-600">
                                      <button
                                        type="button"
                                        onClick={() => c.participant?.id && setInspectingParticipantId(c.participant.id)}
                                        className="font-bold text-slate-800 hover:text-indigo-600 mr-1.5"
                                      >
                                        {c.participant?.displayName || "User"}:
                                      </button>
                                      <span>{c.content}</span>
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
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setDetailedActivity(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
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

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete Activity</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-800">{selectedActivity.title}</strong>?
              All associated participant responses, whiteboard drawings, and comments will be permanently removed.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteActivity}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
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
                Sign in with your Facilitator or Administrator account to manage activities
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
                  placeholder="e.g. admin or fac1"
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
