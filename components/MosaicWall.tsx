"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, RefreshCw, Loader2, Grid3x3, X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { saveMosaic } from "@/lib/media";
import type { Event, Media } from "@/types";
import { cn } from "@/lib/utils";

interface MosaicWallProps {
  event: Event | { id: string; name: string; slug: string };
  isAdmin: boolean;
  adminToken?: string;
}

type GridSize = "50x50" | "80x80" | "80x120";

async function getAverageColor(src: string): Promise<[number, number, number]> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      resolve([r, g, b]);
    };
    img.onerror = () => resolve([128, 128, 128]);
    img.src = src;
  });
}

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const GRID_OPTIONS: { value: GridSize; cols: number; rows: number; label: string }[] = [
  { value: "50x50",  cols: 50,  rows: 50,  label: "50×50" },
  { value: "80x80",  cols: 80,  rows: 80,  label: "80×80" },
  { value: "80x120", cols: 80,  rows: 120, label: "80×120" },
];

export default function MosaicWall({ event, isAdmin, adminToken }: MosaicWallProps) {
  const router = useRouter();
  const [media, setMedia] = useState<Media[]>([]);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>("50x50");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load approved images + previously saved mosaic
  const loadMedia = useCallback(async () => {
    const { data } = await supabase
      .from("media")
      .select("id, file_url, media_type, guest_id, created_at, status, event_id, likes_count, thumbnail_url, caption")
      .eq("event_id", event.id)
      .eq("status", "approved")
      .neq("media_type", "video");
    if (data) {
      setMedia(data as Media[]);
      setPhotoCount(data.length);
    }
  }, [event.id]);

  useEffect(() => {
    // Load media + check for existing saved mosaic
    loadMedia();
    supabase
      .from("events")
      .select("mosaic_url")
      .eq("id", event.id)
      .single()
      .then(({ data }) => {
        if (data?.mosaic_url) {
          setResultUrl(data.mosaic_url);
          setShowControls(true);
        }
      });
  }, [loadMedia, event.id]);

  // Auto-hide controls after 4s of inactivity when mosaic is showing
  useEffect(() => {
    if (!resultUrl) return;
    const t = setTimeout(() => setShowControls(false), 4000);
    return () => clearTimeout(t);
  }, [resultUrl, showControls]);

  const generate = useCallback(async () => {
    if (!targetUrl || media.length === 0) return;
    setGenerating(true);
    setProgress(0);
    setResultUrl(null);
    setShowControls(true);

    try {
      const tileSize = 28;
      const opt = GRID_OPTIONS.find(o => o.value === gridSize)!;
      const cols = opt.cols;
      const rows = opt.rows;
      const outW = cols * tileSize;
      const outH = rows * tileSize;

      setProgressLabel("טוען תמונת יעד...");
      const targetImg = await loadImage(targetUrl);
      const samplerCanvas = document.createElement("canvas");
      samplerCanvas.width = cols;
      samplerCanvas.height = rows;
      const sCtx = samplerCanvas.getContext("2d")!;
      sCtx.drawImage(targetImg, 0, 0, cols, rows);

      const targetColors: [number, number, number][] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const d = sCtx.getImageData(x, y, 1, 1).data;
          targetColors.push([d[0], d[1], d[2]]);
        }
      }

      setProgressLabel("מנתח תמונות אורחים...");
      const tileColors: { url: string; color: [number, number, number] }[] = [];
      for (let i = 0; i < media.length; i++) {
        const color = await getAverageColor(media[i].file_url);
        tileColors.push({ url: media[i].file_url, color });
        setProgress(Math.round((i / media.length) * 30));
      }

      setProgressLabel("בונה פסיפס...");
      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const oCtx = outCanvas.getContext("2d")!;

      const total = rows * cols;
      for (let idx = 0; idx < total; idx++) {
        const x = idx % cols;
        const y = Math.floor(idx / cols);
        const targetColor = targetColors[idx];

        let bestUrl = tileColors[0].url;
        let bestDist = Infinity;
        for (const tile of tileColors) {
          const dist = colorDistance(targetColor, tile.color);
          if (dist < bestDist) {
            bestDist = dist;
            bestUrl = tile.url;
          }
        }

        try {
          const img = await loadImage(bestUrl);
          oCtx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
        } catch {
          oCtx.fillStyle = `rgb(${targetColor[0]},${targetColor[1]},${targetColor[2]})`;
          oCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }

        oCtx.globalAlpha = 0.25;
        oCtx.fillStyle = `rgb(${targetColor[0]},${targetColor[1]},${targetColor[2]})`;
        oCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        oCtx.globalAlpha = 1;

        if (idx % 20 === 0) {
          setProgress(30 + Math.round((idx / total) * 68));
          setProgressLabel(`בונה פסיפס... ${Math.round((idx / total) * 100)}%`);
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setProgress(100);
      setProgressLabel("שומר...");
      const dataUrl = outCanvas.toDataURL("image/jpeg", 0.92);
      setResultUrl(dataUrl);
      if (adminToken) {
        try {
          await saveMosaic(dataUrl, event.id, adminToken);
        } catch (e) {
          console.error("Save mosaic error", e);
        }
      }
      setProgressLabel("מוכן! 🎉");
    } catch (err) {
      console.error("Mosaic error", err);
      setProgressLabel("שגיאה ביצירת הפסיפס");
    } finally {
      setGenerating(false);
    }
  }, [targetUrl, media, gridSize]);

  // ── Setup screen (no mosaic yet) ──
  if (!resultUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 p-8" dir="rtl">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Grid3x3 className="h-8 w-8 text-purple-400" />
          <div>
            <h1 className="text-white text-2xl font-black">Clink פסיפס</h1>
            <p className="text-gray-500 text-sm">{event.name}</p>
          </div>
        </div>

        {generating ? (
          <div className="w-full max-w-sm space-y-4 text-center">
            <Loader2 className="h-10 w-10 text-purple-400 animate-spin mx-auto" />
            <p className="text-gray-300 text-sm">{progressLabel}</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-purple-400 font-bold">{progress}%</p>
            <p className="text-gray-600 text-xs">{photoCount} תמונות אורחים</p>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            {/* Target image upload */}
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                targetUrl
                  ? "border-purple-500/50 bg-purple-500/5"
                  : "border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setTargetUrl(URL.createObjectURL(f));
                }}
              />
              {targetUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={targetUrl} alt="target" className="w-28 h-28 object-cover rounded-xl border border-purple-500/30 mx-auto" />
                  <p className="text-purple-300 text-sm font-medium">תמונת יעד נבחרה ✓</p>
                  <button
                    className="text-xs text-gray-600 hover:text-white flex items-center gap-1 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setTargetUrl(null); }}
                  >
                    <X className="h-3 w-3" /> החלף
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-600" />
                  <p className="text-gray-400 text-sm">בחרו תמונת יעד להקרנה</p>
                  <p className="text-gray-700 text-xs">הפסיפס ייבנה סביבה</p>
                </div>
              )}
            </div>

            {/* Grid size */}
            <div className="flex gap-2 justify-center">
              {GRID_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGridSize(opt.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                    gridSize === opt.value
                      ? "bg-purple-600/30 border-purple-500/60 text-purple-300"
                      : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="text-center text-gray-600 text-xs">{photoCount} תמונות אורחים זמינות</p>

            <button
              onClick={generate}
              disabled={!targetUrl || media.length === 0}
              className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-lg transition-all shadow-lg shadow-purple-500/30 active:scale-95"
            >
              🎨 צור פסיפס
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Projection screen ──
  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center cursor-none"
      onMouseMove={() => setShowControls(true)}
      onClick={() => setShowControls(v => !v)}
    >
      {/* Mosaic image — fills screen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resultUrl}
        alt="Clink פסיפס"
        className="w-full h-full object-contain"
      />

      {/* Event name watermark */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
        <Grid3x3 className="h-4 w-4 text-purple-400" />
        <span className="text-white/70 text-sm font-semibold">Clink פסיפס · {event.name}</span>
      </div>

      {/* Controls overlay — appears on mouse move */}
      {showControls && (
        <div className="absolute top-4 right-4 flex items-center gap-2 animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); loadMedia().then(generate); }}
            disabled={generating}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 hover:border-purple-500/40 text-white text-xs font-medium px-3 py-2 rounded-xl transition-all"
          >
            {generating
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            {generating ? `${progress}%` : "רענן עם תמונות חדשות"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setResultUrl(null); setShowControls(true); }}
            className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-white text-xs font-medium px-3 py-2 rounded-xl transition-all"
          >
            <X className="h-3.5 w-3.5" />
            התחל מחדש
          </button>
        </div>
      )}
    </div>
  );
}
