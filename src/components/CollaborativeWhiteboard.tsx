"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket-client";
import {
  Pen,
  Square,
  Circle,
  Eraser,
  StickyNote,
  RotateCcw,
  Send,
  CheckCircle,
  Sparkles,
} from "lucide-react";

export interface WhiteboardElement {
  id: string;
  type: "draw" | "rect" | "circle" | "sticky";
  color: string;
  width: number;
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
}

export interface WhiteboardProps {
  whiteboardId: string;
  sessionId: string;
  participantId?: string;
  teamId?: string;
  readOnly?: boolean;
  initialSceneData?: string;
  onSubmitted?: () => void;
}

const DRAW_COLORS = ["#4f46e5", "#059669", "#d97706", "#e11d48", "#1e293b"];
const STICKY_COLORS = [
  { bg: "#fef08a", label: "Yellow" },
  { bg: "#fbcfe8", label: "Pink" },
  { bg: "#bbf7d0", label: "Green" },
  { bg: "#bfdbfe", label: "Blue" },
  { bg: "#fed7aa", label: "Orange" },
  { bg: "#e9d5ff", label: "Purple" },
];

export function CollaborativeWhiteboard({
  whiteboardId,
  sessionId,
  participantId,
  teamId,
  readOnly = false,
  initialSceneData,
  onSubmitted,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<"pen" | "rect" | "circle" | "eraser" | "sticky">("pen");
  const [color, setColor] = useState("#4f46e5");
  const [stickyColor, setStickyColor] = useState("#fef08a");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<WhiteboardElement | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debouncedSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Parse initial scene data
  useEffect(() => {
    if (initialSceneData) {
      try {
        const parsed = JSON.parse(initialSceneData);
        if (Array.isArray(parsed.elements)) {
          setElements(parsed.elements);
        }
      } catch (e) {
        console.error("Failed to parse initial whiteboard sceneData", e);
      }
    }
  }, [initialSceneData]);

  // Connect to whiteboard socket room
  useEffect(() => {
    const socket = getSocket();
    socket.emit("whiteboard:join", { whiteboardId });

    socket.on(
      "whiteboard:scene_updated",
      ({ elements: incomingElements }: { elements: WhiteboardElement[] }) => {
        if (Array.isArray(incomingElements)) {
          setElements(incomingElements);
        }
      }
    );

    return () => {
      socket.emit("whiteboard:leave", { whiteboardId });
      socket.off("whiteboard:scene_updated");
    };
  }, [whiteboardId]);

  // Redraw canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allElements = currentElement ? [...elements, currentElement] : elements;

    for (const el of allElements) {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.type === "draw" && el.points && el.points.length > 0) {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (
        el.type === "rect" &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (
        el.type === "circle" &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        const radiusX = Math.abs(el.w / 2);
        const radiusY = Math.abs(el.h / 2);
        const centerX = el.x + el.w / 2;
        const centerY = el.y + el.h / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === "sticky" && el.x !== undefined && el.y !== undefined) {
        const sw = el.w || 140;
        const sh = el.h || 110;

        ctx.save();
        ctx.fillStyle = el.color || "#fef08a";
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        const r = 8;
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(el.x, el.y, sw, sh, r);
        } else {
          ctx.rect(el.x, el.y, sw, sh);
        }
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Render sticky note text on canvas
        if (el.text) {
          ctx.fillStyle = "#1e293b";
          ctx.font = "12px sans-serif";
          ctx.textBaseline = "top";
          const lines = el.text.split("\n");
          let currY = el.y + 12;
          for (const line of lines) {
            ctx.fillText(line, el.x + 10, currY, sw - 20);
            currY += 16;
            if (currY > el.y + sh - 14) break;
          }
        }
      }
    }
  }, [elements, currentElement]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Debounced auto-save to PostgreSQL
  const triggerDebouncedSave = (newElements: WhiteboardElement[]) => {
    if (readOnly) return;
    if (debouncedSaveTimer.current) clearTimeout(debouncedSaveTimer.current);

    debouncedSaveTimer.current = setTimeout(async () => {
      try {
        const sceneData = JSON.stringify({ elements: newElements, appState: {} });
        await fetch(`/api/whiteboards/${whiteboardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", sceneData, actorId: participantId }),
        });
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2500);
  };

  // Drawing event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly || isSubmitted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === "sticky") {
      const sw = 140;
      const sh = 110;
      const newSticky: WhiteboardElement = {
        id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: "sticky",
        color: stickyColor,
        width: 1,
        x: Math.max(0, Math.min(canvas.width - sw, x - sw / 2)),
        y: Math.max(0, Math.min(canvas.height - sh, y - sh / 2)),
        w: sw,
        h: sh,
        text: "New note",
      };

      const updated = [...elements, newSticky];
      setElements(updated);

      const socket = getSocket();
      socket.emit("whiteboard:draw", {
        whiteboardId,
        elements: updated,
        appState: {},
      });

      triggerDebouncedSave(updated);
      return;
    }

    setIsDrawing(true);

    if (tool === "pen" || tool === "eraser") {
      setCurrentElement({
        id: `el-${Date.now()}`,
        type: "draw",
        color: tool === "eraser" ? "#ffffff" : color,
        width: tool === "eraser" ? 20 : strokeWidth,
        points: [{ x, y }],
      });
    } else if (tool === "rect") {
      setCurrentElement({
        id: `el-${Date.now()}`,
        type: "rect",
        color,
        width: strokeWidth,
        x,
        y,
        w: 0,
        h: 0,
      });
    } else if (tool === "circle") {
      setCurrentElement({
        id: `el-${Date.now()}`,
        type: "circle",
        color,
        width: strokeWidth,
        x,
        y,
        w: 0,
        h: 0,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentElement.type === "draw") {
      setCurrentElement({
        ...currentElement,
        points: [...(currentElement.points || []), { x, y }],
      });
    } else if (currentElement.type === "rect" || currentElement.type === "circle") {
      const startX = currentElement.x || 0;
      const startY = currentElement.y || 0;
      setCurrentElement({
        ...currentElement,
        w: x - startX,
        h: y - startY,
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentElement) return;
    setIsDrawing(false);

    const updated = [...elements, currentElement];
    setElements(updated);
    setCurrentElement(null);

    // Broadcast element to room
    const socket = getSocket();
    socket.emit("whiteboard:draw", {
      whiteboardId,
      elements: updated,
      appState: {},
    });

    triggerDebouncedSave(updated);
  };

  // Sticky Note handlers: drag, text edit, delete, color change
  const handleStickyDragStart = (id: string, e: React.MouseEvent) => {
    if (readOnly || isSubmitted) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const el = elements.find((item) => item.id === id);
    if (!el || el.x === undefined || el.y === undefined) return;

    const initialMouseX = (e.clientX - rect.left) * scaleX;
    const initialMouseY = (e.clientY - rect.top) * scaleY;
    const offsetX = initialMouseX - el.x;
    const offsetY = initialMouseY - el.y;

    let latestElements = elements;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentRect = canvas.getBoundingClientRect();
      const currentScaleX = canvas.width / currentRect.width;
      const currentScaleY = canvas.height / currentRect.height;
      const mouseX = (moveEvent.clientX - currentRect.left) * currentScaleX;
      const mouseY = (moveEvent.clientY - currentRect.top) * currentScaleY;

      const newX = Math.max(0, Math.min(canvas.width - (el.w || 140), mouseX - offsetX));
      const newY = Math.max(0, Math.min(canvas.height - (el.h || 110), mouseY - offsetY));

      setElements((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, x: newX, y: newY } : item));
        latestElements = next;
        return next;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      const socket = getSocket();
      socket.emit("whiteboard:draw", {
        whiteboardId,
        elements: latestElements,
        appState: {},
      });
      triggerDebouncedSave(latestElements);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleStickyTextChange = (id: string, text: string) => {
    if (readOnly || isSubmitted) return;
    const updated = elements.map((item) => (item.id === id ? { ...item, text } : item));
    setElements(updated);

    const socket = getSocket();
    socket.emit("whiteboard:draw", {
      whiteboardId,
      elements: updated,
      appState: {},
    });
    triggerDebouncedSave(updated);
  };

  const handleDeleteSticky = (id: string) => {
    if (readOnly || isSubmitted) return;
    const updated = elements.filter((item) => item.id !== id);
    setElements(updated);

    const socket = getSocket();
    socket.emit("whiteboard:draw", {
      whiteboardId,
      elements: updated,
      appState: {},
    });
    triggerDebouncedSave(updated);
  };

  const handleClear = () => {
    if (readOnly || isSubmitted) return;
    setElements([]);
    const socket = getSocket();
    socket.emit("whiteboard:draw", {
      whiteboardId,
      elements: [],
      appState: {},
    });
    triggerDebouncedSave([]);
  };

  const handleSubmit = async () => {
    if (readOnly || isSubmitted || submitting) return;
    setSubmitting(true);
    try {
      const sceneData = JSON.stringify({ elements, appState: {} });
      const res = await fetch(`/api/whiteboards/${whiteboardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          sceneData,
          actorId: participantId,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
        const socket = getSocket();
        socket.emit("whiteboard:submitted", {
          sessionId,
          whiteboardId,
          teamId,
          participantId,
        });
        if (onSubmitted) onSubmitted();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Whiteboard Toolbar */}
      {!readOnly && !isSubmitted && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTool("pen")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tool === "pen" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Pen"
            >
              <Pen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool("rect")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tool === "rect" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Rectangle"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool("circle")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tool === "circle" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Circle"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool("sticky")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tool === "sticky" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Add Sticky Note / Post-it"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Post-It</span>
            </button>
            <button
              onClick={() => setTool("eraser")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tool === "eraser" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color palette: adapts based on whether Sticky Note or Drawing tool is active */}
          {tool === "sticky" ? (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 px-1">Note Color:</span>
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.bg}
                  onClick={() => setStickyColor(c.bg)}
                  style={{ backgroundColor: c.bg }}
                  title={c.label}
                  className={`w-6 h-6 rounded-lg border-2 shadow-sm transition ${
                    stickyColor === c.bg ? "border-slate-800 scale-110" : "border-black/10 hover:scale-105"
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    color === c ? "border-slate-800 scale-110" : "border-transparent hover:scale-105"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Stroke Width (only when not sticky note) */}
          {tool !== "sticky" && (
            <div className="flex items-center gap-1">
              {[2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`px-2 py-1 text-xs rounded-lg border font-mono ${
                    strokeWidth === w
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition"
              title="Clear Whiteboard"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || elements.length === 0}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Submitting..." : "Submit Board"}
            </button>
          </div>
        </div>
      )}

      {/* Submitted status banner */}
      {isSubmitted && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Whiteboard submitted to facilitator!
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold">Locked</span>
        </div>
      )}

      {/* Canvas Area with Interactive Sticky Note Overlay */}
      <div
        ref={containerRef}
        className="relative bg-white flex items-center justify-center p-2 overflow-hidden select-none"
      >
        <div className="relative w-full" style={{ height: "450px" }}>
          <canvas
            ref={canvasRef}
            width={700}
            height={450}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`border border-slate-100 rounded-xl touch-none w-full h-full ${
              readOnly || isSubmitted
                ? "cursor-default"
                : tool === "sticky"
                ? "cursor-copy"
                : "cursor-crosshair"
            }`}
          />

          {/* Interactive DOM Overlays for Sticky Notes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {elements
              .filter((el) => el.type === "sticky")
              .map((el) => {
                const sw = el.w || 140;
                const sh = el.h || 110;
                const leftPct = ((el.x || 0) / 700) * 100;
                const topPct = ((el.y || 0) / 450) * 100;

                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${(sw / 700) * 100}%`,
                      minWidth: "120px",
                      height: `${(sh / 450) * 100}%`,
                      minHeight: "95px",
                      backgroundColor: el.color || "#fef08a",
                    }}
                    className="absolute pointer-events-auto rounded-xl shadow-md border border-black/10 flex flex-col overflow-hidden transition-shadow hover:shadow-lg select-none"
                  >
                    {/* Header with Drag Handle & Delete */}
                    <div
                      onMouseDown={(e) => handleStickyDragStart(el.id, e)}
                      className={`h-6 px-2 flex items-center justify-between bg-black/5 ${
                        readOnly || isSubmitted ? "" : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30" />
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30" />
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30" />
                      </div>
                      {!readOnly && !isSubmitted && (
                        <button
                          onClick={() => handleDeleteSticky(el.id)}
                          className="text-black/40 hover:text-red-600 text-xs font-bold leading-none px-1 transition"
                          title="Delete note"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Text Area */}
                    <textarea
                      disabled={readOnly || isSubmitted}
                      value={el.text || ""}
                      onChange={(e) => handleStickyTextChange(el.id, e.target.value)}
                      placeholder="Type note..."
                      className="w-full flex-1 p-2.5 bg-transparent text-slate-800 text-xs font-medium placeholder:text-black/30 resize-none focus:outline-none"
                    />
                  </div>
                );
              })}
          </div>
        </div>

        {lastSaved && !readOnly && !isSubmitted && (
          <div className="absolute bottom-4 right-4 bg-slate-800/70 text-white text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none">
            Saved {lastSaved}
          </div>
        )}
      </div>
    </div>
  );
}

