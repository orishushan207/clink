"use client";

import { useState, useCallback, useRef } from "react";
import type { Media } from "@/types";
import { Film, CheckSquare, Square, Play, X, Download, Music, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ClipCreatorProps {
  media: Media[];
  eventName: string;
}

const CANVAS_SIZE = 1080;
const FPS = 30;
const MS_PER_FRAME = 1000 / FPS;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number) {
  const W = CANVAS_SIZE, H = CANVAS_SIZE;
  const scale = Math.max(W / sw, H / sh);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(src, (W - sw * scale) / 2, (H - sh * scale) / 2, sw * scale, sh * scale);
}

function drawTitleCard(ctx: CanvasRenderingContext2D, eventName: string) {
  const W = CANVAS_SIZE, H = CANVAS_SIZE;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#3b0764");
  grad.addColorStop(1, "#831843");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.min(80, Math.floor(W / (eventName.length * 0.6 + 2)))}px Heebo, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(eventName, W / 2, H / 2 - 40);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `36px Heebo, sans-serif`;
  ctx.fillText("Clink • גלריה חיה", W / 2, H / 2 + 60);
}

export default function ClipCreator({ media, eventName }: ClipCreatorProps) {
  const approved = media.filter((m) => m.status === "approved");

  // Ordered selection: array of ids
  const [order, setOrder] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [imageDuration, setImageDuration] = useState(2.5); // seconds per image (1–5)
  const [videoDuration, setVideoDuration] = useState<number | "full">(10); // seconds per video or "full"

  // Drag state
  const dragIndex = useRef<number | null>(null);

  const isSelected = (id: string) => order.includes(id);

  const toggleItem = (id: string) => {
    setOrder(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const removeFromOrder = (id: string) => setOrder(prev => prev.filter(x => x !== id));

  const moveItem = (from: number, to: number) => {
    setOrder(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const toggleAll = () =>
    setOrder(order.length === approved.length ? [] : approved.map(m => m.id));

  // Drag handlers for the order list
  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;
    moveItem(dragIndex.current, idx);
    dragIndex.current = idx;
  };
  const onDragEnd = () => { dragIndex.current = null; };

  const handleCreate = useCallback(async () => {
    if (order.length === 0) { toast.error("בחר לפחות פריט אחד"); return; }
    const items = order.map(id => approved.find(m => m.id === id)!).filter(Boolean);
    const framesPerImage = Math.round(imageDuration * FPS);
    const maxVideoFrames = videoDuration === "full" ? Infinity : Math.round((videoDuration as number) * FPS);

    setCreating(true);
    const toastId = toast.loading("מכין את הקליפ...");

    // Audio setup
    let audioContext: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let audioSource: AudioBufferSourceNode | null = null;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Set up music if provided
      if (musicFile) {
        try {
          audioContext = new AudioContext();
          const arrayBuffer = await musicFile.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioSource = audioContext.createBufferSource();
          audioSource.buffer = audioBuffer;
          audioSource.loop = true;
          audioDestination = audioContext.createMediaStreamDestination();
          audioSource.connect(audioDestination);
        } catch {
          toast.error("שגיאה בטעינת המוזיקה — ממשיך בלי", { id: toastId });
          audioContext = null; audioDestination = null;
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";

      const videoStream = canvas.captureStream(FPS);
      const allTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
      if (audioDestination) {
        allTracks.push(audioDestination.stream.getAudioTracks()[0]);
      }
      const combinedStream = new MediaStream(allTracks);

      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(200);

      // Start music playback
      if (audioSource && audioContext) {
        audioSource.start(0);
      }

      // Title card (2 sec)
      setProgress({ current: 0, total: items.length + 1, label: "כותרת..." });
      toast.loading("מוסיף כותרת...", { id: toastId });
      for (let f = 0; f < FPS * 2; f++) {
        drawTitleCard(ctx, eventName);
        await sleep(MS_PER_FRAME);
      }

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const label = item.media_type === "image" ? `תמונה ${i + 1}/${items.length}` : `סרטון ${i + 1}/${items.length}`;
        setProgress({ current: i + 1, total: items.length + 1, label });
        toast.loading(label, { id: toastId });

        if (item.media_type === "image") {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
              for (let f = 0; f < framesPerImage; f++) {
                drawCover(ctx, img, img.naturalWidth, img.naturalHeight);
                await sleep(MS_PER_FRAME);
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = item.file_url;
          });
        } else {
          await new Promise<void>((resolve) => {
            const video = document.createElement("video");
            video.crossOrigin = "anonymous";
            video.muted = true;
            video.playsInline = true;
            video.src = item.file_url;
            let frames = 0;
            let interval: ReturnType<typeof setInterval>;
            const stop = () => { clearInterval(interval); video.pause(); resolve(); };
            video.oncanplay = () => {
              video.play().then(() => {
                interval = setInterval(() => {
                  if (video.ended || frames >= maxVideoFrames) { stop(); return; }
                  if (video.videoWidth && video.videoHeight) drawCover(ctx, video, video.videoWidth, video.videoHeight);
                  frames++;
                }, MS_PER_FRAME);
              }).catch(() => resolve());
            };
            video.onerror = () => resolve();
            const timeoutFrames = isFinite(maxVideoFrames) ? maxVideoFrames + 60 : 30 * FPS + 60;
            setTimeout(stop, timeoutFrames * MS_PER_FRAME);
          });
        }
      }

      // Black fade out
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      await sleep(600);

      const blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder.stop();
      });

      audioSource?.stop();
      audioContext?.close();

      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${eventName.replace(/[^a-zA-Z0-9֐-׿_-]/g, "_")}_clip.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`הקליפ מוכן! ${items.length} פריטים 🎬`, { id: toastId });
      setOrder([]);
      setMusicFile(null);
    } catch (err) {
      console.error("Clip error:", err);
      audioSource?.stop();
      audioContext?.close();
      toast.error("שגיאה ביצירת הקליפ", { id: toastId });
    } finally {
      setCreating(false);
      setProgress(null);
    }
  }, [order, approved, eventName, musicFile, imageDuration, videoDuration]);

  if (approved.length === 0) return null;

  const orderedItems = order.map(id => approved.find(m => m.id === id)!).filter(Boolean);
  const unselected = approved.filter(m => !order.includes(m.id));

  return (
    <div className="wedding-card border border-wedding-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-wedding-accent/10 transition-all"
      >
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-wedding-ink">🎬 יצירת קליפ</span>
          <span className="text-xs text-wedding-muted bg-wedding-bg px-2 py-0.5 rounded-full border border-wedding-border">
            {approved.length} זמינים
          </span>
        </div>
        <span className="text-wedding-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-wedding-border pt-4 space-y-4">
          <p className="text-xs text-wedding-muted leading-relaxed">
            בחר פריטים מהגריד וגרור לשינוי הסדר. ניתן לשלוט על משך כל תמונה וסרטון.
          </p>

          {/* ── ORDER LIST (selected items) ── */}
          {orderedItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-wedding-muted">סדר הקליפ ({orderedItems.length} פריטים)</p>
                <button onClick={() => setOrder([])} className="text-xs text-red-400 hover:text-red-300 transition-colors">נקה הכל</button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                {orderedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, idx)}
                    onDragOver={(e) => onDragOver(e, idx)}
                    onDragEnd={onDragEnd}
                    className="flex items-center gap-2 bg-wedding-bg border border-wedding-border rounded-xl px-2 py-1.5 cursor-grab active:cursor-grabbing group"
                  >
                    <GripVertical className="h-4 w-4 text-wedding-muted flex-shrink-0" />
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                      {item.media_type === "video" ? (
                        item.thumbnail_url
                          ? <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Play className="h-3 w-3 text-wedding-muted" /></div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-xs text-wedding-ink flex-1 truncate">
                      {item.guest?.nickname || "אורח"} {item.media_type === "video" ? "🎬" : "📸"}
                    </span>
                    <span className="text-xs text-wedding-muted">#{idx + 1}</span>
                    {/* Up/Down */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => idx > 0 && moveItem(idx, idx - 1)} disabled={idx === 0} className="text-wedding-muted hover:text-wedding-ink disabled:opacity-20">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => idx < orderedItems.length - 1 && moveItem(idx, idx + 1)} disabled={idx === orderedItems.length - 1} className="text-wedding-muted hover:text-wedding-ink disabled:opacity-20">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromOrder(item.id)} className="text-wedding-muted hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AVAILABLE GRID ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-wedding-muted">הוסף לקליפ</p>
              <button onClick={toggleAll} className="flex items-center gap-1 text-xs text-wedding-accent hover:text-wedding-accent-dark transition-colors">
                {order.length === approved.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {order.length === approved.length ? "בטל הכל" : "בחר הכל"}
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto scrollbar-hide">
              {approved.map((item) => {
                const sel = isSelected(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      sel ? "border-wedding-accent opacity-50" : "border-transparent hover:border-wedding-accent/30"
                    )}
                  >
                    {item.media_type === "video" ? (
                      <div className="w-full h-full bg-wedding-bg flex items-center justify-center">
                        {item.thumbnail_url
                          ? <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          : <Play className="h-4 w-4 text-wedding-muted" />}
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                    )}
                    {sel && (
                      <div className="absolute inset-0 bg-wedding-accent/20 flex items-center justify-center">
                        <CheckSquare className="h-4 w-4 text-wedding-accent-dark" />
                      </div>
                    )}
                    {item.media_type === "video" && !sel && (
                      <div className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white rounded px-1">🎬</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── DURATION SETTINGS ── */}
          <div className="p-3 bg-wedding-bg border border-wedding-border rounded-xl space-y-4">
            <p className="text-xs font-medium text-wedding-muted">הגדרות משך</p>

            {/* Image duration */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-wedding-muted">📸 משך תמונה</span>
                <span className="text-xs font-semibold text-wedding-ink">{imageDuration} שניות</span>
              </div>
              <input
                type="range"
                min={1} max={5} step={0.5}
                value={imageDuration}
                onChange={e => setImageDuration(Number(e.target.value))}
                className="w-full accent-wedding-accent"
              />
              <div className="flex justify-between text-[10px] text-wedding-muted mt-0.5">
                <span>1s</span><span>5s</span>
              </div>
            </div>

            {/* Video duration */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-wedding-muted">🎬 משך סרטון</span>
                <span className="text-xs font-semibold text-wedding-ink">
                  {videoDuration === "full" ? "אורך מלא" : `${videoDuration} שניות`}
                </span>
              </div>
              <input
                type="range"
                min={1} max={31} step={1}
                value={videoDuration === "full" ? 31 : videoDuration as number}
                onChange={e => {
                  const v = Number(e.target.value);
                  setVideoDuration(v >= 31 ? "full" : v);
                }}
                className="w-full accent-wedding-accent"
              />
              <div className="flex justify-between text-[10px] text-wedding-muted mt-0.5">
                <span>1s</span><span>30s</span><span>מלא</span>
              </div>
            </div>
          </div>

          {/* ── MUSIC ── */}
          <div className="p-3 bg-wedding-bg border border-wedding-border rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-wedding-muted flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-amber-500" />
                מוזיקת רקע (לא חובה)
              </p>
              {musicFile && (
                <button onClick={() => setMusicFile(null)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  הסר
                </button>
              )}
            </div>
            {musicFile ? (
              <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1.5">
                🎵 {musicFile.name}
              </p>
            ) : (
              <button
                onClick={() => musicInputRef.current?.click()}
                className="mt-2 text-xs text-wedding-muted hover:text-wedding-ink border border-dashed border-wedding-border hover:border-wedding-accent/40 rounded-lg px-3 py-2 w-full transition-all"
              >
                + בחר קובץ MP3 / M4A / WAV
              </button>
            )}
            <input
              ref={musicInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setMusicFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* ── PROGRESS ── */}
          {creating && progress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-wedding-muted">
                <span>{progress.label}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <div className="h-1.5 bg-wedding-accent/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-wedding-accent-light to-amber-400 transition-all duration-300 rounded-full"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-wedding-muted text-center">
                יצירת קליפ עשויה לקחת מספר דקות
              </p>
            </div>
          )}

          {/* ── CREATE BUTTON ── */}
          <button
            onClick={handleCreate}
            disabled={creating || order.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 btn-gold disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-wedding-accent/20"
          >
            {creating
              ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Download className="h-4 w-4" />}
            {creating ? "יוצר קליפ..." : `צור קליפ (${order.length} פריטים${musicFile ? " + מוזיקה" : ""})`}
          </button>
        </div>
      )}
    </div>
  );
}
