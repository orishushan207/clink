"use client";

import { useState, useEffect } from "react";
import { X, Wand2, RotateCcw, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const AI_STYLES = [
  { id: "disney", label: "דיסני", emoji: "🏰" },
  { id: "anime", label: "אנימה", emoji: "⭐" },
  { id: "oldman", label: "זקן", emoji: "👴" },
  { id: "baby", label: "תינוק", emoji: "👶" },
  { id: "wanted", label: "מבוקש", emoji: "🤠" },
  { id: "superhero", label: "סופרהירו", emoji: "🦸" },
];

interface Props {
  file: File;
  allowVideo: boolean;
  eventId: string;
  onClose: () => void;
  onUpload: (file: File, caption: string) => void;
}

export default function UploadPreviewSheet({ file, eventId, onClose, onUpload }: Props) {
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [transformedFile, setTransformedFile] = useState<File | null>(null);
  const [transforming, setTransforming] = useState(false);
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleTransform = async (styleId: string, overridePrompt?: string) => {
    setTransforming(true);
    setTransformError(null);
    setActiveStyle(styleId);

    try {
      const resizedBlob = await resizeImage(file, 1024);
      const formData = new FormData();
      formData.append("image", resizedBlob, "image.png");
      formData.append("style", styleId);
      formData.append("eventId", eventId);
      if (overridePrompt) formData.append("customPrompt", overridePrompt);

      const res = await fetch("/api/ai/transform", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "שגיאה");
      }

      const { b64 } = await res.json();
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const aiFile = new File([blob], `ai_${styleId}_${baseName}.png`, { type: "image/png" });

      setTransformedFile(aiFile);
      const newUrl = URL.createObjectURL(blob);
      setPreviewUrl((prev) => { URL.revokeObjectURL(prev); return newUrl; });
    } catch (err) {
      setTransformError(err instanceof Error ? err.message : "שגיאה בהמרה");
      setActiveStyle(null);
    } finally {
      setTransforming(false);
    }
  };

  const handleRevert = () => {
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl(originalUrl);
    setTransformedFile(null);
    setActiveStyle(null);
  };

  const handleUpload = () => {
    onUpload(transformedFile ?? file, caption);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-party-surface border border-party-border rounded-t-3xl w-full max-w-lg pb-safe"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 pb-4 border-b border-party-border">
          <h2 className="text-white font-bold text-base">תצוגה מקדימה</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Preview */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-party-surface2">
            {previewUrl && (
              isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <video src={previewUrl} className="w-full h-full object-contain" controls playsInline muted />
              )
            )}
            {transforming && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                <p className="text-white text-sm font-medium">הAI עובד על זה... ✨</p>
              </div>
            )}
            {transformedFile && !transforming && (
              <button
                onClick={handleRevert}
                className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/20 text-white text-xs px-2.5 py-1.5 rounded-xl hover:bg-black/80 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                מקור
              </button>
            )}
          </div>

          {/* AI Styles — images only */}
          {isImage && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-4 w-4 text-yellow-400" />
                <p className="text-sm font-semibold text-white">סגנון AI</p>
                <span className="text-xs text-gray-500">בחר סגנון להמרה</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {AI_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => !transforming && handleTransform(style.id)}
                    disabled={transforming}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-medium transition-all disabled:opacity-50 min-w-[64px]",
                      activeStyle === style.id && transformedFile
                        ? "bg-yellow-400/20 border-yellow-400 text-yellow-300"
                        : "bg-party-surface2 border-party-border text-gray-300 hover:border-party-gold/50 hover:text-white"
                    )}
                  >
                    <span className="text-2xl">{style.emoji}</span>
                    {style.label}
                  </button>
                ))}
              </div>
              {transformError && (
                <p className="text-red-400 text-xs mt-2">{transformError}</p>
              )}

              {/* Free-text prompt */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">או כתוב פרומפט חופשי</p>
                <div className="flex gap-2">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder='לדוגמה: "תראה איך הבן אדם נראה אחרי 10 צ׳ייסרים ברצף 🥴"'
                    className="flex-1 bg-party-bg border border-party-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-party-gold transition-colors resize-none placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => customPrompt.trim() && !transforming && handleTransform("custom", customPrompt.trim())}
                    disabled={!customPrompt.trim() || transforming}
                    className="flex-shrink-0 self-end px-4 py-2.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-sm font-semibold rounded-xl hover:bg-yellow-400/30 transition-all disabled:opacity-40"
                  >
                    צור ✨
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">כיתוב (אופציונלי)</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={120}
              rows={2}
              placeholder="כתוב משהו על התמונה..."
              className="w-full bg-party-bg border border-party-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-party-gold transition-colors resize-none placeholder:text-gray-600"
            />
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={transforming}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-party-gold to-amber-500 text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-party-gold/20"
          >
            <Upload className="h-5 w-5" />
            {transformedFile ? "העלה תמונת AI 🤩" : "העלה"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function resizeImage(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas error")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error("canvas toBlob failed")); },
        "image/png",
        0.9
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
