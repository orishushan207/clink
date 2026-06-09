"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadPreviewSheet from "@/components/UploadPreviewSheet";
import {
  Home, Bell, Plus, MessageSquare, Menu, X,
  Trophy, QrCode, Download, KeyRound, LogOut,
  Camera, Images, User, Pencil, Check, Tv2, Grid3x3,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/media";
import { getEventUrl } from "@/lib/utils";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import NotificationBell from "@/components/NotificationBell";
import toast from "react-hot-toast";
import type { Media, PublicEvent } from "@/types";
import { AVATAR_OPTIONS } from "@/types";

interface BottomNavProps {
  slug: string;
  event: PublicEvent;
  guestId: string | null;
  guestNickname: string | null;
  guestAvatar: string | null;
  adminEventId: string | null;
  adminBypass?: boolean;
  groupUnreadCount: number;
  onGroupChatOpen: () => void;
  onUploaded: (media: Media) => void;
  onLeave: () => void;
  onGuestUpdated?: (nickname: string, avatar: string) => void;
  activeTab?: "home" | "notifications" | "messages" | "menu" | "live" | "leaderboard";
  adminToken?: string;
}

export default function BottomNav({
  slug, event, guestId, guestNickname, guestAvatar,
  adminEventId, adminBypass = false,
  groupUnreadCount, onGroupChatOpen, onUploaded, onLeave,
  onGuestUpdated, activeTab = "home", adminToken,
}: BottomNavProps) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showLiveMenu, setShowLiveMenu] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  // Profile edit state
  const [editNickname, setEditNickname] = useState(guestNickname ?? "");
  const [editAvatar, setEditAvatar] = useState(guestAvatar ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const acceptedTypes = event.allow_video
    ? "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
    : "image/jpeg,image/jpg,image/png,image/webp";

  // Single source of truth: can this user interact with the event?
  const isIdentified = !!(guestId || adminEventId || adminBypass);
  // Can this user upload? (needs a guestId to actually save the record)
  const canUpload = !!guestId;

  const doUpload = useCallback(async (fileArray: File[], caption?: string) => {
    if (!canUpload) { toast.error("עדיין מתחבר... נסה שוב בעוד שנייה"); return; }
    setUploading(true);
    const toastId = toast.loading(fileArray.length === 1 ? "מעלה קובץ..." : `מעלה 0 מתוך ${fileArray.length}...`);

    let successCount = 0;
    for (let i = 0; i < fileArray.length; i++) {
      if (fileArray.length > 1) toast.loading(`מעלה ${i + 1} מתוך ${fileArray.length}...`, { id: toastId });
      try {
        const media = await uploadMedia({
          file: fileArray[i], eventId: event.id, guestId,
          allowVideo: event.allow_video, requireApproval: event.require_approval,
          caption: caption || undefined,
          onProgress: () => {},
        });
        successCount++;
        if (!event.require_approval) onUploaded(media);
      } catch (err) {
        if (fileArray.length === 1) toast.error(err instanceof Error ? err.message : "שגיאה בהעלאה", { id: toastId });
      }
    }

    toast.dismiss(toastId);
    if (successCount > 0) {
      if (event.require_approval) toast("הקובץ עלה וממתין לאישור ✅", { icon: "⏳", duration: 4000 });
      else toast.success(fileArray.length === 1 ? "הקובץ עלה בהצלחה! 🎉" : `${successCount} קבצים עלו בהצלחה! 🎉`);
    }
    setUploading(false);
  }, [guestId, event, onUploaded]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0 || !guestId) return;
    if (!event.uploads_open) { toast.error("העלאות לאירוע זה נסגרו"); return; }

    if (files.length === 1) {
      setPreviewFile(files[0]);
    } else {
      doUpload(Array.from(files));
    }
  }, [guestId, event.uploads_open, doUpload]);

  const saveProfile = async () => {
    if (!guestId || !editNickname.trim() || editNickname.trim().length < 2) {
      toast.error("שם חייב להכיל לפחות 2 תווים"); return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: editNickname.trim(), avatar: editAvatar }),
      });
      if (!res.ok) throw new Error();
      // Update localStorage
      const stored = localStorage.getItem(`partydrop_guest_${slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(`partydrop_guest_${slug}`, JSON.stringify({ ...parsed, nickname: editNickname.trim(), avatar: editAvatar }));
      }
      onGuestUpdated?.(editNickname.trim(), editAvatar);
      toast.success("הפרופיל עודכן!");
      setShowProfileEdit(false);
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept={acceptedTypes} capture="environment"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} className="hidden" />
      <input ref={galleryRef} type="file" accept={acceptedTypes} multiple
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} className="hidden" />

      {/* Upload preview sheet */}
      {previewFile && (
        <UploadPreviewSheet
          file={previewFile}
          allowVideo={event.allow_video}
          eventId={event.id}
          onClose={() => setPreviewFile(null)}
          onUpload={(file, caption) => doUpload([file], caption)}
        />
      )}

      {/* Live popup — rendered outside <nav> as fixed overlay */}
      {showLiveMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLiveMenu(false)} />
          <div className="fixed bottom-[72px] inset-x-0 flex justify-center z-[55] pb-safe pointer-events-none">
            <div className="bg-[#1a1a2e] border border-party-border rounded-2xl overflow-hidden shadow-xl w-52 pointer-events-auto animate-fade-in">
              <Link
                href={`/event/${slug}/live`}
                onClick={() => setShowLiveMenu(false)}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors border-b border-party-border"
              >
                <Tv2 className="h-4 w-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">Live Wall 🔴</p>
                  <p className="text-gray-500 text-[10px]">מצגת חיה לאולם</p>
                </div>
              </Link>
              <Link
                href={`/event/${slug}/mosaic${adminToken ? `?token=${adminToken}` : ""}`}
                onClick={() => setShowLiveMenu(false)}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
              >
                <Grid3x3 className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">Clink פסיפס 🎨</p>
                  <p className="text-gray-500 text-[10px]">פסיפס האירוע</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Plus popup — rendered outside <nav> as fixed overlay to avoid iOS pointer-event clipping */}
      {showPlusMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)} />
          <div className="fixed bottom-[72px] inset-x-0 flex justify-center z-[55] pb-safe pointer-events-none">
            <div className="flex flex-col items-center gap-2.5 pointer-events-auto">
              <button
                onClick={() => { setShowPlusMenu(false); galleryRef.current?.click(); }}
                disabled={!isIdentified || uploading}
                className="w-44 flex items-center justify-center gap-3 bg-party-gold/10 border border-party-gold/50 rounded-2xl px-5 py-3.5 text-base font-semibold text-yellow-300 shadow-lg hover:bg-party-gold/20 hover:border-party-gold transition-all disabled:opacity-40"
              >
                <Images className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                גלריה
              </button>
              <button
                onClick={() => { setShowPlusMenu(false); cameraRef.current?.click(); }}
                disabled={!isIdentified || uploading}
                className="w-44 flex items-center justify-center gap-3 bg-party-gold/10 border border-party-gold/50 rounded-2xl px-5 py-3.5 text-base font-semibold text-yellow-300 shadow-lg hover:bg-party-gold/20 hover:border-party-gold transition-all disabled:opacity-40"
              >
                <Camera className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                מצלמה
              </button>
              <div className="w-2.5 h-2.5 bg-party-surface border-b border-r border-party-gold/30 rotate-45 -mt-1.5" />
            </div>
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-party-bg/95 backdrop-blur-md border-t border-party-border" dir="rtl">
        <div className="max-w-lg mx-auto grid grid-cols-7 items-end pb-safe">

          {/* בית */}
          <button
            onClick={() => router.push(`/event/${slug}/gallery`)}
            className={cn("flex flex-col items-center gap-1 py-3 transition-all", activeTab === "home" ? "text-yellow-400" : "text-gray-500 hover:text-gray-300")}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">בית</span>
          </button>

          {/* Live — button */}
          <button
            onClick={() => setShowLiveMenu(v => !v)}
            className={cn("flex flex-col items-center gap-1 py-3 transition-all w-full", (activeTab === "live" || showLiveMenu) ? "text-yellow-400" : "text-gray-500 hover:text-gray-300")}
          >
            <Tv2 className="h-5 w-5" />
            <span className="text-[10px] font-medium">Live</span>
          </button>

          {/* התראות */}
          <div className={cn("flex flex-col items-center gap-1 py-3 transition-all", activeTab === "notifications" ? "text-yellow-400" : "text-gray-500 hover:text-gray-300")}>
            <div className="h-5 flex items-center justify-center">
              <NotificationBell
                guestId={guestId}
                eventId={event.id}
                isAdmin={!!adminEventId || adminBypass}
                compact
              />
            </div>
            <span className="text-[10px] font-medium">התראות</span>
          </div>

          {/* + (center — position 4/7 = exact middle) */}
          <div className="relative flex flex-col items-center py-2">
            <button
              onClick={() => setShowPlusMenu(v => !v)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shadow-md shadow-party-gold/30 transition-all active:scale-95",
                "bg-gradient-to-br from-party-gold to-amber-500",
                uploading && "opacity-60 cursor-wait"
              )}
            >
              {showPlusMenu
                ? <X className="h-5 w-5 text-white" />
                : <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
              }
            </button>
            <span className="text-[10px] font-medium text-gray-500 mt-0.5">העלאה</span>
          </div>

          {/* הודעות */}
          <button
            onClick={onGroupChatOpen}
            disabled={!isIdentified}
            className={cn("flex flex-col items-center gap-1 py-3 transition-all disabled:opacity-40", activeTab === "messages" ? "text-yellow-400" : "text-gray-500 hover:text-gray-300")}
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5" />
              {groupUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse">
                  {groupUnreadCount > 9 ? "9+" : groupUnreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">הודעות</span>
          </button>

          {/* לוח מובילים */}
          {event.show_leaderboard ? (
            <Link
              href={`/event/${slug}/leaderboard`}
              className={cn("flex flex-col items-center gap-1 py-3 transition-all", activeTab === "leaderboard" ? "text-yellow-400" : "text-gray-500 hover:text-gray-300")}
            >
              <Trophy className="h-5 w-5" />
              <span className="text-[10px] font-medium">מובילים</span>
            </Link>
          ) : (
            <div className="py-3" /> /* placeholder to keep grid layout */
          )}

          {/* תפריט */}
          <button
            onClick={() => setShowDrawer(true)}
            className={cn("flex flex-col items-center gap-1 py-3 transition-all", activeTab === "menu" ? "text-yellow-400" : "text-gray-500 hover:text-gray-300")}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">תפריט</span>
          </button>

        </div>
      </nav>

      {/* Menu drawer */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-party-surface border-t border-party-border rounded-t-3xl pb-safe" dir="rtl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Profile section */}
            {guestId && (
              <div className="px-4 pt-2 pb-4 border-b border-party-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-party-bg border border-party-border flex items-center justify-center text-2xl">
                      {guestAvatar?.startsWith("http") ? (
                        <Image src={guestAvatar} alt="" width={48} height={48} className="rounded-full object-cover" />
                      ) : (
                        <span>{guestAvatar || "👤"}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{guestNickname || "אורח"}</p>
                      <p className="text-gray-500 text-xs">פרופיל</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditNickname(guestNickname ?? ""); setEditAvatar(guestAvatar ?? ""); setShowProfileEdit(true); setShowDrawer(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-medium hover:bg-yellow-400/20 transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    עריכה
                  </button>
                </div>
              </div>
            )}

            {/* Menu items */}
            <div className="py-2">
              {event.show_leaderboard && (
                <Link href={`/event/${slug}/leaderboard`} onClick={() => setShowDrawer(false)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors text-sm text-gray-300 hover:text-white">
                  <Trophy className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                  לוח מובילים
                </Link>
              )}
              <button onClick={() => { setShowDrawer(false); setShowQR(true); }}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors text-sm text-gray-300 hover:text-white">
                <QrCode className="h-5 w-5 text-gray-400 flex-shrink-0" />
                הצגת ברקוד
              </button>
              {adminEventId && (
                <Link href={`/admin/event/${adminEventId}`} onClick={() => setShowDrawer(false)}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-amber-500/5 transition-colors text-sm text-amber-400">
                  <KeyRound className="h-5 w-5 flex-shrink-0" />
                  פאנל ניהול
                </Link>
              )}
              <div className="mx-4 border-t border-party-border my-1" />
              <button onClick={() => { setShowDrawer(false); onLeave(); }}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-500/10 transition-colors text-sm text-red-400">
                <LogOut className="h-5 w-5 flex-shrink-0" />
                יציאה מהאירוע
              </button>
            </div>
            <div className="h-6" />
          </div>
        </>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setShowQR(false)}>
          <div className="bg-party-surface border border-party-border rounded-3xl p-6 flex flex-col items-center gap-4 max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-white font-bold text-base">שתף עם חברים 📸</h2>
              <button onClick={() => setShowQR(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-gray-400 text-xs text-center">תן לחבר לסרוק את הברקוד ולהצטרף לClink</p>
            <QRCodeDisplay url={getEventUrl(event.slug)} eventName={event.name} size={200} />
            <p className="text-gray-500 text-xs text-center break-all">{getEventUrl(event.slug)}</p>
          </div>
        </div>
      )}

      {/* Profile edit modal */}
      {showProfileEdit && guestId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowProfileEdit(false)}>
          <div className="bg-party-surface border border-party-border rounded-t-3xl w-full max-w-lg pb-safe" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 border-b border-party-border">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <User className="h-5 w-5 text-yellow-400" />
                עריכת פרופיל
              </h2>
              <button onClick={() => setShowProfileEdit(false)} className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Avatar */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-3">בחר אווטאר</p>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setEditAvatar(emoji)}
                      className={cn(
                        "w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all",
                        editAvatar === emoji
                          ? "bg-yellow-400/20 border-2 border-yellow-400 scale-110"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nickname */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">שם תצוגה</p>
                <input
                  type="text"
                  value={editNickname}
                  onChange={e => setEditNickname(e.target.value)}
                  maxLength={30}
                  className="w-full bg-party-bg border border-party-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-party-gold transition-colors"
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={savingProfile || editNickname.trim().length < 2}
                className="w-full flex items-center justify-center gap-2 btn-gold text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-all"
              >
                {savingProfile ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Check className="h-4 w-4" /> שמור שינויים</>
                )}
              </button>
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}
    </>
  );
}
