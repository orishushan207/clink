"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  nickname: string;
  avatar: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ChatModalProps {
  eventId: string;
  me: Participant;
  other: Participant;
  onClose: () => void;
}

export default function ChatModal({ eventId, me, other, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(
      `/api/messages?eventId=${eventId}&guestId=${me.id}&otherId=${other.id}`
    );
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, [eventId, me.id, other.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${me.id}-${other.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          const relevant =
            (msg.sender_id === me.id && msg.receiver_id === other.id) ||
            (msg.sender_id === other.id && msg.receiver_id === me.id);
          if (relevant) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, me.id, other.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, senderId: me.id, receiverId: other.id, content }),
      });
    } finally {
      setSending(false);
    }
  };

  const AvatarEl = ({ p }: { p: Participant }) =>
    p.avatar?.startsWith("http") ? (
      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
        <Image src={p.avatar} alt={p.nickname} width={28} height={28} className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className="w-7 h-7 rounded-full bg-wedding-accent/10 flex items-center justify-center flex-shrink-0 text-base">
        {p.avatar || "👤"}
      </div>
    );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-wedding-bg" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-wedding-border wedding-card/80 backdrop-blur-md flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-wedding-accent/10 text-wedding-muted transition-all">
          <X className="h-5 w-5" />
        </button>
        <AvatarEl p={other} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-wedding-ink truncate">{other.nickname}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-wedding-muted text-sm">התחל שיחה עם {other.nickname}</div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === me.id;
          return (
            <div key={msg.id} className={cn("flex gap-2 items-end", isMine ? "flex-row-reverse" : "flex-row")}>
              {!isMine && <AvatarEl p={other} />}
              <div
                className={cn(
                  "max-w-[75%] px-3 py-2 rounded-2xl text-sm",
                  isMine
                    ? "bg-wedding-accent text-white rounded-br-sm"
                    : "wedding-card border border-wedding-border text-wedding-ink rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-wedding-border wedding-card/80 backdrop-blur-md">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={`הודעה ל${other.nickname}...`}
            className="flex-1 bg-wedding-bg border border-wedding-border rounded-2xl px-4 py-2.5 text-sm text-wedding-ink placeholder-wedding-muted focus:outline-none focus:border-wedding-accent transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="p-2.5 bg-wedding-accent hover:bg-wedding-accent-dark disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-white transition-all"
          >
            <Send className="h-4 w-4 scale-x-[-1]" />
          </button>
        </div>
      </div>
    </div>
  );
}
