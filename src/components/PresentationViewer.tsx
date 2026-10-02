"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Lock, Presentation, Download, ExternalLink } from "lucide-react";

export interface UploadedDeckPayload {
  type: "UPLOADED_DECK";
  title?: string;
  files: {
    name: string;
    url: string;
    mimeType: string;
  }[];
}

export function parsePresentationSource(rawUrl?: string | null): {
  kind: "NONE" | "CANVA" | "PDF" | "IMAGE_DECK" | "OFFICE";
  embedUrl: string;
  rawUrl: string;
  files: { name: string; url: string; mimeType: string }[];
  title?: string;
} {
  if (!rawUrl || !rawUrl.trim()) {
    return { kind: "NONE", embedUrl: "", rawUrl: "", files: [] };
  }

  const trimmed = rawUrl.trim();

  // Check if it's our JSON-encoded uploaded deck
  if (trimmed.startsWith("uploaded-deck:")) {
    try {
      const jsonStr = trimmed.slice("uploaded-deck:".length);
      const parsed: UploadedDeckPayload = JSON.parse(jsonStr);
      const files = parsed.files || [];
      if (files.length === 1 && files[0].url.toLowerCase().endsWith(".pdf")) {
        return {
          kind: "PDF",
          embedUrl: files[0].url,
          rawUrl: files[0].url,
          files,
          title: parsed.title || files[0].name,
        };
      }
      if (
        files.length === 1 &&
        /\.(pptx|ppt|key|odp)$/i.test(files[0].url.toLowerCase())
      ) {
        return {
          kind: "OFFICE",
          embedUrl: files[0].url,
          rawUrl: files[0].url,
          files,
          title: parsed.title || files[0].name,
        };
      }
      return {
        kind: "IMAGE_DECK",
        embedUrl: files[0]?.url || "",
        rawUrl: files[0]?.url || "",
        files,
        title: parsed.title || "Uploaded Presentation",
      };
    } catch {
      // Fallback
    }
  }

  if (trimmed.toLowerCase().endsWith(".pdf") || trimmed.toLowerCase().includes(".pdf#")) {
    return {
      kind: "PDF",
      embedUrl: trimmed,
      rawUrl: trimmed,
      files: [{ name: "Presentation.pdf", url: trimmed, mimeType: "application/pdf" }],
    };
  }

  if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(trimmed)) {
    return {
      kind: "IMAGE_DECK",
      embedUrl: trimmed,
      rawUrl: trimmed,
      files: [{ name: "Slide 1", url: trimmed, mimeType: "image/png" }],
    };
  }

  if (/\.(pptx|ppt|key|odp)$/i.test(trimmed)) {
    return {
      kind: "OFFICE",
      embedUrl: trimmed,
      rawUrl: trimmed,
      files: [{ name: "Presentation.pptx", url: trimmed, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }],
    };
  }

  const embedUrl = trimmed.includes("view?embed")
    ? trimmed
    : trimmed.includes("canva.com") && trimmed.includes("/view")
    ? trimmed.replace("/view", "/view?embed")
    : trimmed;

  return {
    kind: "CANVA",
    embedUrl,
    rawUrl: trimmed,
    files: [],
  };
}

export interface PresentationViewerProps {
  presentationUrl?: string | null;
  url?: string | null;
  allowInteractiveNavigation?: boolean;
  isFacilitator?: boolean;
  currentSlide?: number;
  onSlideChange?: (slideNumber: number) => void;
  className?: string;
}

