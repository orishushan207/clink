"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getEventStats, type EventStats } from "@/lib/events";
import { getAllMediaForAdmin } from "@/lib/media";
import { getReportsForEvent } from "@/lib/reports";
import { getGuestsByEvent } from "@/lib/guests";
import type { Event, Media, Report, Guest } from "@/types";
import AdminAnalytics from "@/components/AdminAnalytics";
import PicMeLogo from "@/components/PicMeLogo";
import AdminMediaTable from "@/components/AdminMediaTable";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { usePresence } from "@/hooks/usePresence";
import CopyLinkButton from "@/components/CopyLinkButton";
import Button from "@/components/ui/Button";
import { FullPageSpinner } from "@/components/ui/Spinner";
import ClipCreator from "@/components/ClipCreator";
import MosaicCreator from "@/components/MosaicCreator";
import BottomNav from "@/components/BottomNav";
import GroupChatModal from "@/components/GroupChatModal";
import { supabase } from "@/lib/supabase/client";
import {
  Shield,
  AlertTriangle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Download,
  Pencil,
  Camera,
  Trash2,
  Images,
  Trophy,
  Grid3x3,
  Lock,
  Users,
  Globe,
  X,
} from "lucide-react";
import { getEventUrl, formatDate, getAdminSessionKey } from "@/lib/utils";
import { uploadCoverImage } from "@/lib/media";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const eventId = params.eventId;

  // Token from URL or localStorage
  const [adminToken, setAdminToken] = useState<string>("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "media" | "reports" | "guests">("overview");
  const [mosaicOpen, setMosaicOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [adminGuestId, setAdminGuestId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`partydrop_admin_guest_${params.eventId}`) ?? null;
  });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);
  const cancelDownloadRef = useRef(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);
  const showGroupChatRef = useRef(showGroupChat);
  useEffect(() => { showGroupChatRef.current = showGroupChat; }, [showGroupChat]);

  const adminGuestIdRef = useRef<string | null>(null);
  useEffect(() => { adminGuestIdRef.current = adminGuestId; }, [adminGuestId]);

  useEffect(() => {
    if (!event?.id || !adminGuestId) return;
    const channel = supabase
      .channel(`admin-group-badge-${event.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `event_id=eq.${event.id}`,
      }, (payload) => {
        const msg = payload.new as { receiver_id: string | null; sender_id: string };
        if (msg.receiver_id !== null) return;
        if (msg.sender_id === adminGuestIdRef.current) return;
        if (!showGroupChatRef.current) setGroupUnreadCount(c => c + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event?.id]);

  // Poll every 8 seconds as reliable fallback for the unread badge
  useEffect(() => {
    if (!event?.id) return;
    const interval = setInterval(async () => {
      if (showGroupChatRef.current) return;
      try {
        const lastReadStr = localStorage.getItem(`clink_group_chat_last_read_${event.id}`);
        const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
        const res = await fetch(`/api/messages?eventId=${event.id}&group=1`);
        if (!res.ok) return;
        const { messages: msgs } = await res.json() as { messages: { created_at: string; sender_id: string }[] };
        const unread = msgs.filter(
          (m) => new Date(m.created_at).getTime() > lastRead && m.sender_id !== (adminGuestIdRef.current ?? "")
        ).length;
        setGroupUnreadCount(unread);
      } catch { /* silent */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [event?.id]);

  // Admin presence (use a fixed admin guestId so it doesn't pollute guests)
  const { onlineUsers } = usePresence({
    eventId,
    guestId: `admin_${eventId}`,
    nickname: "מנהל",
    avatar: "🛡️",
    enabled: !!event,
  });

  // Get token
  useEffect(() => {
    const urlToken = searchParams.get("token") || "";
    const localToken =
      typeof window !== "undefined"
        ? localStorage.getItem(getAdminSessionKey(eventId)) || ""
        : "";
    const token = urlToken || localToken;

    // Persist URL token to localStorage so gallery page can verify it
    if (urlToken && typeof window !== "undefined") {
      localStorage.setItem(getAdminSessionKey(eventId), urlToken);
    }

    setAdminToken(token);

    if (!token) {
      setTokenValid(false);
      setLoading(false);
    }
  }, [eventId, searchParams]);

  const loadData = useCallback(async () => {
    if (!adminToken) return;
    if (!eventId || eventId === "undefined") {
      setTokenValid(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const evRes = await fetch(`/api/admin/events/${eventId}?token=${encodeURIComponent(adminToken)}`);
      if (!evRes.ok) {
        setTokenValid(false);
        return;
      }
      const { event: ev } = await evRes.json();
      if (!ev || ev.admin_token !== adminToken) {
        setTokenValid(false);
        return;
      }

      setTokenValid(true);
      setEvent(ev);

      const [eventStats, mediaData, reportData, votesRes, guestsData, adminGuestRes] = await Promise.all([
        getEventStats(eventId),
        getAllMediaForAdmin(eventId),
        getReportsForEvent(eventId),
        fetch(`/api/events/${eventId}/votes`).then((r) => r.json()).catch(() => ({ votes: {} })),
        getGuestsByEvent(eventId),
        fetch("/api/guests/admin-guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, adminToken }),
        }).then((r) => r.json()).catch(() => ({})),
      ]);

      if (adminGuestRes.guestId) {
        setAdminGuestId(adminGuestRes.guestId);
        localStorage.setItem(`partydrop_admin_guest_${eventId}`, adminGuestRes.guestId);
      }

      setStats(eventStats);
      setMedia(mediaData);
      setReports(reportData);
      setVoteCounts(votesRes.votes ?? {});
      setGuests(guestsData);
    } catch (err) {
      console.error("Admin load error:", err);
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, [eventId, adminToken]);

  useEffect(() => {
    if (adminToken) loadData();
  }, [adminToken, loadData]);

  const handleApprove = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/admin/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken, status: "approved" }),
      });
      if (!res.ok) throw new Error();
      setMedia((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, status: "approved" } : m))
      );
      setStats((s) => s ? { ...s, pendingCount: Math.max(0, s.pendingCount - 1), mediaCount: s.mediaCount + 1 } : s);
      toast.success("המדיה אושרה ✅");
    } catch {
      toast.error("שגיאה באישור");
    }
  };

  const handleReject = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/admin/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken, status: "rejected" }),
      });
      if (!res.ok) throw new Error();
      setMedia((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, status: "rejected" } : m))
      );
      setStats((s) => s ? { ...s, pendingCount: Math.max(0, s.pendingCount - 1) } : s);
      toast.success("המדיה נדחתה");
    } catch {
      toast.error("שגיאה בדחייה");
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/admin/media/${mediaId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken }),
      });
      if (!res.ok) throw new Error();
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      setStats((s) => s ? { ...s, mediaCount: Math.max(0, s.mediaCount - 1) } : s);
      toast.success("המדיה נמחקה");
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim().length < 2) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken, name: newName.trim() }),
      });
      if (!res.ok) throw new Error();
      setEvent((prev) => prev ? { ...prev, name: newName.trim() } : prev);
      setEditingName(false);
      setNewName("");
      toast.success("שם האירוע עודכן ✅");
    } catch {
      toast.error("שגיאה בעדכון השם");
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveCover = async () => {
    if (!coverFile) return;
    setSavingCover(true);
    try {
      const url = await uploadCoverImage(coverFile, eventId);
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken, cover_image_url: url }),
      });
      if (!res.ok) throw new Error();
      setEvent((prev) => prev ? { ...prev, cover_image_url: url } : prev);
      setCoverFile(null);
      setCoverPreview(null);
      toast.success("תמונת הכיסוי עודכנה ✅");
    } catch {
      toast.error("שגיאה בעדכון תמונת הכיסוי");
    } finally {
      setSavingCover(false);
    }
  };

  const handleToggleUploads = async () => {
    if (!event) return;
    const newValue = !event.uploads_open;
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_token: adminToken,
          uploads_open: newValue,
        }),
      });
      if (!res.ok) throw new Error();
      setEvent((prev) => prev ? { ...prev, uploads_open: newValue } : prev);
      toast.success(newValue ? "העלאות נפתחו 🟢" : "העלאות נסגרו 🔴");
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const handleChangePrivacyMode = async (mode: "open" | "approval" | "private") => {
    if (!event || event.privacy_mode === mode) return;
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken, privacy_mode: mode }),
      });
      if (!res.ok) throw new Error();
      setEvent((prev) => prev ? { ...prev, privacy_mode: mode } : prev);
      const labels = { open: "פתוח 🌐", approval: "אישור 👁️", private: "פרטי 🔒" };
      toast.success(`מצב הפרטיות שונה ל${labels[mode]}`);
    } catch {
      toast.error("שגיאה בעדכון מצב הפרטיות");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken, admin_password: newPassword.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewPassword("");
      toast.success("הסיסמה עודכנה ✅");
    } catch {
      toast.error("שגיאה בעדכון הסיסמה");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteEvent = async () => {
    setDeletingEvent(true);
    const toastId = toast.loading("מוחק אירוע...");
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: adminToken }),
      });
      if (!res.ok) throw new Error();
      toast.success("האירוע נמחק בהצלחה", { id: toastId });
      // Clear admin token and redirect home
      if (typeof window !== "undefined") {
        localStorage.removeItem(getAdminSessionKey(eventId));
      }
      router.replace("/");
    } catch {
      toast.error("שגיאה במחיקת האירוע", { id: toastId });
      setDeletingEvent(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBlockGuest = async (guestId: string, block: boolean) => {
    // Optimistic update
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, blocked: block } : g))
    );
    try {
      const res = await fetch(`/api/guests/${guestId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, adminToken, blocked: block }),
      });
      if (!res.ok) throw new Error();
      toast.success(block ? "האורח נחסם 🚫" : "החסימה הוסרה ✅");
    } catch {
      // Revert optimistic update on failure
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, blocked: !block } : g))
      );
      toast.error("שגיאה בעדכון סטטוס חסימה");
    }
  };

  const handleDownloadZip = async () => {
    const approved = media.filter((m) => m.status === "approved");
    if (approved.length === 0) { toast.error("אין מדיה להורדה"); return; }
    if (!confirm(`להוריד ${approved.length} תמונות וסרטונים כקובץ ZIP אחד?`)) return;

    cancelDownloadRef.current = false;
    setDownloading(true);
    setDownloadProgress({ done: 0, total: approved.length });
    const toastId = toast.loading(`מכין ZIP — 0/${approved.length}`);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let cancelled = false;

      for (let i = 0; i < approved.length; i++) {
        if (cancelDownloadRef.current) { cancelled = true; break; }
        const item = approved[i];
        const ext = item.file_url.split(".").pop()?.split("?")[0]
          ?? (item.media_type === "video" ? "mp4" : "jpg");
        const nickname = (item.guest?.nickname || "guest")
          .replace(/[^a-zA-Z0-9֐-׿_-]/g, "_");
        const filename = `${String(i + 1).padStart(3, "0")}_${nickname}.${ext}`;

        const res = await fetch(item.file_url);
        if (!res.ok) continue;
        const blob = await res.blob();
        zip.file(filename, blob);

        setDownloadProgress({ done: i + 1, total: approved.length });
        toast.loading(`מוריד ${i + 1}/${approved.length}...`, { id: toastId });
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
      toast.success(`${approved.length} קבצים הורדו בהצלחה 🎉`, { id: toastId });
    } catch {
      toast.error("שגיאה בהורדה", { id: toastId });
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  // Loading state
  if (loading) return <FullPageSpinner />;

  // Invalid token
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-wedding-bg flex flex-col items-center justify-center px-6 text-center">
        <Shield className="h-16 w-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-wedding-ink mb-2">גישה נדחתה</h1>
        <p className="text-wedding-muted mb-6">
          הטוקן אינו תקין. וודא שהקישור נכון.
        </p>
        <Link href="/">
          <Button variant="secondary">חזרה לדף הבית</Button>
        </Link>
      </div>
    );
  }

  if (!event || !stats) return null;

  const eventUrl = getEventUrl(event.slug);

  return (
    <div className="min-h-screen bg-wedding-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-wedding-bg/95 backdrop-blur-md border-b border-wedding-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-wedding-accent flex-shrink-0" />
          <h1 className="text-sm font-bold text-wedding-ink truncate">{event.name}</h1>
          <span className="text-xs text-wedding-muted">— ניהול</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Analytics */}
        <AdminAnalytics
          media={media}
          stats={stats}
          onlineUsers={onlineUsers}
          voteCounts={voteCounts}
        />

        {/* Quick controls */}
        <div className="wedding-card border border-wedding-border rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-wedding-ink/80">שליטה מהירה</h2>

          {/* Toggle uploads */}
          <div className="flex items-center justify-between p-3 bg-wedding-bg rounded-xl">
            <span className="text-sm text-wedding-ink flex items-center gap-2">
              {event.uploads_open ? "🟢" : "🔴"}
              {event.uploads_open ? "העלאות פתוחות" : "העלאות סגורות"}
            </span>
            <button
              onClick={handleToggleUploads}
              className={cn(
                "transition-colors",
                event.uploads_open ? "text-emerald-400" : "text-red-400"
              )}
            >
              {event.uploads_open ? (
                <ToggleRight className="h-8 w-8" />
              ) : (
                <ToggleLeft className="h-8 w-8" />
              )}
            </button>
          </div>

          {/* Privacy mode */}
          <div className="p-3 bg-wedding-bg rounded-xl space-y-2">
            <p className="text-xs font-medium text-wedding-muted mb-2">מצב פרטיות</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { mode: "open" as const, icon: Globe, label: "פתוח", desc: "כל מי שיש לו קישור" },
                { mode: "approval" as const, icon: Eye, label: "אישור", desc: "כל אורח טעון אישור" },
                { mode: "private" as const, icon: Lock, label: "פרטי", desc: "מעלים בלבד רואים" },
              ] as const).map(({ mode, icon: Icon, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => handleChangePrivacyMode(mode)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                    event.privacy_mode === mode
                      ? "bg-wedding-accent/15 border-wedding-accent text-wedding-accent-dark"
                      : "wedding-card border-wedding-border text-wedding-muted hover:text-wedding-ink hover:border-wedding-accent/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Edit event name */}
          <div className="p-3 bg-wedding-bg rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-wedding-muted flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> שם האירוע
              </p>
              {!editingName && (
                <button
                  onClick={() => { setNewName(event.name); setEditingName(true); }}
                  className="text-xs text-wedding-accent hover:text-wedding-accent-dark transition-colors"
                >
                  עריכה
                </button>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  dir="rtl"
                  maxLength={100}
                  className="flex-1 wedding-card border border-wedding-border rounded-lg px-3 py-2 text-sm text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:border-wedding-accent transition-colors"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !newName.trim() || newName.trim().length < 2}
                  className="flex items-center gap-1.5 px-3 py-2 bg-wedding-accent hover:bg-wedding-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingName
                    ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Check className="h-3.5 w-3.5" />}
                  שמור
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-2 text-wedding-muted hover:text-wedding-ink text-sm rounded-lg transition-colors"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <p className="text-sm text-wedding-ink">{event.name}</p>
            )}
          </div>

          {/* Edit cover image */}
          <div className="p-3 bg-wedding-bg rounded-xl space-y-2">
            <p className="text-xs font-medium text-wedding-muted flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> תמונת כיסוי
            </p>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setCoverFile(file);
                  setCoverPreview(URL.createObjectURL(file));
                }}
              />
              <div className="relative w-full h-28 rounded-xl border-2 border-dashed border-wedding-border flex items-center justify-center overflow-hidden hover:border-wedding-accent/50 transition-all">
                {coverPreview || event.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview ?? event.cover_image_url ?? ""}
                    alt="כיסוי"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-wedding-muted">
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">לחץ לבחירת תמונה</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">החלף תמונה</span>
                </div>
              </div>
            </label>
            {coverFile && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCover}
                  disabled={savingCover}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-wedding-accent hover:bg-wedding-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {savingCover
                    ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Check className="h-3.5 w-3.5" />}
                  שמור תמונה
                </button>
                <button
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="px-3 py-2 text-wedding-muted hover:text-wedding-ink text-sm rounded-lg transition-colors"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="p-3 bg-wedding-bg rounded-xl space-y-2">
            <p className="text-xs font-medium text-wedding-muted flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> שינוי סיסמת מנהל
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="סיסמה חדשה"
                  dir="rtl"
                  className="w-full wedding-card border border-wedding-border rounded-lg px-3 py-2 text-sm text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:border-wedding-accent transition-colors pl-8"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-wedding-muted hover:text-wedding-ink"
                >
                  {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-wedding-accent hover:bg-wedding-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {savingPassword
                  ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Check className="h-3.5 w-3.5" />
                }
                שמור
              </button>
            </div>
          </div>

          {/* Event link */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-wedding-muted flex-1 font-mono truncate">
              {eventUrl}
            </p>
            <CopyLinkButton url={eventUrl} label="העתק" />
          </div>
        </div>

        {/* QR Code toggle */}
        <div className="wedding-card border border-wedding-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full flex items-center justify-between p-4 hover:bg-wedding-accent/10 transition-all"
          >
            <span className="text-sm font-medium text-wedding-ink">
              📱 QR Code לאירוע
            </span>
            {showQR ? (
              <ChevronUp className="h-4 w-4 text-wedding-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-wedding-muted" />
            )}
          </button>
          {showQR && (
            <div className="px-4 pb-5 flex flex-col items-center gap-3">
              <QRCodeDisplay url={eventUrl} eventName={event.name} size={180} />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`הוזמנת לClink של ${event.name} 📸\nסרקו את ה-QR או לחצו: ${eventUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-sm font-medium px-4 py-2 rounded-xl transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/whatsapp-icon.svg" alt="WhatsApp" className="w-5 h-5" />
                שלח קישור לאורחים בוואטסאפ
              </a>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "media", label: "מדיה", icon: ImageIcon },
            { key: "reports", label: "דיווחים", icon: AlertTriangle },
            { key: "guests", label: "אורחים", icon: Images },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all",
                activeTab === key
                  ? "btn-gold text-white"
                  : "wedding-card border border-wedding-border text-wedding-muted hover:text-wedding-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === "media" && stats.pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.pendingCount}
                </span>
              )}
              {key === "reports" && stats.reportCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.reportCount}
                </span>
              )}
              {key === "guests" && guests.filter(g => g.blocked).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {guests.filter(g => g.blocked).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "media" && (
          <AdminMediaTable
            media={media}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
          />
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <p className="text-center text-wedding-muted py-12">
                אין דיווחים 🎉
              </p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="wedding-card border border-red-500/20 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-wedding-ink">
                        {report.reason}
                      </p>
                      <p className="text-xs text-wedding-muted mt-1">
                        דווח על ידי: {report.guest?.nickname || "אורח"}
                      </p>
                      {report.media && (
                        <p className="text-xs text-wedding-muted">
                          סוג:{" "}
                          {report.media.media_type === "video"
                            ? "סרטון"
                            : "תמונה"}
                          {" · "}
                          סטטוס: {report.media.status}
                        </p>
                      )}
                    </div>
                    {report.media_id && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(report.media_id)}
                      >
                        מחק
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "guests" && (
          <div className="space-y-3">
            {guests.length === 0 ? (
              <p className="text-center text-wedding-muted py-12">
                אין אורחים עדיין
              </p>
            ) : (
              guests.map((guest) => (
                <div
                  key={guest.id}
                  className={cn(
                    "wedding-card border border-wedding-border rounded-2xl p-3 flex items-center gap-3",
                    guest.blocked && "opacity-60"
                  )}
                  dir="rtl"
                >
                  <div className="text-2xl w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden">
                    {guest.avatar?.startsWith("http") ? (
                      <Image src={guest.avatar} alt="" width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                      guest.avatar ?? "👤"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wedding-ink truncate">
                      {guest.nickname}
                    </p>
                    <p className="text-xs text-wedding-muted">
                      {new Date(guest.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {guest.blocked && (
                      <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded">
                        חסום
                      </span>
                    )}
                    <button
                      onClick={() => handleBlockGuest(guest.id, !guest.blocked)}
                      title={guest.blocked ? "הסר חסימה" : "חסום אורח"}
                      className={cn(
                        "text-xs px-2 py-1 rounded-lg border transition-all font-medium",
                        guest.blocked
                          ? "border-wedding-border text-wedding-muted hover:text-wedding-ink hover:border-wedding-accent/40"
                          : "border-red-500/40 text-red-400 hover:bg-red-500/10"
                      )}
                    >
                      {guest.blocked ? "✓ בטל חסימה" : "🚫 חסום"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Clink פסיפס — collapsible section (Spark / Crown only) */}
        {event.mosaic_enabled ? (
        <div className="wedding-card border border-wedding-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setMosaicOpen(v => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-wedding-accent/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-wedding-ink">🎨 Clink פסיפס</span>
              <span className="text-xs text-wedding-muted bg-wedding-bg px-2 py-0.5 rounded-full border border-wedding-border">
                {media.filter(m => m.status === "approved" && m.media_type !== "video").length} תמונות
              </span>
            </div>
            <span className="text-wedding-muted text-xs">{mosaicOpen ? "▲" : "▼"}</span>
          </button>

          <div className={mosaicOpen ? "px-4 pb-5 border-t border-wedding-border pt-4 space-y-4" : "hidden"}>
              <a
                href={`/event/${event.slug}/mosaic?token=${event.admin_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 rounded-xl p-3 transition-all group"
              >
                <div>
                  <p className="text-wedding-ink font-bold text-sm">📺 הקרן Clink פסיפס</p>
                  <p className="text-wedding-muted text-xs mt-0.5">פתח בטאב חדש — מתאים להקרנה על מסך גדול</p>
                </div>
                <span className="text-purple-400 text-xs font-medium group-hover:translate-x-[-2px] transition-transform">פתח ←</span>
              </a>
              <MosaicCreator media={media.filter(m => m.status === "approved")} eventId={event.id} adminToken={adminToken} />
          </div>
        </div>
        ) : (
        <div className="wedding-card border border-wedding-border rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="text-sm font-semibold text-wedding-ink">Clink פסיפס</p>
              <p className="text-xs text-wedding-muted mt-0.5">לא כלול במסלול הנוכחי</p>
            </div>
          </div>
          <a href="/checkout" className="text-xs text-wedding-accent-dark border border-wedding-accent/30 bg-wedding-accent/10 px-3 py-1.5 rounded-xl hover:bg-wedding-accent/20 transition-all font-semibold whitespace-nowrap">
            שדרג ל-Spark ↗
          </a>
        </div>
        )}

        {/* Clip Creator */}
        <ClipCreator media={media} eventName={event.name} />

        {/* Download ZIP */}
        <div className="wedding-card border border-wedding-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold text-wedding-ink">💾 הורדת כל המדיה</p>
              <p className="text-xs text-wedding-muted mt-0.5">
                {media.filter(m => m.status === "approved").length} קבצים מאושרים · קובץ ZIP
              </p>
            </div>
            <button
              onClick={downloading ? () => { cancelDownloadRef.current = true; } : handleDownloadZip}
              disabled={!downloading && media.filter(m => m.status === "approved").length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold rounded-xl transition-all",
                downloading
                  ? "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300"
                  : "btn-gold text-white shadow-lg shadow-wedding-accent/20"
              )}
            >
              {downloading ? (
                <>
                  <X className="h-4 w-4" />
                  ביטול ({downloadProgress ? `${downloadProgress.done}/${downloadProgress.total}` : "..."})
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  הורד ZIP
                </>
              )}
            </button>
          </div>
          {downloading && downloadProgress && (
            <div className="mt-3 h-1.5 bg-wedding-accent/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-wedding-accent-light to-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${(downloadProgress.done / downloadProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Danger zone — delete event */}
        <div className="wedding-card border border-red-500/20 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            אזור מסוכן
          </h3>
          <p className="text-xs text-wedding-muted mb-3 leading-relaxed">
            מחיקת האירוע תמחק לצמיתות את כל התמונות, הסרטונים, האורחים, הלייקים וכל הנתונים הקשורים. פעולה זו אינה ניתנת לביטול.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              מחק אירוע לצמיתות
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-3">
              <p className="text-sm text-red-300 font-medium">
                ⚠️ האם אתה בטוח? לא ניתן לשחזר את הנתונים לאחר המחיקה.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  {deletingEvent ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  כן, מחק הכל
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingEvent}
                  className="px-4 py-2 rounded-xl text-sm text-wedding-muted hover:text-wedding-ink border border-wedding-border hover:border-wedding-accent/40 transition-all"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Group Chat Modal */}
      {showGroupChat && (
        <GroupChatModal
          eventId={eventId}
          me={{ id: adminGuestId ?? "", nickname: "מנהל האירוע", avatar: "👑" }}
          guests={guests.map(g => ({ id: g.id, nickname: g.nickname, avatar: g.avatar ?? null }))}
          onClose={() => { setShowGroupChat(false); setGroupUnreadCount(0); }}
        />
      )}

      {/* Bottom nav */}
      <BottomNav
        slug={event.slug}
        event={event}
        guestId={adminGuestId}
        guestNickname="מנהל האירוע"
        guestAvatar="👑"
        adminEventId={eventId}
        adminBypass={false}
        adminToken={adminToken}
        groupUnreadCount={groupUnreadCount}
        onGroupChatOpen={() => { setShowGroupChat(true); setGroupUnreadCount(0); }}
        onUploaded={() => {}}
        onLeave={() => { if (confirm("לחזור לדף הבית?")) router.push("/"); }}
        activeTab="menu"
      />
    </div>
  );
}
