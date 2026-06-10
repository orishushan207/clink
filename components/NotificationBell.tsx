"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Bell, MessageCircle, Heart, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "like" | "message" | "upload" | "comment";
  actor_id: string;
  actor_name: string;
  actor_avatar: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
  media_id: string | null;
  media: { file_url: string; media_type: string } | null;
}

interface NotificationBellProps {
  guestId: string | null;
  eventId: string;
  isAdmin?: boolean;
  onOpenChat?: (actor: { id: string; nickname: string; avatar: string | null }) => void;
  compact?: boolean;
}

const typeIcon = {
  like: <Heart className="h-3.5 w-3.5 text-amber-400" />,
  message: <MessageCircle className="h-3.5 w-3.5 text-yellow-400" />,
  upload: <Upload className="h-3.5 w-3.5 text-green-400" />,
  comment: <MessageCircle className="h-3.5 w-3.5 text-blue-400" />,
};

function timeAgo(iso: string) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "עכשיו";
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שע׳`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export default function NotificationBell({ guestId, eventId, isAdmin, onOpenChat, compact = false }: NotificationBellProps) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read_at).length;

  const load = useCallback(async () => {
    if (!isAdmin && !guestId) return;

    const params = new URLSearchParams({ eventId });
    if (isAdmin) params.set("isAdmin", "true");
    else if (guestId) params.set("guestId", guestId);

    try {
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) return;
      const { notifications } = await res.json();
      setNotifs(notifications ?? []);
    } catch { /* silent */ }
  }, [eventId, guestId, isAdmin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifs-${eventId}-${guestId ?? "admin"}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `event_id=eq.${eventId}`,
      }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, guestId, isAdmin, load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    const unreadIds = notifs.filter(n => !n.read_at).map(n => n.id);
    if (!unreadIds.length) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open && unread > 0) {
      setTimeout(markAllRead, 1500);
    }
  };

  const handleNotifClick = (n: Notification) => {
    if (n.type === "message" && onOpenChat && n.actor_id) {
      onOpenChat({ id: n.actor_id, nickname: n.actor_name, avatar: n.actor_avatar });
      setOpen(false);
    }
  };

  const AvatarEl = ({ name, avatar }: { name: string; avatar: string | null }) =>
    avatar?.startsWith("http") ? (
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <Image src={avatar} alt={name} width={32} height={32} className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-base">
        {avatar || "👤"}
      </div>
    );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className={cn(
          "relative rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all",
          compact ? "p-0" : "p-2"
        )}
      >
        <Bell className={cn(compact ? "h-5 w-5" : "h-4 w-4")} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-party-gold-light text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && compact && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-party-surface border border-party-border rounded-t-3xl shadow-2xl overflow-hidden mb-[64px] safe-bottom"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-party-border">
              <h3 className="text-sm font-bold text-white">התראות</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                    סמן הכל כנקרא
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-500 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-sm">אין התראות עדיין</div>
              ) : (
                notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-party-border/50 transition-colors",
                      !n.read_at ? "bg-party-gold/5" : "hover:bg-white/3",
                      n.type === "message" && onOpenChat ? "cursor-pointer hover:bg-party-gold/10" : ""
                    )}
                  >
                    <div className="relative">
                      <AvatarEl name={n.actor_name} avatar={n.actor_avatar} />
                      <div className="absolute -bottom-0.5 -right-0.5 bg-party-surface rounded-full p-0.5">
                        {typeIcon[n.type]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug">{n.content}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {n.media?.file_url && (n.type === "like" || n.type === "comment") && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                        {n.media.media_type === "video" ? (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center text-lg">🎬</div>
                        ) : (
                          <Image src={n.media.file_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    {!n.read_at && (
                      <div className="w-2 h-2 bg-party-gold-light rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {open && !compact && (
        <div
          className="z-[60] bg-party-surface border border-party-border rounded-2xl shadow-2xl overflow-hidden absolute left-0 top-full mt-2 w-80"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-party-border">
            <h3 className="text-sm font-bold text-white">התראות</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                  סמן הכל כנקרא
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-500 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm">אין התראות עדיין</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-party-border/50 transition-colors",
                    !n.read_at ? "bg-party-gold/5" : "hover:bg-white/3",
                    n.type === "message" && onOpenChat ? "cursor-pointer hover:bg-party-gold/10" : ""
                  )}
                >
                  <div className="relative">
                    <AvatarEl name={n.actor_name} avatar={n.actor_avatar} />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-party-surface rounded-full p-0.5">
                      {typeIcon[n.type]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug">{n.content}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {n.media?.file_url && (n.type === "like" || n.type === "comment") && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                      {n.media.media_type === "video" ? (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center text-lg">🎬</div>
                      ) : (
                        <Image src={n.media.file_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                  {!n.read_at && (
                    <div className="w-2 h-2 bg-party-gold-light rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
