"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Upload, Download, Loader2, X, RefreshCw, Check } from "lucide-react";
import type { Media } from "@/types";
import { cn } from "@/lib/utils";
import { saveMosaic } from "@/lib/media";
import { supabase } from "@/lib/supabase/client";

interface MosaicCreatorProps {
  media: Media[];
  eventId: string;
  adminToken: string;
}

type GridSize = "50x50" | "80x80" | "80x120";

const GRID_OPTIONS: { value: GridSize; cols: number; rows: number; label: string }[] = [
  { value: "50x50",  cols: 50,  rows: 50,  label: "50×50" },
  { value: "80x80",  cols: 80,  rows: 80,  label: "80×80" },
  { value: "80x120", cols: 80,  rows: 120, label: "80×120" },
];

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

export default function MosaicCreator({ media, eventId, adminToken }: MosaicCreatorProps) {
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>("50x50");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load previously saved mosaic on mount
  useEffect(() => {
    supabase
      .from("events")
      .select("mosaic_url")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data?.mosaic_url) setResultUrl(data.mosaic_url);
      });
  }, [eventId]);

  const imageMedia = media.filter((m) => m.media_type !== "video" && m.file_url);

  const handleTargetSelect = (file: File) => {
    setTargetFile(file);
    setTargetUrl(URL.createObjectURL(file));
    setResultUrl(null);
  };

  const generate = useCallback(async () => {
    if (!targetUrl || imageMedia.length === 0) return;
    setGenerating(true);
    setProgress(0);
    setResultUrl(null);

    try {
      const tileSize = 24;
      const opt = GRID_OPTIONS.find(o => o.value === gridSize)!;
      const cols = opt.cols;
      const rows = opt.rows;
      const outW = cols * tileSize;
      const outH = rows * tileSize;

      // 1. Load target image and sample average color per cell
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

      // 2. Compute average color for each guest photo
      setProgressLabel("מנתח תמונות אורחים...");
      const tileColors: { url: string; color: [number, number, number] }[] = [];
      for (let i = 0; i < imageMedia.length; i++) {
        const color = await getAverageColor(imageMedia[i].file_url);
        tileColors.push({ url: imageMedia[i].file_url, color });
        setProgress(Math.round((i / imageMedia.length) * 30));
      }

      // 3. Build output canvas
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

        // Find closest tile
        let bestUrl = tileColors[0].url;
        let bestDist = Infinity;
        for (const tile of tileColors) {
          const dist = colorDistance(targetColor, tile.color);
          if (dist < bestDist) {
            bestDist = dist;
            bestUrl = tile.url;
          }
        }

        // Draw tile
        try {
          const img = await loadImage(bestUrl);
          oCtx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
        } catch {
          oCtx.fillStyle = `rgb(${targetColor[0]},${targetColor[1]},${targetColor[2]})`;
          oCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }

        // Slight color tint overlay per tile to improve visual match
        oCtx.globalAlpha = 0.25;
        oCtx.fillStyle = `rgb(${targetColor[0]},${targetColor[1]},${targetColor[2]})`;
        oCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        oCtx.globalAlpha = 1;

        if (idx % 20 === 0) {
          setProgress(30 + Math.round((idx / total) * 65));
          setProgressLabel(`בונה פסיפס... ${Math.round((idx / total) * 100)}%`);
          // Yield to browser
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      setProgress(98);
      setProgressLabel("שומר...");
      const dataUrl = outCanvas.toDataURL("image/jpeg", 0.92);
      setResultUrl(dataUrl);

      // Auto-save to Supabase
      setSaving(true);
      setSaved(false);
      try {
        await saveMosaic(dataUrl, eventId, adminToken);
        setSaved(true);
      } catch (e) {
        console.error("Save mosaic error", e);
      } finally {
        setSaving(false);
      }

      setProgress(100);
      setProgressLabel("הפסיפס מוכן! 🎉");
    } catch (err) {
      console.error("Mosaic error", err);
      setProgressLabel("שגיאה ביצירת הפסיפס");
    } finally {
      setGenerating(false);
    }
  }, [targetUrl, imageMedia, gridSize]);

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "mosaic.jpg";
    a.click();
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-party-surface border border-party-border rounded-2xl p-4 space-y-1">
        <h3 className="text-white font-bold text-base">🎨 Clink פסיפס</h3>
        <p className="text-gray-400 text-sm">
          בחר תמונת יעד (למשל: הזוג) ו-{imageMedia.length} תמונות האורחים יסדרו את עצמן כפסיפס שיוצר אותה.
        </p>
        {imageMedia.length < 10 && (
          <p className="text-amber-400 text-xs mt-1">
            ⚠️ מומלץ לפחות 10 תמונות לתוצאה טובה (כרגע: {imageMedia.length})
          </p>
        )}
      </div>

      {/* Target image upload */}
      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
          targetUrl
            ? "border-party-gold/40 bg-party-gold/5"
            : "border-party-border hover:border-party-gold/40 hover:bg-party-gold/5"
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
            if (f) handleTargetSelect(f);
          }}
        />
        {targetUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-party-gold/30">
              <Image src={targetUrl} alt="target" fill className="object-cover" sizes="128px" />
            </div>
            <p className="text-sm text-yellow-400 font-medium">תמונת יעד נבחרה ✓</p>
            <button
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
              onClick={(e) => { e.stopPropagation(); setTargetFile(null); setTargetUrl(null); setResultUrl(null); }}
            >
              <X className="h-3 w-3" /> החלף תמונה
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <Upload className="h-8 w-8 text-gray-500" />
            <p className="text-sm text-gray-400">לחץ לבחירת תמונת יעד</p>
            <p className="text-xs text-gray-600">JPG, PNG — התמונה שהפסיפס יצייר</p>
          </div>
        )}
      </div>

      {/* Grid size selector */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400 font-medium">גודל רשת</p>
        <div className="grid grid-cols-3 gap-2">
          {GRID_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGridSize(opt.value)}
              className={cn(
                "py-2.5 rounded-xl text-sm font-medium border transition-all",
                gridSize === opt.value
                  ? "bg-party-gold/20 border-party-gold/50 text-yellow-300"
                  : "bg-party-surface border-party-border text-gray-400 hover:text-white"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      {targetUrl && !generating && (
        <button
          onClick={generate}
          className="w-full py-3 rounded-2xl btn-gold text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          {resultUrl ? <RefreshCw className="h-4 w-4" /> : <span className="text-base">🎨</span>}
          {resultUrl ? "צור מחדש" : "צור פסיפס"}
        </button>
      )}

      {/* Progress */}
      {generating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {progressLabel}
            </span>
            <span className="text-yellow-400 font-bold">{progress}%</span>
          </div>
          <div className="h-2 bg-party-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-party-gold to-yellow-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {resultUrl && !generating && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-yellow-400">הפסיפס מוכן! 🎉</p>
            {saving && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" /> שומר...
              </span>
            )}
            {saved && !saving && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="h-3 w-3" /> נשמר
              </span>
            )}
          </div>
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-party-gold/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="mosaic result" className="w-full h-full object-contain" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Download className="h-4 w-4" />
            הורד פסיפס
          </button>
        </div>
      )}
    </div>
  );
}
