"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  guests: { nickname: string; avatar: string | null } | null;
}

interface CommentsSheetProps {
  mediaId: string;
  guestId: string;
  eventId: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function CommentsSheet({
  mediaId,
  guestId,
  eventId,
  open,
  onClose,
  onCountChange,
}: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/media/${mediaId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments || []);
        onCountChange?.((d.comments || []).length);
      })
      .finally(() => setLoading(false));
  }, [open, mediaId]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
    }
  }, [open, comments.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");

    try {
      const res = await fetch(`/api/media/${mediaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, event_id: eventId, content: trimmed }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        onCountChange?.(comments.length + 1);
      }
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md wedding-card border border-wedding-border rounded-t-3xl flex flex-col"
        style={{ maxHeight: "75vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wedding-border flex-shrink-0">
          <h3 className="text-wedding-ink font-bold text-base">
            תגובות {comments.length > 0 && <span className="text-wedding-muted font-normal text-sm">({comments.length})</span>}
          </h3>
          <button onClick={onClose} className="text-wedding-muted hover:text-wedding-ink p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {loading ? (
            <p className="text-center text-wedding-muted py-8">טוען...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-wedding-muted py-8">אין תגובות עדיין — היה הראשון!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-wedding-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {c.guests?.avatar?.startsWith("http") ? (
                    <Image src={c.guests.avatar} alt={c.guests.nickname} width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">{c.guests?.avatar || "👤"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-wedding-ink">{c.guests?.nickname || "אורח"}</span>
                    <span className="text-xs text-wedding-muted">{formatRelative(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-wedding-ink/80 mt-0.5 break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-wedding-border flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="כתוב תגובה..."
            maxLength={300}
            className="flex-1 bg-wedding-bg border border-wedding-border rounded-xl px-4 py-2.5 text-sm text-wedding-ink placeholder-wedding-muted focus:outline-none focus:border-wedding-accent/50"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              text.trim()
                ? "bg-wedding-accent hover:bg-wedding-accent-dark text-white active:scale-95"
                : "bg-wedding-bg text-wedding-muted cursor-default"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
