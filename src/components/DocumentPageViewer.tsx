import { useEffect, useRef, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

const transparentImageSurface = {
  backgroundColor: "#ffffff",
};

interface DocumentPageViewerProps {
  images: string[];
  accentColor: string;
  title?: string;
  mode?: "pages" | "gallery";
}

export function DocumentPageViewer({
  images,
  accentColor,
  title,
  mode = "pages",
}: DocumentPageViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const total = images.length;
  const unitLabel = mode === "gallery" ? "Image" : "Page";

  function goToPage(index: number) {
    if (index < 0 || index >= total || index === currentPage) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentPage(index);
      setTimeout(() => {
        setTransitioning(false);
      }, 75);
    }, 75);
  }

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goToPage(currentPage - 1);
      if (e.key === "ArrowRight") goToPage(currentPage + 1);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, total]);

  // Scroll active thumbnail into view
  useEffect(() => {
    thumbRefs.current[currentPage]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [currentPage]);

  const canPrev = currentPage > 0;
  const canNext = currentPage < total - 1;
  const canZoomOut = zoom > 1;
  const canZoomIn = zoom < 3;

  function changeZoom(delta: number) {
    setZoom((value) => Math.min(3, Math.max(1, Number((value + delta).toFixed(2)))));
  }

  function resetZoom() {
    setZoom(1);
  }

  return (
    <div
      style={{ background: "#151515", borderColor: "#333333" }}
      className="rounded-xl border overflow-hidden w-full"
    >
      {/* Header */}
      <div
        className="flex flex-col gap-3 px-4 py-3 border-b sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "#333333" }}
      >
        {title && (
          <span className="text-white text-sm font-semibold truncate max-w-[60%]">
            {title}
          </span>
        )}
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => changeZoom(-0.25)}
            disabled={!canZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="h-8 w-8 rounded border border-[#333333] flex items-center justify-center text-slate-300 disabled:text-slate-600 disabled:opacity-50"
            style={{ background: "#1e1e1e" }}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-[10px] font-bold text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(0.25)}
            disabled={!canZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="h-8 w-8 rounded border border-[#333333] flex items-center justify-center text-slate-300 disabled:text-slate-600 disabled:opacity-50"
            style={{ background: "#1e1e1e" }}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            disabled={zoom === 1}
            title="Reset zoom"
            aria-label="Reset zoom"
            className="h-8 w-8 rounded border border-[#333333] flex items-center justify-center text-slate-300 disabled:text-slate-600 disabled:opacity-50"
            style={{ background: "#1e1e1e" }}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="text-slate-400 text-xs pl-1">
            {unitLabel} {currentPage + 1} of {total}
          </span>
        </div>
      </div>

      {/* Main content area */}
      {/* Desktop: side-by-side thumbnail strip + viewport */}
      {/* Mobile: viewport on top, horizontal strip below */}
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail strip — desktop: vertical left column */}
        <div
          className="hidden md:flex flex-col gap-2 p-2 overflow-y-auto"
          style={{
            width: 96,
            maxHeight: 520,
            background: "#1e1e1e",
            borderRight: "1px solid #333333",
          }}
        >
          {images.map((src, i) => (
            <button
              key={i}
              ref={(el) => { thumbRefs.current[i] = el; }}
              onClick={() => {
                if (i !== currentPage) {
                  setCurrentPage(i);
                }
              }}
              className="flex-shrink-0 rounded overflow-hidden focus:outline-none"
              style={{
                width: 80,
                height: 56,
                ...transparentImageSurface,
                border:
                  i === currentPage
                    ? `2px solid ${accentColor}`
                    : "1px solid #333333",
                transform: i === currentPage ? "scale(1.05)" : "scale(1)",
                opacity: i === currentPage ? 1 : 0.6,
                transition: "transform 150ms ease, opacity 150ms ease",
              }}
            >
              <img
                src={src}
                alt={`Page ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {/* Main viewport */}
        <div
          className="flex-1 flex items-center justify-center overflow-auto"
          style={{ background: "#151515", height: 520 }}
        >
          <img
            src={images[currentPage]}
            alt={`${unitLabel} ${currentPage + 1}`}
            style={{
              ...transparentImageSurface,
              borderRadius: 10,
              boxShadow:
                "0 18px 38px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.12)",
              padding: 8,
              maxHeight: zoom === 1 ? 504 : "none",
              maxWidth: zoom === 1 ? "100%" : "none",
              width: zoom === 1 ? "auto" : `${zoom * 100}%`,
              objectFit: "contain",
              opacity: transitioning ? 0 : 1,
              transition: "opacity 150ms ease, width 150ms ease",
            }}
          />
        </div>
      </div>

      {/* Mobile thumbnail strip — horizontal scroll below viewport */}
      <div
        className="flex md:hidden gap-2 p-2 overflow-x-auto"
        style={{ background: "#1e1e1e", borderTop: "1px solid #333333" }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            ref={(el) => { if (typeof window !== "undefined" && window.innerWidth < 768) thumbRefs.current[i] = el; }}
            onClick={() => {
              if (i !== currentPage) setCurrentPage(i);
            }}
            className="flex-shrink-0 rounded overflow-hidden focus:outline-none"
            style={{
              width: 64,
              height: 44,
              ...transparentImageSurface,
              border:
                i === currentPage
                  ? `2px solid ${accentColor}`
                  : "1px solid #333333",
              transform: i === currentPage ? "scale(1.05)" : "scale(1)",
              opacity: i === currentPage ? 1 : 0.6,
              transition: "transform 150ms ease, opacity 150ms ease",
            }}
          >
            <img
              src={src}
              alt={`Page ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Bottom nav bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: "#333333", background: "#1e1e1e" }}
      >
        {/* Prev */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={!canPrev}
          className="px-4 py-2 border border-[#333333] rounded-lg text-xs font-bold transition-colors"
          style={{
            background: canPrev ? accentColor : "#1e1e1e",
            color: canPrev ? "#fff" : "#555555",
            borderColor: canPrev ? accentColor : "#333333",
            cursor: canPrev ? "pointer" : "not-allowed",
          }}
        >
          ← Prev
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1 flex-wrap justify-center max-w-[50%]">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className="rounded-full transition-all focus:outline-none"
              style={{
                width: i === currentPage ? 8 : 6,
                height: i === currentPage ? 8 : 6,
                background: i === currentPage ? accentColor : "#444444",
                opacity: i === currentPage ? 1 : 0.5,
              }}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={!canNext}
          className="px-4 py-2 border border-[#333333] rounded-lg text-xs font-bold transition-colors"
          style={{
            background: canNext ? accentColor : "#1e1e1e",
            color: canNext ? "#fff" : "#555555",
            borderColor: canNext ? accentColor : "#333333",
            cursor: canNext ? "pointer" : "not-allowed",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
