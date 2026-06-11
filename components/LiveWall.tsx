"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Media, PublicEvent } from "@/types";
import { getRecentApprovedMedia } from "@/lib/media";
import {
  Play, Maximize2, ChevronLeft, ChevronRight,
  Pause, Settings, X, RotateCcw, Expand, Shrink, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlurScore, BLUR_THRESHOLD } from "@/lib/blurDetection";
import { supabase } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";

interface LiveWallProps { event: PublicEvent; isAdmin?: boolean; }

// Fallback poll — Realtime handles instant updates
const POLL_INTERVAL = 30_000;
const DEFAULT_SLIDE_DURATION = 5;

type FilterMode = "all" | "images" | "videos";
interface LiveItem extends Media { isNew?: boolean; }

export default function LiveWall({ event, isAdmin = false }: LiveWallProps) {
  const router = useRouter();
  const [items, setItems] = useState<LiveItem[]>([]);
  const [latestMessage, setLatestMessage] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState<{ nickname: string; avatar: string | null; type: string } | null>(null);
  const [mode, setMode] = useState<"grid" | "slideshow">("grid");
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [hideBlurry, setHideBlurry] = useState(false);
  const [blurSensitivity, setBlurSensitivity] = useState<"normal" | "high">("high");
  const [blurScores, setBlurScores] = useState<Map<string, number>>(new Map());
  const activeBlurThreshold = blurSensitivity === "high" ? 350 : BLUR_THRESHOLD;
  const [slideDuration, setSlideDuration] = useState(DEFAULT_SLIDE_DURATION);
  const [videoDuration, setVideoDuration] = useState<number | "full">("full");
  const [transitioning, setTransitioning] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const knownIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressAnimRef = useRef<Animation | null>(null);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 2000);
  }, []);

  const filteredItems = items.filter((m) => {
    if (filter === "images") return m.media_type === "image";
    if (filter === "videos") return m.media_type === "video";
    return true;
  }).filter((m) => {
    if (!hideBlurry) return true;
    if (m.media_type === "video") return true;
    const score = blurScores.get(m.id);
    if (score === undefined) return true; // not yet scored → show
    return score >= activeBlurThreshold;
  });
  const safeIndex = Math.min(slideIndex, Math.max(filteredItems.length - 1, 0));
  const currentItem = filteredItems[safeIndex];
  const isVideo = currentItem?.media_type === "video";

  // Use a ref to avoid fetchMedia depending on blurScores (infinite loop)
  const blurScoresRef = useRef(blurScores);
  blurScoresRef.current = blurScores;

  const computeScores = useCallback(async (mediaItems: Media[]) => {
    const unscored = mediaItems.filter(
      (m) => m.media_type === "image" && !blurScoresRef.current.has(m.id)
    );
    if (unscored.length === 0) return;
    const updates = new Map(blurScoresRef.current);
    await Promise.all(
      unscored.map(async (m) => {
        const score = await getBlurScore(m.file_url);
        updates.set(m.id, score);
      })
    );
    setBlurScores(new Map(updates));
  }, []);

  const fetchMedia = useCallback(async () => {
    try {
      const fresh = await getRecentApprovedMedia(event.id, 50);
      const newItems = fresh.filter((m) => !knownIds.current.has(m.id));
      if (newItems.length > 0 && !isFirstLoad.current) {
        const latest = newItems[0];
        const name = latest.guest?.nickname || "מישהו";
        const type = latest.media_type === "video" ? "סרטון" : "תמונה";
        setLatestMessage(`${name} העלה ${type} חדש${latest.media_type === "video" ? "" : "ה"} 🔥`);
        setTimeout(() => setLatestMessage(""), 5000);
        setNewAnnouncement({ nickname: name, avatar: latest.guest?.avatar ?? null, type: latest.media_type });
        setTimeout(() => setNewAnnouncement(null), 3500);
      }
      fresh.forEach((m) => knownIds.current.add(m.id));
      isFirstLoad.current = false;
      setItems(fresh.map((m) => ({ ...m, isNew: newItems.some((n) => n.id === m.id) })));
      setTimeout(() => setItems((p) => p.map((m) => ({ ...m, isNew: false }))), 2000);

      // Always compute scores in background (needed for blur filter)
      computeScores(fresh);
    } catch (err) { console.error(err); }
  }, [event.id, computeScores]);

  useEffect(() => {
    fetchMedia();
    const iv = setInterval(fetchMedia, POLL_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchMedia]);

  // Realtime subscription — instant new media on the Live Wall
  // Requires Supabase Realtime enabled on the `media` table
  useEffect(() => {
    const channel = supabase
      .channel(`livewall-media-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "media",
          filter: `event_id=eq.${event.id}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; status: string };
          if (row.status !== "approved") return;
          // fetchMedia will pick it up and handle the "isNew" badge
          fetchMedia();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id, fetchMedia]);

  // When blur filter is toggled on — compute scores immediately if not done yet
  useEffect(() => {
    if (hideBlurry && items.length > 0) {
      computeScores(items);
    }
  }, [hideBlurry, items, computeScores]);

  const advance = useCallback((dir: 1 | -1) => {
    if (filteredItems.length === 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setSlideIndex((i) => (i + dir + filteredItems.length) % filteredItems.length);
      setTransitioning(false);
    }, 300);
  }, [filteredItems.length]);

  const restart = useCallback(() => {
    setSlideIndex(0);
    setPaused(false);
  }, []);

  const startProgress = useCallback((durationMs: number) => {
    if (!progressRef.current) return;
    progressAnimRef.current?.cancel();
    progressAnimRef.current = progressRef.current.animate(
      [{ width: "0%" }, { width: "100%" }],
      { duration: durationMs, easing: "linear", fill: "forwards" }
    );
  }, []);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  // Slideshow auto-advance timer
  useEffect(() => {
    if (mode !== "slideshow" || paused) { clearTimer(); progressAnimRef.current?.cancel(); return; }
    if (!currentItem) return;
    if (isVideo && videoDuration === "full") { progressAnimRef.current?.cancel(); return; }

    const durationMs = isVideo ? (videoDuration as number) * 1000 : slideDuration * 1000;
    startProgress(durationMs);
    clearTimer();
    timerRef.current = setTimeout(() => advance(1), durationMs);

    return clearTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paused, safeIndex, filter, slideDuration, videoDuration]);

  // Sync video element pause/play state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [paused]);

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoDuration === "full" || !videoRef.current) return;
    if (videoRef.current.currentTime >= (videoDuration as number)) {
      advance(1);
    }
  }, [videoDuration, advance]);

  const handleVideoLoaded = useCallback(() => {
    if (videoDuration === "full" && videoRef.current) {
      startProgress(videoRef.current.duration * 1000);
    }
  }, [videoDuration, startProgress]);

  // Fullscreen toggle with iOS fallback
  const toggleFullscreen = useCallback(async () => {
    const el = slideshowRef.current;
    if (!el) return;

    if (!isFullscreen) {
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (el as HTMLDivElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } catch {
        setIsFullscreen(true);
      }
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      } catch {
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestNickname, setGuestNickname] = useState<string | null>(null);
  const [guestAvatar, setGuestAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`partydrop_guest_${event.slug}`);
        if (raw) {
          const s = JSON.parse(raw);
          setGuestId(s.guestId ?? null);
          setGuestNickname(s.nickname ?? null);
          setGuestAvatar(s.avatar ?? null);
        }
      } catch { /* silent */ }
    }
  }, [event.slug]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">

      {/* Header — always rendered but behind slideshow overlay */}
      <div className="fixed top-0 inset-x-0 z-20 bg-gradient-to-b from-black via-black/80 to-transparent p-4 pb-10">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-wedding-accent to-amber-400 bg-clip-text text-transparent">
                {event.name}
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">Live Wall 🔴</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium ml-1">חי</span>

            {/* Grid settings button */}
            <button
              onClick={() => setShowSettings(s => !s)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                showSettings ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20 text-gray-300"
              )}
              title="הגדרות"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={() => { setSlideIndex(0); setPaused(false); setMode("slideshow"); setShowSettings(false); showControls(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
            >
              <Maximize2 className="h-4 w-4" /> מצגת
            </button>
          </div>
        </div>
      </div>

      {/* New media notification */}
      {latestMessage && (
        <div className="fixed top-24 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="btn-gold text-white px-6 py-3 rounded-2xl shadow-2xl animate-float-in text-sm font-medium">
            {latestMessage}
          </div>
        </div>
      )}

      {/* Dramatic new-upload announcement */}
      {newAnnouncement && (
        <div className="fixed inset-0 z-[45] flex items-center justify-center pointer-events-none">
          <div className="text-center px-8 py-10 rounded-3xl bg-black/60 backdrop-blur-md border border-wedding-accent/30 animate-scale-in">
            <div className="text-7xl mb-3">
              {newAnnouncement.avatar && !newAnnouncement.avatar.startsWith("http")
                ? newAnnouncement.avatar
                : newAnnouncement.type === "video" ? "🎬" : "📸"}
            </div>
            <p className="text-4xl font-black text-white mb-1">{newAnnouncement.nickname}</p>
            <p className="text-xl font-bold text-yellow-400">
              {newAnnouncement.type === "video" ? "העלה סרטון" : "העלה תמונה"} 🔥
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 text-center">
          <div className="text-7xl">🎉</div>
          <h2 className="text-3xl font-black text-white">הלייב וול מוכן!</h2>
          <p className="text-gray-400 text-base max-w-sm leading-relaxed">
            צלמו את עצמכם מתארגנים, רוקדים, נושקים למצלמה —<br />
            <span className="text-yellow-400 font-semibold">כל מה שעולה מופיע כאן בלייב לכולם</span> 👀
          </p>
          <div className="flex gap-4 text-3xl mt-2 animate-bounce">
            <span>🕺</span><span>🥂</span><span>🤳</span><span>💃</span>
          </div>
          <p className="text-gray-600 text-sm">מחכים לתמונה הראשונה...</p>
        </div>
      )}

      {/* Grid settings panel */}
      {mode === "grid" && showSettings && (
        <div className="fixed top-16 left-4 right-4 z-30 bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">הגדרות</p>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2">סינון תוכן</p>
            <div className="flex gap-2">
              {([["all", "הכל"], ["images", "תמונות"], ["videos", "סרטונים"]] as [FilterMode, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-sm transition-colors",
                    filter === val ? "bg-wedding-accent text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">איכות תמונות</p>
            <button
              onClick={() => setHideBlurry(v => !v)}
              className={cn(
                "w-full py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2",
                hideBlurry ? "bg-wedding-accent text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
              )}
            >
              🔍 {hideBlurry ? "מסתיר תמונות מטושטשות" : "הסתר תמונות מטושטשות"}
            </button>
            {hideBlurry && (
              <button
                onClick={() => setBlurSensitivity(s => s === "normal" ? "high" : "normal")}
                className="w-full mt-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 bg-white/10 text-gray-300 hover:bg-white/20"
              >
                🎚 רגישות: {blurSensitivity === "high" ? "גבוהה" : "רגילה"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* GRID MODE */}
      {mode === "grid" && items.length > 0 && (
        <div className="pt-24 pb-6">
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 p-4 max-w-screen-2xl mx-auto">
            {filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => { setSlideIndex(idx); setPaused(true); setMode("slideshow"); showControls(); }}
                className={cn(
                  "relative mb-3 break-inside-avoid rounded-2xl overflow-hidden group cursor-pointer",
                  item.isNew && "ring-2 ring-wedding-accent animate-pulse-glow"
                )}
              >
                {item.media_type === "video" ? (
                  <div className="relative bg-gray-900 aspect-square">
                    <video src={item.file_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-10 w-10 text-white opacity-70 drop-shadow-lg" />
                    </div>
                  </div>
                ) : (
                  <Image src={item.file_url} alt="" width={400} height={400} className="w-full h-auto" />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-white text-xs font-semibold drop-shadow flex items-center gap-1">
                    {item.guest?.avatar && (
                      item.guest.avatar.startsWith("http") ? (
                        <span className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 inline-block">
                          <Image src={item.guest.avatar} alt="" width={16} height={16} className="w-full h-full object-cover" />
                        </span>
                      ) : (
                        <span>{item.guest.avatar}</span>
                      )
                    )}
                    <span className="truncate">{item.guest?.nickname}</span>
                  </p>
                  {item.caption && (
                    <p className="text-gray-200 text-xs mt-0.5 line-clamp-2 drop-shadow">{item.caption}</p>
                  )}
                </div>
                {item.isNew && (
                  <div className="absolute top-2 right-2 btn-gold text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    חדש!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLIDESHOW — z-40 covers the header */}
      {mode === "slideshow" && (
        <div
          ref={slideshowRef}
          className="fixed inset-0 bg-black flex items-center justify-center z-40"
          onMouseMove={showControls}
          onTouchStart={showControls}
        >
          {/* Progress bar */}
          {currentItem && !paused && (
            <div className="absolute top-0 inset-x-0 h-1.5 bg-white/10 z-10">
              <div ref={progressRef} className="h-full bg-gradient-to-r from-wedding-accent-light to-amber-400 w-0" />
            </div>
          )}

          {/* Close button — always visible regardless of controls auto-hide */}
          <button
            onClick={() => { setMode("grid"); setShowSettings(false); setPaused(false); }}
            className="absolute top-16 right-4 z-30 p-2 rounded-xl bg-black/40 hover:bg-white/20 transition-colors"
            title="סגור"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Slideshow top controls bar */}
          <div className={cn(
            "absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <div className="w-9" />

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">חי</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={restart}
                title="התחל מחדש"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowSettings((s) => !s)}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  showSettings ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20"
                )}
                title="הגדרות"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Settings panel — inside slideshow overlay */}
          {showSettings && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-5 w-80 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">הגדרות מצגת</h3>
                <button onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">סינון תוכן</p>
                <div className="flex gap-2">
                  {([["all", "הכל"], ["images", "תמונות"], ["videos", "סרטונים"]] as [FilterMode, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { setFilter(val); setSlideIndex(0); }}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-sm transition-colors",
                        filter === val ? "bg-wedding-accent text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">איכות תמונות</p>
                <button
                  onClick={() => { setHideBlurry(v => !v); setSlideIndex(0); }}
                  className={cn(
                    "w-full py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2",
                    hideBlurry ? "bg-wedding-accent text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                  )}
                >
                  🔍 {hideBlurry ? "מסתיר תמונות מטושטשות" : "הסתר תמונות מטושטשות"}
                </button>
                {hideBlurry && (
                  <button
                    onClick={() => setBlurSensitivity(s => s === "normal" ? "high" : "normal")}
                    className="w-full mt-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 bg-white/10 text-gray-300 hover:bg-white/20"
                  >
                    🎚 רגישות: {blurSensitivity === "high" ? "גבוהה" : "רגילה"}
                  </button>
                )}
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">משך תמונה: <span className="text-white">{slideDuration} שניות</span></p>
                <input
                  type="range" min={2} max={30} step={1} value={slideDuration}
                  onChange={(e) => setSlideDuration(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1"><span>2s</span><span>30s</span></div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">משך סרטון</p>
                <div className="flex gap-2 flex-wrap">
                  {([["full", "מלא"], [10, "10s"], [20, "20s"], [30, "30s"]] as [number | "full", string][]).map(([val, label]) => (
                    <button
                      key={String(val)}
                      onClick={() => setVideoDuration(val)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-colors",
                        videoDuration === val ? "bg-wedding-accent text-white" : "bg-white/10 text-gray-300 hover:bg-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <p className="text-gray-500 text-xl">אין תוכן עם הסינון הנוכחי</p>
          ) : currentItem && (
            <>
              {/* Media */}
              <div className={cn("w-full h-full transition-opacity duration-300", transitioning ? "opacity-0" : "opacity-100")}>
                {isVideo ? (
                  <video
                    ref={videoRef}
                    key={currentItem.id}
                    src={currentItem.file_url}
                    className="w-full h-full object-contain"
                    autoPlay
                    playsInline
                    onTimeUpdate={handleVideoTimeUpdate}
                    onLoadedMetadata={handleVideoLoaded}
                    onEnded={() => { if (!paused) advance(1); }}
                  />
                ) : (
                  <Image
                    key={currentItem.id}
                    src={currentItem.file_url}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="100vw"
                    priority
                  />
                )}
              </div>

              {/* Uploader info — centered, above BottomNav */}
              <div className="absolute bottom-[72px] inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-8 pt-16 pb-4 z-10 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2">
                  {currentItem.guest?.avatar && (
                    currentItem.guest.avatar.startsWith("http") ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image src={currentItem.guest.avatar} alt="" width={40} height={40} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-3xl">{currentItem.guest.avatar}</span>
                    )
                  )}
                  <span className="text-white text-xl font-bold drop-shadow">
                    {currentItem.guest?.nickname || "אורח"}
                  </span>
                  {currentItem.isNew && (
                    <span className="btn-gold text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                      חדש! 🔥
                    </span>
                  )}
                </div>
                {currentItem.caption && (
                  <p className="text-gray-200 text-lg mt-2 drop-shadow leading-snug max-w-2xl">
                    {currentItem.caption}
                  </p>
                )}
              </div>

              {/* Counter */}
              <div className={cn(
                "absolute top-14 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-gray-300 z-10 pointer-events-none transition-opacity duration-300",
                controlsVisible ? "opacity-100" : "opacity-0"
              )}>
                {safeIndex + 1} / {filteredItems.length}
              </div>

              {/* Navigation arrows */}
              <button
                onClick={() => advance(-1)}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-all duration-300 z-10",
                  controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <button
                onClick={() => advance(1)}
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-all duration-300 z-10",
                  controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>

              {/* Pause / Play */}
              <button
                onClick={() => setPaused((p) => !p)}
                className={cn(
                  "absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-all duration-300 z-10",
                  controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <BottomNav
        slug={event.slug}
        event={event}
        guestId={guestId}
        guestNickname={guestNickname}
        guestAvatar={guestAvatar}
        adminEventId={isAdmin ? event.id : null}
        adminBypass={isAdmin}
        groupUnreadCount={0}
        onGroupChatOpen={() => {}}
        onUploaded={() => {}}
        onLeave={() => router.back()}
        activeTab="home"
      />
    </div>
  );
}
