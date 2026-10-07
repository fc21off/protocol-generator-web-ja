import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Download,
  CloudUpload,
  X,
  FileCheck,
  PenTool,
  Eraser,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Check,
  Loader2,
  FileText,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";

// Set PDF.js worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBase64: string | null;
  onDownload: (signedBase64?: string) => void;
  onExportDocx?: () => void;
  onUpload: (signedBase64?: string) => void;
  isSaving: boolean;
  compilerUsed: string;
}

type ToolMode = "view" | "pen" | "eraser";

interface NormalizedPoint {
  nx: number;
  ny: number;
}

interface Stroke {
  points: NormalizedPoint[];
  color: string;
  widthRatio: number;
  isEraser?: boolean;
}

const PEN_COLORS = [
  { id: "blue", hex: "#1d4ed8", label: "Dokumentenblau" },
  { id: "black", hex: "#09090b", label: "Schwarz" },
  { id: "purple", hex: "#4a227a", label: "JA-Violett" },
  { id: "red", hex: "#dc2626", label: "Rot" },
];

const STROKE_WIDTHS = [
  { id: "thin", value: 1.8, label: "Fein" },
  { id: "normal", value: 3.2, label: "Mittel" },
  { id: "thick", value: 5.5, label: "Breit" },
];

// High-precision smooth stroke renderer on any canvas
const renderStrokesToCanvas = (
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number
) => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    const baseWidth = stroke.widthRatio * canvasWidth;
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = baseWidth * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = baseWidth;
    }

    const first = stroke.points[0];
    const firstX = first.nx * canvasWidth;
    const firstY = first.ny * canvasHeight;

    if (stroke.points.length === 1) {
      ctx.arc(
        firstX,
        firstY,
        (stroke.isEraser ? baseWidth * 2 : baseWidth) / 2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else if (stroke.points.length === 2) {
      const second = stroke.points[1];
      ctx.moveTo(firstX, firstY);
      ctx.lineTo(second.nx * canvasWidth, second.ny * canvasHeight);
      ctx.stroke();
    } else {
      ctx.moveTo(firstX, firstY);
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const p1x = p1.nx * canvasWidth;
        const p1y = p1.ny * canvasHeight;
        const p2x = p2.nx * canvasWidth;
        const p2y = p2.ny * canvasHeight;
        const midX = (p1x + p2x) / 2;
        const midY = (p1y + p2y) / 2;
        ctx.quadraticCurveTo(p1x, p1y, midX, midY);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.nx * canvasWidth, last.ny * canvasHeight);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
};

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfBase64,
  onDownload,
  onExportDocx,
  onUpload,
  isSaving,
  compilerUsed,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      return Math.max(0.45, Math.min(0.85, (window.innerWidth - 32) / 595));
    }
    return 1.15;
  });
  const [toolMode, setToolMode] = useState<ToolMode>("view");
  const [penColor, setPenColor] = useState<string>("#1d4ed8");
  const [strokeWidth, setStrokeWidth] = useState<number>(3.2);
  const [pageStrokes, setPageStrokes] = useState<Record<number, Stroke[]>>({});
  const [isProcessingSave, setIsProcessingSave] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const pageCanvasesRef = useRef<Record<number, HTMLCanvasElement | null>>({});
  const drawingCanvasesRef = useRef<Record<number, HTMLCanvasElement | null>>({});
  const currentStrokeRef = useRef<{ pageNum: number; stroke: Stroke } | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Active touch pointers for 2-finger pan & pinch zoom in drawing mode
  const activeTouchesRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const isTwoFingerGestureRef = useRef<boolean>(false);
  const lastGestureStateRef = useRef<{ midX: number; midY: number; dist: number } | null>(null);

  // Touch pointers for 2-finger pan & pinch zoom in view mode
  const containerTouchesRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    startZoom: number;
    startScrollLeft: number;
    startScrollTop: number;
    midX: number;
    midY: number;
  } | null>(null);

  // Mouse / single-finger drag-to-pan in view mode
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  // Container drag-to-pan & pinch-to-zoom handlers (active in "view" mode)
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode !== "view") return;
    if ((e.target as HTMLElement).closest("button, input, select")) return;

    if (e.pointerType === "touch") {
      containerTouchesRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (containerTouchesRef.current.size >= 2) {
        // Two fingers detected! Start pinch zoom and pan
        isPanningRef.current = false;
        const touches = Array.from(containerTouchesRef.current.values());
        const t1 = touches[0];
        const t2 = touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        pinchStartRef.current = {
          dist: Math.max(dist, 1),
          startZoom: zoomScale,
          startScrollLeft: containerRef.current?.scrollLeft || 0,
          startScrollTop: containerRef.current?.scrollTop || 0,
          midX,
          midY,
        };
        return;
      }
    }

    // Single touch or mouse dragging
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current?.scrollLeft || 0,
      scrollTop: containerRef.current?.scrollTop || 0,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode !== "view") return;

    if (e.pointerType === "touch" && containerTouchesRef.current.has(e.pointerId)) {
      containerTouchesRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (containerTouchesRef.current.size >= 2) {
        const touches = Array.from(containerTouchesRef.current.values());
        const t1 = touches[0];
        const t2 = touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentMidX = (t1.clientX + t2.clientX) / 2;
        const currentMidY = (t1.clientY + t2.clientY) / 2;

        if (pinchStartRef.current && containerRef.current) {
          // Pinch to zoom
          const scaleFactor = currentDist / pinchStartRef.current.dist;
          const newZoom = Math.max(0.4, Math.min(2.5, pinchStartRef.current.startZoom * scaleFactor));
          setZoomScale(Number(newZoom.toFixed(2)));

          // Two-finger pan
          const deltaX = currentMidX - pinchStartRef.current.midX;
          const deltaY = currentMidY - pinchStartRef.current.midY;
          containerRef.current.scrollLeft = pinchStartRef.current.startScrollLeft - deltaX;
          containerRef.current.scrollTop = pinchStartRef.current.startScrollTop - deltaY;
        }
        return;
      }
    }

    // Single touch or mouse move
    if (!isPanningRef.current || !containerRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleContainerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      containerTouchesRef.current.delete(e.pointerId);
      if (containerTouchesRef.current.size < 2) {
        pinchStartRef.current = null;
      }
      if (containerTouchesRef.current.size === 1) {
        // Re-anchor single touch pan so there's no jump
        const remaining = Array.from(containerTouchesRef.current.values())[0];
        if (containerRef.current) {
          panStartRef.current = {
            x: remaining.clientX,
            y: remaining.clientY,
            scrollLeft: containerRef.current.scrollLeft,
            scrollTop: containerRef.current.scrollTop,
          };
          isPanningRef.current = true;
        }
      } else if (containerTouchesRef.current.size === 0) {
        isPanningRef.current = false;
      }
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Fit page width to current container
  const handleFitWidth = useCallback(() => {
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const targetPadding = window.innerWidth < 640 ? 24 : 48;
      const fitScale = Math.max(0.4, Math.min(2.0, (containerW - targetPadding) / 595));
      setZoomScale(Number(fitScale.toFixed(2)));
    } else {
      setZoomScale(1.0);
    }
  }, []);

  // Auto fit width when PDF finishes loading on mobile
  useEffect(() => {
    if (!isLoadingPdf && numPages > 0) {
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        handleFitWidth();
      }
    }
  }, [isLoadingPdf, numPages, handleFitWidth]);

  // Load PDF Document when pdfBase64 changes
  useEffect(() => {
    if (!isOpen || !pdfBase64) return;

    let isMounted = true;
    setIsLoadingPdf(true);
    setPageStrokes({});

    const loadDocument = async () => {
      try {
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const loadingTask = pdfjsLib.getDocument({ data: byteArray });
        const doc = await loadingTask.promise;

        if (isMounted) {
          pdfDocRef.current = doc;
          setNumPages(doc.numPages);
          setIsLoadingPdf(false);
        }
      } catch (err) {
        console.error("Fehler beim Laden des PDFs in PDF.js:", err);
        if (isMounted) {
          setIsLoadingPdf(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfBase64]);

  // Redraw strokes on a specific drawing canvas
  const redrawPageStrokes = useCallback(
    (pageNum: number, strokes: Stroke[]) => {
      const canvas = drawingCanvasesRef.current[pageNum];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderStrokesToCanvas(ctx, strokes, canvas.width, canvas.height);
    },
    []
  );

  // 1. Render PDF pages onto PDF canvases (only when PDF loads or zoom changes)
  useEffect(() => {
    if (!pdfDocRef.current || numPages === 0 || isLoadingPdf) return;

    let isCancelled = false;

    const renderPages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (isCancelled) break;
        try {
          const page = await pdfDocRef.current.getPage(pageNum);
          const pdfCanvas = pageCanvasesRef.current[pageNum];
          const drawCanvas = drawingCanvasesRef.current[pageNum];

          if (!pdfCanvas || !drawCanvas) continue;

          const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale: zoomScale * pixelRatio });

          // Set internal canvas resolution (High DPI)
          pdfCanvas.width = viewport.width;
          pdfCanvas.height = viewport.height;
          drawCanvas.width = viewport.width;
          drawCanvas.height = viewport.height;

          // Set display CSS size
          const cssWidth = `${viewport.width / pixelRatio}px`;
          const cssHeight = `${viewport.height / pixelRatio}px`;
          pdfCanvas.style.width = cssWidth;
          pdfCanvas.style.height = cssHeight;
          drawCanvas.style.width = cssWidth;
          drawCanvas.style.height = cssHeight;

          const ctx = pdfCanvas.getContext("2d");
          if (ctx) {
            const renderContext = {
              canvasContext: ctx,
              viewport: viewport,
            };
            await page.render(renderContext as any).promise;
          }
        } catch (err) {
          console.error(`Fehler beim Rendern von Seite ${pageNum}:`, err);
        }
      }
    };

    renderPages();

    return () => {
      isCancelled = true;
    };
  }, [numPages, zoomScale, isLoadingPdf]);

  // 2. Redraw strokes on drawing canvases (without touching or re-rendering PDF canvases)
  useEffect(() => {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const strokes = pageStrokes[pageNum] || [];
      redrawPageStrokes(pageNum, strokes);
    }
  }, [numPages, zoomScale, pageStrokes, redrawPageStrokes]);

  // Pointer event handlers for drawing
  const getNormalizedPoint = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): NormalizedPoint => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    return {
      nx: Math.max(0, Math.min(1, clientX / rect.width)),
      ny: Math.max(0, Math.min(1, clientY / rect.height)),
    };
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
    pageNum: number
  ) => {
    if (toolMode === "view") return;

    // Multi-touch tracking for 2-finger pan & zoom
    if (e.pointerType === "touch") {
      activeTouchesRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (activeTouchesRef.current.size >= 2) {
        isTwoFingerGestureRef.current = true;

        // If finger 1 started an accidental single-touch dot/stroke, cancel and erase it
        if (isDrawingRef.current && currentStrokeRef.current) {
          const pageToClean = currentStrokeRef.current.pageNum;
          isDrawingRef.current = false;
          currentStrokeRef.current = null;
          redrawPageStrokes(pageToClean, pageStrokes[pageToClean] || []);
        }

        const canvas = drawingCanvasesRef.current[pageNum];
        if (canvas && canvas.hasPointerCapture(e.pointerId)) {
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {}
        }

        const touches = Array.from(activeTouchesRef.current.values());
        const t1 = touches[0];
        const t2 = touches[1];
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        lastGestureStateRef.current = { midX, midY, dist };
        return;
      }
    }

    const canvas = drawingCanvasesRef.current[pageNum];
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    isDrawingRef.current = true;

    const normPt = getNormalizedPoint(e, canvas);
    const isEraser = toolMode === "eraser";

    // Width relative to standard A4 base width (~600pt)
    const widthRatio = strokeWidth / 600;

    const newStroke: Stroke = {
      points: [normPt],
      color: penColor,
      widthRatio,
      isEraser,
    };

    currentStrokeRef.current = { pageNum, stroke: newStroke };

    // Render dot immediately
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const ptX = normPt.nx * canvas.width;
      const ptY = normPt.ny * canvas.height;
      const baseWidth = widthRatio * canvas.width;

      ctx.beginPath();
      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.arc(ptX, ptY, (baseWidth * 4) / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.arc(ptX, ptY, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = penColor;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  };

  const handlePointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
    pageNum: number
  ) => {
    // Multi-touch 2-finger panning and pinch-to-zoom
    if (e.pointerType === "touch" && activeTouchesRef.current.has(e.pointerId)) {
      activeTouchesRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (activeTouchesRef.current.size >= 2 || isTwoFingerGestureRef.current) {
        const touches = Array.from(activeTouchesRef.current.values());
        if (touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;
          const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

          if (lastGestureStateRef.current && containerRef.current) {
            const deltaX = midX - lastGestureStateRef.current.midX;
            const deltaY = midY - lastGestureStateRef.current.midY;

            containerRef.current.scrollLeft -= deltaX;
            containerRef.current.scrollTop -= deltaY;

            if (lastGestureStateRef.current.dist > 15 && dist > 15) {
              const scaleFactor = dist / lastGestureStateRef.current.dist;
              if (Math.abs(scaleFactor - 1) > 0.03) {
                setZoomScale((prev) => {
                  const newScale = Math.max(0.4, Math.min(2.5, prev * scaleFactor));
                  return Number(newScale.toFixed(2));
                });
              }
            }
          }
          lastGestureStateRef.current = { midX, midY, dist };
        }
        return;
      }
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    if (currentStrokeRef.current.pageNum !== pageNum) return;

    const canvas = drawingCanvasesRef.current[pageNum];
    if (!canvas) return;

    const normPt = getNormalizedPoint(e, canvas);
    const stroke = currentStrokeRef.current.stroke;
    stroke.points.push(normPt);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const baseWidth = stroke.widthRatio * canvas.width;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = baseWidth * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = baseWidth;
    }

    const pts = stroke.points;
    if (pts.length >= 2) {
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(p1.nx * canvas.width, p1.ny * canvas.height);
      ctx.lineTo(p2.nx * canvas.width, p2.ny * canvas.height);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
  };

  const handlePointerUp = (
    e: React.PointerEvent<HTMLCanvasElement>,
    pageNum: number
  ) => {
    if (e.pointerType === "touch") {
      activeTouchesRef.current.delete(e.pointerId);
      if (activeTouchesRef.current.size < 2) {
        lastGestureStateRef.current = null;
        if (activeTouchesRef.current.size === 0) {
          isTwoFingerGestureRef.current = false;
        }
      }
      if (isTwoFingerGestureRef.current) {
        return;
      }
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = drawingCanvasesRef.current[pageNum];
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    isDrawingRef.current = false;
    const { stroke } = currentStrokeRef.current;
    currentStrokeRef.current = null;

    setPageStrokes((prev) => {
      const existing = prev[pageNum] || [];
      const updated = [...existing, stroke];
      redrawPageStrokes(pageNum, updated);
      return {
        ...prev,
        [pageNum]: updated,
      };
    });
  };

  const handlePointerCancel = (
    e: React.PointerEvent<HTMLCanvasElement>,
    pageNum: number
  ) => {
    if (e.pointerType === "touch") {
      activeTouchesRef.current.delete(e.pointerId);
      if (activeTouchesRef.current.size === 0) {
        isTwoFingerGestureRef.current = false;
        lastGestureStateRef.current = null;
      }
    }
    if (isDrawingRef.current && currentStrokeRef.current) {
      const canvas = drawingCanvasesRef.current[pageNum];
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
      isDrawingRef.current = false;
      currentStrokeRef.current = null;
      redrawPageStrokes(pageNum, pageStrokes[pageNum] || []);
    }
  };

  // Undo last stroke
  const handleUndo = useCallback(() => {
    let targetPage = -1;
    for (let p = numPages; p >= 1; p--) {
      if (pageStrokes[p] && pageStrokes[p].length > 0) {
        targetPage = p;
        break;
      }
    }
    if (targetPage === -1) return;

    setPageStrokes((prev) => {
      const existing = prev[targetPage] || [];
      const updated = existing.slice(0, -1);
      redrawPageStrokes(targetPage, updated);
      return {
        ...prev,
        [targetPage]: updated,
      };
    });
  }, [numPages, pageStrokes, redrawPageStrokes]);

  // Keyboard shortcut Ctrl+Z for undoing strokes in PDF modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleUndo]);

  // Clear all strokes
  const handleClearAll = () => {
    if (confirm("Möchtest du alle Zeichnungen & Unterschriften auf allen Seiten löschen?")) {
      setPageStrokes({});
      for (let p = 1; p <= numPages; p++) {
        const canvas = drawingCanvasesRef.current[p];
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  };

  const totalStrokesCount = Object.values(pageStrokes).reduce(
    (acc, strokes) => acc + (strokes?.length || 0),
    0
  );

  // Generate ultra high-res 300 DPI PDF with embedded signatures using pdf-lib
  const generateSignedPdfBase64 = async (): Promise<string> => {
    if (!pdfBase64) return "";
    if (totalStrokesCount === 0) return pdfBase64;

    try {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const pdfDoc = await PDFDocument.load(byteArray);
      const pages = pdfDoc.getPages();

      // Render at 300 DPI (exportScale = 4.167 for 72pt to 300dpi)
      const exportScale = 4.167;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const strokes = pageStrokes[pageNum];
        if (strokes && strokes.length > 0 && pageNum <= pages.length) {
          const page = pages[pageNum - 1];
          const pageWidth = page.getWidth();
          const pageHeight = page.getHeight();

          // Create high-res offscreen canvas
          const highResCanvas = document.createElement("canvas");
          highResCanvas.width = Math.round(pageWidth * exportScale);
          highResCanvas.height = Math.round(pageHeight * exportScale);

          const highResCtx = highResCanvas.getContext("2d");
          if (highResCtx) {
            highResCtx.imageSmoothingEnabled = true;
            highResCtx.imageSmoothingQuality = "high";
            renderStrokesToCanvas(
              highResCtx,
              strokes,
              highResCanvas.width,
              highResCanvas.height
            );

            const highResDataUrl = highResCanvas.toDataURL("image/png");
            const pngImage = await pdfDoc.embedPng(highResDataUrl);

            page.drawImage(pngImage, {
              x: 0,
              y: 0,
              width: pageWidth,
              height: pageHeight,
            });
          }
        }
      }

      const savedBytes = await pdfDoc.save();
      let binary = "";
      const len = savedBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(savedBytes[i]);
      }
      return btoa(binary);
    } catch (err) {
      console.error("Fehler beim Zusammenführen der Unterschriften ins PDF:", err);
      return pdfBase64;
    }
  };

  const handleSaveClick = async () => {
    setIsProcessingSave(true);
    try {
      const finalBase64 = await generateSignedPdfBase64();
      onDownload(finalBase64);
    } finally {
      setIsProcessingSave(false);
    }
  };

  const handleUploadClick = async () => {
    setIsProcessingSave(true);
    try {
      const finalBase64 = await generateSignedPdfBase64();
      onUpload(finalBase64);
    } finally {
      setIsProcessingSave(false);
    }
  };

  if (!isOpen || !pdfBase64) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 dark:bg-black/85 backdrop-blur-xs p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-zinc-800">
        {/* Top App Header */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-transparent dark:border-emerald-800/40 shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 sm:gap-2 truncate">
                <span>PDF Protokoll</span>
                {totalStrokesCount > 0 && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold bg-violet-100 dark:bg-violet-950/80 text-[#4A227A] dark:text-violet-300 rounded-full border border-violet-200 dark:border-violet-800/50 shrink-0">
                    Signiert ({totalStrokesCount})
                  </span>
                )}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                {numPages} {numPages === 1 ? "Seite" : "Seiten"} • {compilerUsed}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Download / Save Button */}
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving || isProcessingSave || isLoadingPdf}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#4A227A] to-[#6B3E9E] hover:opacity-95 text-white transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSaving || isProcessingSave ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">PDF Herunterladen</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Export as Word */}
            {onExportDocx && (
              <button
                type="button"
                onClick={onExportDocx}
                title="Als Word-Dokument (.docx) exportieren"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-blue-50/60 dark:hover:bg-zinc-700/80 border border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-500/60 transition-colors shadow-xs group shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" />
                <span className="hidden sm:inline">Als Word (.docx)</span>
                <span className="sm:hidden">Word</span>
              </button>
            )}

            {/* Upload to Server */}
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isSaving || isProcessingSave || isLoadingPdf}
              title="Auf den Server übertragen"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-zinc-800 text-[#4A227A] dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-zinc-700/80 border border-violet-200 dark:border-zinc-700 transition-colors shadow-xs shrink-0"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Auf Server hochladen</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors ml-0.5 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Drawing & Zoom Toolbar */}
        <div className="px-3 sm:px-4 py-2 bg-white dark:bg-zinc-900/95 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 sm:gap-3 text-xs shadow-xs shrink-0 overflow-x-auto no-scrollbar touch-pan-x whitespace-nowrap scroll-smooth">
          {/* Left: Tools (View, Pen, Eraser) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setToolMode("view")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                toolMode === "view"
                  ? "bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
              title="Verschieben & Ansicht: Dokument mit Maus oder Finger frei bewegen"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Verschieben</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode("pen")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                toolMode === "pen"
                  ? "bg-[#4A227A] text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
              title="Stift: Unterschreiben & Markieren"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Unterschreiben</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode("eraser")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                toolMode === "eraser"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
              title="Radiergummi"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Radierer</span>
            </button>

            {/* Separator */}
            <div className="h-4 w-px bg-slate-200 dark:border-zinc-800 mx-1 shrink-0" />

            {/* Color Palette (Active in Pen mode) */}
            {toolMode === "pen" && (
              <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPenColor(c.hex)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      penColor === c.hex
                        ? "ring-2 ring-offset-2 ring-[#4A227A] dark:ring-violet-400 scale-110"
                        : "hover:scale-105 opacity-85 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {penColor === c.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </button>
                ))}

                {/* Stroke Width Selector */}
                <div className="flex items-center gap-1 ml-1.5 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/60 shrink-0">
                  {STROKE_WIDTHS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setStrokeWidth(w.value)}
                      title={w.label}
                      className={`px-2 py-0.5 text-[11px] rounded-md font-medium shrink-0 transition-all ${
                        strokeWidth === w.value
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs font-bold"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Undo & Clear */}
            <div className="flex items-center gap-1 ml-1 shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                disabled={totalStrokesCount === 0}
                className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Letzten Strich rückgängig machen (Strg+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={totalStrokesCount === 0}
                className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Alle Zeichnungen löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Zoom Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
              className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Verkleinern"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 w-11 text-center select-none shrink-0 font-mono">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))))}
              className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Vergrößern"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Auf Bildschirmbreite anpassen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable PDF Pages View Area */}
        <div
          ref={containerRef}
          onPointerDown={handleContainerPointerDown}
          onPointerMove={handleContainerPointerMove}
          onPointerUp={handleContainerPointerUp}
          onPointerCancel={handleContainerPointerUp}
          className={`flex-1 bg-slate-200/70 dark:bg-zinc-950 p-2 sm:p-6 overflow-auto overscroll-contain flex flex-col gap-4 sm:gap-6 ${
            toolMode === "view" ? "cursor-grab active:cursor-grabbing touch-pan-x touch-pan-y" : ""
          }`}
        >
          <div className="flex flex-col items-center gap-4 sm:gap-6 min-w-full w-max m-auto">
            {isLoadingPdf ? (
              <div className="m-auto flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-zinc-400 py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#4A227A] dark:text-violet-400" />
                <p className="text-sm font-medium">Lade PDF Seiten zur Vorschau...</p>
              </div>
            ) : (
              Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  className="relative bg-white shadow-xl rounded-sm border border-slate-300 dark:border-zinc-800 shrink-0 select-none overflow-hidden group min-w-fit"
                >
                  {/* Page Number Badge */}
                  <div className="absolute top-2 right-2 z-20 px-2 py-0.5 text-[10px] font-semibold bg-black/60 text-white rounded-md backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    Seite {pageNum} von {numPages}
                  </div>

                  {/* PDF Render Canvas */}
                  <canvas
                    ref={(el) => {
                      pageCanvasesRef.current[pageNum] = el;
                    }}
                    className="block"
                  />

                  {/* Interactive Drawing Canvas */}
                  <canvas
                    ref={(el) => {
                      drawingCanvasesRef.current[pageNum] = el;
                    }}
                    onPointerDown={(e) => handlePointerDown(e, pageNum)}
                    onPointerMove={(e) => handlePointerMove(e, pageNum)}
                    onPointerUp={(e) => handlePointerUp(e, pageNum)}
                    onPointerCancel={(e) => handlePointerCancel(e, pageNum)}
                    className={`absolute inset-0 z-10 touch-none ${
                      toolMode === "view"
                        ? "cursor-default pointer-events-none"
                        : "cursor-crosshair"
                    }`}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              {toolMode === "pen"
                ? "Stift aktiv: Unterschreibe im PDF. Mit 2 Fingern verschieben & zoomen."
                : toolMode === "eraser"
                ? "Radierer aktiv: Klicke oder ziehe über Striche zum Entfernen."
                : "Verschieben aktiv: Ziehe mit 1 Finger, zoome mit 2 Fingern."}
            </span>
          </div>

          {/* Quick Action Toggle for Mobile */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setToolMode(toolMode === "view" ? "pen" : "view")}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                toolMode === "view"
                  ? "bg-[#4A227A] text-white hover:bg-[#3d1a66]"
                  : "bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-300"
              }`}
            >
              <span>{toolMode === "view" ? "Stift wählen" : "Verschieben"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