export function PresentationViewer({
  presentationUrl,
  url,
  allowInteractiveNavigation = true,
  isFacilitator = false,
  currentSlide = 1,
  onSlideChange,
  className = "w-full h-full",
}: PresentationViewerProps) {
  const source = parsePresentationSource(presentationUrl || url);
  const [localSlide, setLocalSlide] = useState(currentSlide || 1);

  useEffect(() => {
    if (currentSlide && currentSlide >= 1) {
      setLocalSlide(currentSlide);
    }
  }, [currentSlide]);

  const canNavigate = isFacilitator || allowInteractiveNavigation;

  const handleStepSlide = (nextSlide: number) => {
    if (!canNavigate) return;
    setLocalSlide(nextSlide);
    if (onSlideChange) {
      onSlideChange(nextSlide);
    }
  };

  if (source.kind === "NONE") {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 ${className}`}>
        <Presentation className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-xs">No presentation linked or uploaded.</p>
      </div>
    );
  }

  if (source.kind === "IMAGE_DECK") {
    const totalSlides = Math.max(1, source.files.length);
    const activeIndex = Math.min(Math.max(0, localSlide - 1), totalSlides - 1);
    const activeFile = source.files[activeIndex] || source.files[0];

    return (
      <div className={`relative flex flex-col bg-black select-none overflow-hidden ${className}`}>
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-950">
          {activeFile?.mimeType === "application/pdf" || activeFile?.url.toLowerCase().endsWith(".pdf") ? (
            <iframe
              src={activeFile.url}
              className={`w-full h-full border-0 ${!canNavigate ? "pointer-events-none" : ""}`}
              allowFullScreen
            />
          ) : (
            <img
              src={activeFile?.url}
              alt={activeFile?.name || `Slide ${activeIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {/* Navigation Overlay Controls */}
          {totalSlides > 1 && canNavigate && (
            <>
              <button
                type="button"
                disabled={activeIndex <= 0}
                onClick={() => handleStepSlide(activeIndex)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-white/20 disabled:opacity-30 transition shadow-lg"
                title="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={activeIndex >= totalSlides - 1}
                onClick={() => handleStepSlide(activeIndex + 2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white border border-white/20 disabled:opacity-30 transition shadow-lg"
                title="Next Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Slide Counter Pill */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/85 border border-white/15 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg">
            <span>
              Slide {activeIndex + 1} / {totalSlides}
            </span>
            {!canNavigate && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-sans">
                <Lock className="w-3 h-3" /> Synced to Facilitator
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (source.kind === "OFFICE") {
    return (
      <div className={`relative flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Presentation className="w-8 h-8 text-indigo-400" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">
          {source.title || "Uploaded Presentation Deck"}
        </h4>
        <p className="text-xs text-slate-400 max-w-md mb-5">
          This presentation file ({source.files[0]?.name}) has been uploaded to the session. For live embedded browser slides, PDF or slide images render directly inside the player, or you can download/open this presentation deck below.
        </p>
        <div className="flex items-center gap-3">
          <a
            href={source.rawUrl}
            download
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Presentation</span>
          </a>
          <a
            href={source.rawUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open File</span>
          </a>
        </div>
      </div>
    );
  }

  // Default: CANVA or PDF iframe
  const cleanEmbedUrl = source.embedUrl.split("#")[0];
  const slideHashSuffix =
    source.kind === "PDF"
      ? `#page=${Math.max(1, localSlide)}`
      : source.kind === "CANVA"
      ? `#${Math.max(1, localSlide)}`
      : "";

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      <iframe
        key={`${cleanEmbedUrl}_slide_${localSlide}`}
        src={`${cleanEmbedUrl}${slideHashSuffix}`}
        className={`w-full h-full border-0 ${!canNavigate ? "pointer-events-none select-none" : ""}`}
        allowFullScreen
        allow="fullscreen"
      />

      {/* Facilitator Slide Stepper (Canva & PDF) */}
      {isFacilitator && (source.kind === "CANVA" || source.kind === "PDF") && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/40 text-white text-xs shadow-2xl backdrop-blur-md">
          <button
            type="button"
            disabled={localSlide <= 1}
            onClick={() => handleStepSlide(Math.max(1, localSlide - 1))}
            className="p-1 hover:bg-indigo-600 rounded-full disabled:opacity-30 transition"
            title="Previous Slide (Syncs to Participants)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold px-2 flex items-center gap-1.5">
            <span>Slide {localSlide}</span>
            {!allowInteractiveNavigation && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-semibold border border-emerald-500/30">
                Live Synced
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => handleStepSlide(localSlide + 1)}
            className="p-1 hover:bg-indigo-600 rounded-full transition"
            title="Next Slide (Syncs to Participants)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Participant PDF Page Stepper when Interactive Navigation is ON */}
      {!isFacilitator && source.kind === "PDF" && canNavigate && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-white text-xs shadow-xl">
          <button
            type="button"
            disabled={localSlide <= 1}
            onClick={() => handleStepSlide(Math.max(1, localSlide - 1))}
            className="p-1 hover:bg-slate-800 rounded-full disabled:opacity-40 transition"
            title="Previous PDF Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold px-2">Page {localSlide}</span>
          <button
            type="button"
            onClick={() => handleStepSlide(localSlide + 1)}
            className="p-1 hover:bg-slate-800 rounded-full transition"
            title="Next PDF Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Navigation Disabled Shield for Participants (Synced to Presenter) */}
      {!canNavigate && (
        <div
          className="absolute inset-0 z-10 bg-transparent cursor-default flex items-end justify-center pb-3"
          title="Following Facilitator's Presentation View (Slide Synced)"
        >
          <div className="px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
            <Lock className="w-3 h-3" />
            <span>Following Presenter&apos;s View • Slide {localSlide}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresentationViewer;
