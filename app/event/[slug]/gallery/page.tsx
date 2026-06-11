"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { getEventBySlug } from "@/lib/events";
import { getApprovedMedia } from "@/lib/media";
import { getGuestLikes } from "@/lib/likes";
import { loadGuestSession } from "@/lib/guests";
import { supabase } from "@/lib/supabase/client";
import type { PublicEvent, Media, GalleryFilter } from "@/types";
import MediaGrid from "@/components/MediaGrid";
import { usePresence } from "@/hooks/usePresence";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Download, Lock, X, Users, MessageCircle } from "lucide-react";
import { cn, getAdminSessionKey } from "@/lib/utils";
import { isEventLockedForGuests, GUEST_LOCK_HOURS } from "@/lib/eventExpiry";
import ChatModal from "@/components/ChatModal";
import GroupChatModal from "@/components/GroupChatModal";
import GuestNameModal from "@/components/GuestNameModal";
import BottomNav from "@/components/BottomNav";

// Fallback polling — Realtime handles instant updates; polling catches edge cases
const POLL_INTERVAL = 60_000;

export default function GalleryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<GalleryFilter>("newest");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [adminEventId, setAdminEventId] = useState<string | null>(null);
  const [adminBypass, setAdminBypass] = useState(false);
  const [adminGuestId, setAdminGuestId] = useState<string | null>(null);
  const [allGuests, setAllGuests] = useState<{ id: string; nickname: string; avatar: string | null }[]>([]);
  const [localNickname, setLocalNickname] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<{ id: string; nickname: string; avatar: string | null } | null>(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const showGroupChatRef = useRef(false);
  useEffect(() => { showGroupChatRef.current = showGroupChat; }, [showGroupChat]);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Votes
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [myVotedMediaId, setMyVotedMediaId] = useState<string | null>(null);

  // Download all
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelDownloadRef = useRef(false);

  // Prevent hydration mismatch: localStorage is only available client-side.
  // Both server and client start with mounted=false → render <FullPageSpinner>,
  // then after mount the real session is read.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const guestSession = mounted ? loadGuestSession(slug) : null;

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();

  // Realtime presence
  const { onlineUsers } = usePresence({
    eventId: event?.id ?? "",
    guestId: guestSession?.guestId ?? "",
    nickname: guestSession?.nickname ?? "",
    avatar: guestSession?.avatar ?? null,
    enabled: !!event && !!guestSession,
  });

  useEffect(() => {
    if (searchParams.get("reconnected") === "1") {
      toast("ברוך השב! התחברת מחדש לפרופיל שלך 👋", { duration: 3000 });
      router.replace(`/event/${slug}/gallery`);
    }
  }, [searchParams, slug, router]);

  // Check auth — only after mounted so we know the real session value
  useEffect(() => {
    if (!mounted) return;
    if (guestSession) return;
    // Allow admin access via URL token
    const urlToken = searchParams.get("adminToken");
    if (urlToken) {
      setAdminBypass(true);
      return;
    }
    // Allow access if user has any admin token in localStorage (verified later in loadData)
    if (typeof window !== "undefined" &&
      Object.keys(localStorage).some(k => k.startsWith("partydrop_admin_"))) {
      setAdminBypass(true);
      return;
    }
    router.replace(`/event/${slug}`);
  }, [mounted, guestSession, slug, router, searchParams]);

  // Load votes
  const loadVotes = useCallback(async (eventId: string) => {
    if (!guestSession?.guestId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/votes?guestId=${guestSession.guestId}`);
      if (!res.ok) return;
      const { votes, myVotedMediaId: myVote } = await res.json();
      setVoteCounts(votes ?? {});
      setMyVotedMediaId(myVote ?? null);
    } catch { /* silent */ }
  }, [guestSession?.guestId]);

  // Load event + media
  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const ev = await getEventBySlug(slug);
        if (!ev) { setNotFound(true); return; }
        setEvent(ev);

        // Verify admin token
        const storedToken = typeof window !== "undefined"
          ? localStorage.getItem(getAdminSessionKey(ev.id))
          : null;
        if (storedToken) {
          const verifyRes = await fetch("/api/admin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: ev.id, token: storedToken }),
          });
          const { valid } = await verifyRes.json();
          if (valid) {
            setAdminEventId(ev.id);
            // Restore cached admin guest ID (written by admin page)
            const cachedAdminGuestId = localStorage.getItem(`partydrop_admin_guest_${ev.id}`);
            if (cachedAdminGuestId) {
              setAdminGuestId(cachedAdminGuestId);
            } else {
              // Not cached yet — fetch from API
              try {
                const gRes = await fetch("/api/guests/admin-guest", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ eventId: ev.id, adminToken: storedToken }),
                });
                if (gRes.ok) {
                  const { guestId } = await gRes.json();
                  setAdminGuestId(guestId);
                  localStorage.setItem(`partydrop_admin_guest_${ev.id}`, guestId);
                }
              } catch { /* silent */ }
            }
          } else { localStorage.removeItem(getAdminSessionKey(ev.id)); setAdminEventId(null); }
        } else {
          setAdminEventId(null);
        }

        const urlToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("adminToken") : null;

        // For admin bypass: get-or-create an admin guest so uploads + likes work
        let resolvedAdminGuestId: string | null = null;
        if (urlToken && !guestSession) {
          try {
            const gRes = await fetch("/api/guests/admin-guest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId: ev.id, adminToken: urlToken }),
            });
            if (gRes.ok) {
              const { guestId } = await gRes.json();
              resolvedAdminGuestId = guestId;
              setAdminGuestId(guestId);
            }
          } catch { /* silent */ }
        }

        // Fallback: read cached admin guest ID from localStorage (written by admin page)
        // This covers the case where admin navigates to gallery without a URL token
        if (!resolvedAdminGuestId && !guestSession) {
          const cachedGuestId = typeof window !== "undefined"
            ? localStorage.getItem(`partydrop_admin_guest_${ev.id}`)
            : null;
          if (cachedGuestId) {
            resolvedAdminGuestId = cachedGuestId;
            setAdminGuestId(cachedGuestId);
          }
        }

        const effectiveGuestId = guestSession?.guestId ?? resolvedAdminGuestId;

        const [mediaData, likes] = await Promise.all([
          urlToken
            ? import("@/lib/media").then(m => m.getAllMediaForAdmin(ev.id))
            : getApprovedMedia(ev.id, filter, filter === "by_user" ? guestSession?.guestId : undefined),
          effectiveGuestId
            ? getGuestLikes(ev.id, effectiveGuestId)
            : Promise.resolve(new Set<string>()),
        ]);

        setMedia(mediaData);
        setLikedIds(likes);
        await loadVotes(ev.id);

        // Load all guests for participants list
        try {
          const gRes = await fetch(`/api/guests?eventId=${ev.id}`);
          if (gRes.ok) { const { guests } = await gRes.json(); setAllGuests(guests ?? []); }
        } catch { /* silent */ }
      } catch (err) {
        console.error("Gallery load error:", err);
      } finally {
        setLoading(false);
      }
    },
    [slug, filter, guestSession?.guestId, loadVotes]
  );

  useEffect(() => {
    loadData();
    pollingRef.current = setInterval(() => loadData(false), POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadData]);

  // Realtime: instant updates when new media is approved for this event
  // Requires Supabase Realtime enabled on the `media` table (Supabase dashboard → Database → Replication)
  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`gallery-media-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "media",
          filter: `event_id=eq.${event.id}`,
        },
        async (payload) => {
          // Only show approved media (or pending in private mode)
          const row = payload.new as { id: string; status: string; event_id: string };
          if (row.status !== "approved") return;

          // Fetch full record with guest join
          try {
            const { data } = await supabase
              .from("media")
              .select("*, guest:guests(id, nickname, avatar)")
              .eq("id", row.id)
              .single();
            if (data) {
              setMedia((prev) => {
                if (prev.some((m) => m.id === data.id)) return prev; // dedup
                return [data, ...prev];
              });
            }
          } catch { /* silent — polling will catch it */ }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event?.id]);

  // Derive effective guest id for group-unread computation (mirrors effectiveMe logic below)
  const effectiveMeId = ((adminEventId || adminBypass) && adminGuestId)
    ? adminGuestId
    : guestSession?.guestId ?? null;

  // Group chat unread badge: check messages newer than last-read timestamp
  const checkGroupUnread = useCallback(async () => {
    if (!event?.id) return;
    const lastReadStr = typeof window !== "undefined"
      ? localStorage.getItem(`clink_group_chat_last_read_${event.id}`)
      : null;
    const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
    try {
      const res = await fetch(`/api/messages?eventId=${event.id}&group=1`);
      if (!res.ok) return;
      const { messages: groupMsgs } = await res.json() as { messages: { created_at: string; sender_id: string }[] };
      const unread = groupMsgs.filter(
        (m) => new Date(m.created_at).getTime() > lastRead && m.sender_id !== (effectiveMeId ?? "")
      ).length;
      setGroupUnreadCount(unread);
    } catch { /* silent */ }
  }, [event?.id, effectiveMeId]);

  useEffect(() => {
    checkGroupUnread();
  }, [checkGroupUnread]);

  // Poll every 8 seconds for new group messages (reliable fallback)
  useEffect(() => {
    if (!event?.id) return;
    const interval = setInterval(() => {
      if (!showGroupChatRef.current) checkGroupUnread();
    }, 8000);
    return () => clearInterval(interval);
  }, [event?.id, checkGroupUnread]);

  // Realtime badge updates (instant when realtime is working)
  const effectiveMeIdRef = useRef<string | null>(null);
  useEffect(() => { effectiveMeIdRef.current = effectiveMeId; }, [effectiveMeId]);

  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`group-badge-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          const msg = payload.new as { receiver_id: string | null; sender_id: string; created_at: string };
          if (msg.receiver_id !== null) return;
          if (msg.sender_id === effectiveMeIdRef.current) return;
          if (!showGroupChatRef.current) {
            setGroupUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event?.id]);

  const handleMediaUploaded = (newMedia: Media) => {
    if (event?.require_approval) return;
    setMedia((prev) => [newMedia, ...prev]);
  };

  const handleLikeCountChange = (mediaId: string, newCount: number) => {
    setMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, likes_count: newCount } : m)));
  };

  const handleVoteChange = (mediaId: string, delta: number, isNowVoted: boolean) => {
    setVoteCounts((prev) => {
      const next = { ...prev };
      next[mediaId] = Math.max(0, (next[mediaId] ?? 0) + delta);
      return next;
    });
    // If voting for a new photo, remove vote from previous
    if (isNowVoted) {
      if (myVotedMediaId && myVotedMediaId !== mediaId) {
        setVoteCounts((prev) => {
          const next = { ...prev };
          next[myVotedMediaId] = Math.max(0, (next[myVotedMediaId] ?? 0) - 1);
          return next;
        });
      }
      setMyVotedMediaId(mediaId);
    } else {
      setMyVotedMediaId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (media.length === 0) { toast.error("אין מדיה להורדה"); return; }
    if (!confirm(`להוריד ${media.length} תמונות וסרטונים כקובץ ZIP אחד?`)) return;
    cancelDownloadRef.current = false;
    setDownloadingAll(true);
    setDownloadAllProgress({ done: 0, total: media.length });
    const toastId = toast.loading(`מכין ZIP — 0/${media.length}`);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let cancelled = false;
      for (let i = 0; i < media.length; i++) {
        if (cancelDownloadRef.current) { cancelled = true; break; }
        const item = media[i];
        const ext = item.file_url.split(".").pop()?.split("?")[0] ?? (item.media_type === "video" ? "mp4" : "jpg");
        const nickname = (item.guest?.nickname || "guest").replace(/[^a-zA-Z0-9֐-׿_-]/g, "_");
        const filename = `${String(i + 1).padStart(3, "0")}_${nickname}.${ext}`;
        try {
          const res = await fetch(item.file_url);
          if (res.ok) zip.file(filename, await res.blob());
        } catch { /* skip */ }
        setDownloadAllProgress({ done: i + 1, total: media.length });
        toast.loading(`מוריד ${i + 1}/${media.length}...`, { id: toastId });
      }
      if (cancelled) {
        toast("ההורדה בוטלה", { id: toastId, icon: "🚫" });
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event!.name.replace(/[^a-zA-Z0-9֐-׿_-]/g, "_")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${media.length} קבצים הורדו 🎉`, { id: toastId });
    } catch {
      toast.error("שגיאה בהורדה", { id: toastId });
    } finally {
      setDownloadingAll(false);
      setDownloadAllProgress(null);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    const toastId = toast.loading("מוחק...");
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guestSession?.guestId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || "שגיאה במחיקה", { id: toastId });
        return;
      }
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      toast.success("התמונה נמחקה", { id: toastId });
    } catch {
      toast.error("שגיאת רשת", { id: toastId });
    }
  };

  const handleLeave = () => {
    if (!confirm("האם ברצונך לצאת מהאירוע?")) return;
    if (typeof window !== "undefined") {
      localStorage.removeItem(`partydrop_guest_${slug}`);
      if (event?.id) localStorage.removeItem(getAdminSessionKey(event.id));
    }
    router.push(`/event/${slug}?noRedirect=1`);
  };

  // Not yet mounted (SSR) or loading → consistent placeholder between server & client
  if (!mounted || loading) return <FullPageSpinner />;
  // No guest session and not admin bypass → redirect (handled by useEffect above)
  if (!guestSession && !adminBypass) return <FullPageSpinner />;
  if (notFound) return <div className="min-h-screen bg-wedding-bg flex items-center justify-center"><p className="text-wedding-muted">אירוע לא נמצא</p></div>;
  if (!event) return <FullPageSpinner />;

  // Guests can't access after 48h — admins are exempt
  if (isEventLockedForGuests(event.created_at, event.guest_lock_hours ?? GUEST_LOCK_HOURS) && !adminEventId) {
    return (
      <div className="min-h-screen bg-wedding-bg flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="p-5 rounded-full bg-wedding-accent/5 border border-wedding-border mb-2">
          <Lock className="h-10 w-10 text-wedding-muted" />
        </div>
        <h1 className="text-2xl font-bold text-wedding-ink">הגלריה נסגרה</h1>
        <p className="text-wedding-muted max-w-xs leading-relaxed">
          הגישה לאורחים ניתנת רק במשך {GUEST_LOCK_HOURS} שעות מתחילת האירוע.<br />
          ניתן להוריד תמונות רק מפאנל הניהול.
        </p>
        <Link href="/" className="mt-4 px-6 py-2.5 rounded-2xl border border-wedding-border hover:bg-wedding-accent/10 text-wedding-ink text-sm transition-all">
          חזרה לדף הבית
        </Link>
      </div>
    );
  }

  const isPrivate = event.privacy_mode === "private";
  const isAdminMode = !!(adminEventId || adminBypass);

  // When user is both guest and admin, admin identity takes precedence for chat/notifications
  const effectiveMe = isAdminMode && adminGuestId
    ? { id: adminGuestId, nickname: "מנהל האירוע", avatar: "👑" as string | null }
    : guestSession
    ? { id: guestSession.guestId, nickname: guestSession.nickname, avatar: guestSession.avatar ?? null }
    : null;

  return (
    <div className="min-h-screen bg-wedding-bg pb-24 relative">
      {/* Cover image background */}
      {event.cover_image_url && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src={event.cover_image_url}
            alt=""
            fill
            className="object-cover opacity-50 blur-sm scale-110"
            priority
          />
          <div className="absolute inset-0 bg-wedding-bg/60" />
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-30 bg-wedding-bg/95 backdrop-blur-md border-b border-wedding-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col items-center gap-0.5">
          <Image src="/clink-logo-transparent.png" alt="Clink" width={72} height={28} className="object-contain" />
          <p className="text-xs text-wedding-muted truncate max-w-[240px]">{event.name}</p>
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Participants list (replaces PresenceBar) */}
        {(guestSession || adminGuestId) && allGuests.length > 0 && (() => {
          const onlineIds = new Set(onlineUsers.map(u => u.guestId));
          const onlineCount = allGuests.filter(g => onlineIds.has(g.id)).length;
          const sorted = [...allGuests].sort((a, b) => {
            const aOnline = onlineIds.has(a.id) ? 0 : 1;
            const bOnline = onlineIds.has(b.id) ? 0 : 1;
            return aOnline - bOnline;
          });
          return (
            <div className="wedding-card border border-wedding-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowParticipants(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-wedding-muted hover:text-wedding-ink transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-wedding-muted" />
                  <span>כל המשתתפים ({allGuests.length})</span>
                  {onlineCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                      {onlineCount} אורחים מחוברים כרגע
                    </span>
                  )}
                </div>
                <span className="text-wedding-muted text-xs">{showParticipants ? "▲" : "▼"}</span>
              </button>
              {showParticipants && (
                <div className="border-t border-wedding-border divide-y divide-wedding-border/50 max-h-64 overflow-y-auto" dir="rtl">
                  {sorted.map(g => {
                    const isOnline = onlineIds.has(g.id);
                    const isMe = g.id === effectiveMe?.id;
                    const isAdminGuest = g.nickname === "מנהל האירוע";
                    const canChat = !isMe && (isAdminMode ? true : !isAdminGuest);
                    return (
                      <div key={g.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-wedding-accent/10 flex items-center justify-center text-base overflow-hidden">
                              {g.avatar?.startsWith("http") ? (
                                <Image src={g.avatar} alt={g.nickname} width={32} height={32} className="w-full h-full object-cover" />
                              ) : (
                                <span>{g.avatar || "👤"}</span>
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-wedding-card animate-pulse" />
                            )}
                          </div>
                          <span className={cn("text-sm", isMe ? "text-wedding-accent-dark font-medium" : "text-wedding-ink")}>
                            {g.nickname}{isMe && <span className="text-xs text-wedding-accent mr-1">(אתה)</span>}
                          </span>
                        </div>
                        {canChat && (
                          <button
                            onClick={() => setChatWith(g)}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-wedding-accent-light/10 hover:bg-wedding-accent/20 text-wedding-accent-dark text-xs transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            צ׳אט
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Private mode notice */}
        {isPrivate && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-amber-300 text-sm">🔒 אירוע פרטי — רק בעל האירוע יכול לצפות בגלריה</p>
          </div>
        )}

        {/* Uploads closed */}
        {!event.uploads_open && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
            <p className="text-red-300 text-sm">⛔️ העלאות לאירוע זה נסגרו</p>
          </div>
        )}

        {/* Download all */}
        {!isPrivate && media.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={downloadingAll ? () => { cancelDownloadRef.current = true; } : handleDownloadAll}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 border text-sm font-medium rounded-2xl transition-all",
                downloadingAll
                  ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-500"
                  : "wedding-card border-wedding-border hover:border-wedding-accent/40 hover:bg-wedding-accent/5 text-wedding-muted hover:text-wedding-ink"
              )}
            >
              {downloadingAll ? (
                <><X className="h-4 w-4" />ביטול הורדה ({downloadAllProgress ? `${downloadAllProgress.done}/${downloadAllProgress.total}` : "..."})</>
              ) : (
                <><Download className="h-4 w-4" />הורד את כל התמונות והסרטונים ({media.length})</>
              )}
            </button>
            {downloadingAll && downloadAllProgress && (
              <div className="h-1 bg-wedding-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-wedding-accent-light to-wedding-accent transition-all duration-300 rounded-full" style={{ width: `${(downloadAllProgress.done / downloadAllProgress.total) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        {(!isPrivate || adminBypass) && (
          <MediaGrid
            media={media}
            guestId={guestSession?.guestId ?? adminGuestId ?? ""}
            eventId={event.id}
            eventName={event.name}
            likedIds={likedIds}
            onLikeCountChange={handleLikeCountChange}
            filter={filter}
            onFilterChange={setFilter}
            showFilterByUser={true}
            onDelete={handleDeleteMedia}
            voteCounts={voteCounts}
            myVotedMediaId={myVotedMediaId}
            onVoteChange={handleVoteChange}
          />
        )}
      </div>



      {/* Guest registration modal — for admin entering as guest */}
      {showGuestModal && event && (
        <GuestNameModal
          open={showGuestModal}
          eventName={event.name}
          eventSlug={slug}
          onClose={() => setShowGuestModal(false)}
          onSubmit={async (nickname, avatar, pin) => {
            const res = await fetch("/api/guests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event_id: event.id, nickname, avatar, pin }),
            });
            if (!res.ok) {
              const { error, code } = await res.json();
              const e = new Error(error) as Error & { code?: string };
              if (code) e.code = code;
              throw e;
            }
            const { guest } = await res.json();
            if (typeof window !== "undefined") {
              localStorage.setItem(`partydrop_guest_${slug}`, JSON.stringify({ guestId: guest.id, nickname: guest.nickname, avatar: guest.avatar }));
            }
            setShowGuestModal(false);
            router.replace(`/event/${slug}/gallery`);
          }}
        />
      )}

      {/* Chat Modal */}
      {chatWith && effectiveMe && (
        <ChatModal
          eventId={event.id}
          me={effectiveMe}
          other={chatWith}
          onClose={() => setChatWith(null)}
        />
      )}

      {/* Group Chat Modal */}
      {showGroupChat && effectiveMe && (
        <GroupChatModal
          eventId={event.id}
          me={effectiveMe}
          guests={allGuests}
          onClose={() => {
            setShowGroupChat(false);
            setGroupUnreadCount(0);
            if (typeof window !== "undefined") {
              localStorage.setItem(`clink_group_chat_last_read_${event.id}`, Date.now().toString());
            }
          }}
        />
      )}

      {/* Bottom nav */}
      {event && (
        <BottomNav
          slug={slug}
          event={event}
          guestId={guestSession?.guestId ?? adminGuestId ?? null}
          guestNickname={localNickname ?? guestSession?.nickname ?? null}
          guestAvatar={localAvatar ?? guestSession?.avatar ?? null}
          adminEventId={adminEventId}
          adminBypass={adminBypass}
          groupUnreadCount={groupUnreadCount}
          onGroupChatOpen={() => {
            setShowGroupChat(true);
            setGroupUnreadCount(0);
            if (typeof window !== "undefined") {
              localStorage.setItem(`clink_group_chat_last_read_${event.id}`, Date.now().toString());
            }
          }}
          onUploaded={handleMediaUploaded}
          onLeave={handleLeave}
          onGuestUpdated={(nickname, avatar) => {
            setLocalNickname(nickname);
            setLocalAvatar(avatar);
          }}
          activeTab="home"
        />
      )}
    </div>
  );
}
