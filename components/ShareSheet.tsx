"use client";

import { useState } from "react";
import { Share2, MessageCircle, Instagram, Link2, X, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Media } from "@/types";

interface ShareSheetProps {
  media: Media;
  eventName: string;
  onClose: () => void;
}

export default function ShareSheet({ media, eventName, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareText = `תמונה מהאירוע: ${eventName} 🎉`;
  const imageUrl = media.file_url;

  // WhatsApp share
  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + imageUrl)}`;
    window.open(url, "_blank");
  };

  // Native Web Share API (Instagram, Messages, etc.)
  const shareNative = async () => {
    if (!navigator.share) return;
    setSharing(true);
    try {
      // Try to fetch and share as file (works on mobile for Instagram)
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const ext = media.media_type === "video" ? "mp4" : "jpg";
        const file = new File([blob], `picme-${media.id}.${ext}`, { type: blob.type });

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText });
          onClose();
          return;
        }
      } catch {
        // fallback to URL share
      }

      // URL share fallback
      await navigator.share({ text: shareText, url: imageUrl });
      onClose();
    } catch {
      // User cancelled — ignore
    } finally {
      setSharing(false);
    }
  };

  // Copy link
  const copyLink = async () => {
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download
  const download = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `picme-${media.id}.${media.media_type === "video" ? "mp4" : "jpg"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm wedding-card border border-wedding-border rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-wedding-ink text-lg">שתף תמונה</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-wedding-accent/10 text-wedding-muted hover:text-wedding-ink transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp */}
          <button
            onClick={shareWhatsApp}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-sm text-wedding-ink font-medium">וואטסאפ</span>
          </button>

          {/* Instagram / Native Share */}
          {hasNativeShare ? (
            <button
              onClick={shareNative}
              disabled={sharing}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-wedding-accent/10 to-amber-500/10 border border-wedding-accent/20 hover:from-wedding-accent/20 hover:to-amber-500/20 transition-all"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-wedding-accent to-amber-500 flex items-center justify-center">
                <Instagram className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-wedding-ink font-medium">
                {sharing ? "שולח..." : "שתף"}
              </span>
            </button>
          ) : (
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-wedding-accent/10 border border-wedding-accent/20 hover:bg-wedding-accent/20 transition-all"
            >
              <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", copied ? "bg-emerald-500" : "bg-wedding-accent")}>
                {copied ? <Check className="h-5 w-5 text-white" /> : <Link2 className="h-5 w-5 text-white" />}
              </div>
              <span className="text-sm text-wedding-ink font-medium">{copied ? "הועתק!" : "העתק קישור"}</span>
            </button>
          )}

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-wedding-bg border border-wedding-border hover:bg-wedding-accent/10 transition-all"
          >
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", copied ? "bg-emerald-500" : "bg-wedding-accent/15")}>
              {copied ? <Check className="h-5 w-5 text-white" /> : <Link2 className="h-5 w-5 text-wedding-accent-dark" />}
            </div>
            <span className="text-sm text-wedding-ink font-medium">{copied ? "הועתק!" : "העתק קישור"}</span>
          </button>

          {/* Download */}
          <button
            onClick={download}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-wedding-bg border border-wedding-border hover:bg-wedding-accent/10 transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-wedding-accent/15 flex items-center justify-center">
              <Download className="h-5 w-5 text-wedding-accent-dark" />
            </div>
            <span className="text-sm text-wedding-ink font-medium">הורד</span>
          </button>
        </div>

        <p className="text-xs text-wedding-muted text-center">
          {hasNativeShare ? 'לחץ "שתף" כדי לפתוח את אינסטגרם, הודעות ועוד' : ""}
        </p>
      </div>
    </div>
  );
}
