"use client";

// NOTE: Before using group chat, run in Supabase SQL editor:
// ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

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
  receiver_id: string | null;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface GroupChatModalProps {
  eventId: string;
  me: Participant;
  guests: Participant[];
  onClose: () => void;
}

function localReadKey(eventId: string) {
  return `clink_group_chat_last_read_${eventId}`;
}

export default function GroupChatModal({ eventId, me, guests, onClose }: GroupChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build a lookup map from guest id → participant info
  const guestMap = new Map<string, Participant>(guests.map((g) => [g.id, g]));

  const getSender = (senderId: string): Participant => {
    if (senderId === me.id) return me;
    return guestMap.get(senderId) ?? { id: senderId, nickname: "אורח", avatar: null };
  };

  const markRead = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(localReadKey(eventId), Date.now().toString());
    }
  }, [eventId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?eventId=${eventId}&group=1`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
    markRead();
  }, [eventId, markRead]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription for group messages
  useEffect(() => {
    const channel = supabase
      .channel(`group-chat-${eventId}`)
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
          // Only pick up group messages (receiver_id is null)
          if (msg.receiver_id !== null) return;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          markRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, markRead]);

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
        body: JSON.stringify({ eventId, senderId: me.id, receiverId: null, content }),
      });
    } finally {
      setSending(false);
    }
  };

  const AvatarEl = ({ p, size = 28 }: { p: Participant; size?: number }) =>
    p.avatar?.startsWith("http") ? (
      <div
        className="rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={p.avatar}
          alt={p.nickname}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      </div>
    ) : (
      <div
        className="rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-base"
        style={{ width: size, height: size }}
      >
        {p.avatar || "👤"}
      </div>
    );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-party-bg" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-party-border bg-party-surface/80 backdrop-blur-md flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">צ׳אט קבוצתי 💬</p>
          <p className="text-xs text-gray-500">{guests.length} משתתפים</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-sm">
            אין הודעות עדיין — היה הראשון לכתוב!
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === me.id;
          const sender = getSender(msg.sender_id);
          return (
            <div
              key={msg.id}
              className={cn("flex gap-2 items-end", isMine ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar shown for all (left side for others, right side could be skipped for self) */}
              {!isMine && <AvatarEl p={sender} size={28} />}
              <div className={cn("flex flex-col max-w-[75%]", isMine ? "items-end" : "items-start")}>
                {/* Sender name shown above bubble for messages from others */}
                {!isMine && (
                  <span className="text-xs text-gray-500 mb-0.5 px-1">{sender.nickname}</span>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm",
                    isMine
                      ? "bg-party-gold text-white rounded-br-sm"
                      : "bg-party-surface border border-party-border text-white rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-party-border bg-party-surface/80 backdrop-blur-md">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="הודעה לכולם..."
            className="flex-1 bg-party-bg border border-party-border rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="p-2.5 bg-party-gold hover:bg-party-gold-light disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-white transition-all"
          >
            <Send className="h-4 w-4 scale-x-[-1]" />
          </button>
        </div>
      </div>
    </div>
  );
}
