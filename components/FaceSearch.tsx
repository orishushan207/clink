"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Camera, ScanFace, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Media } from "@/types";
import { cn } from "@/lib/utils";

// Models are loaded from jsDelivr CDN — no local files needed
const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

interface FaceSearchProps {
  media: Media[];
  onResults: (matchedIds: Set<string> | null) => void; // null = clear filter
}

type Step = "idle" | "loading_models" | "capture" | "scanning" | "done" | "error";

export default function FaceSearch({ media, onResults }: FaceSearchProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selfieDescriptor = useRef<Float32Array | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setStep("idle");
    setMatchCount(null);
    setErrorMsg("");
    onResults(null);
  };

  const handleClose = () => {
    stopCamera();
    setOpen(false);
    setStep("idle");
  };

  const handleClear = () => {
    onResults(null);
    setMatchCount(null);
    setStep("idle");
    setOpen(false);
  };

  const startCamera = async () => {
    setStep("loading_models");
    setErrorMsg("");

    try {
      // Lazy-load face-api.js
      const faceapi = (await import("face-api.js")).default;

      // Load models from CDN (cached after first load)
      if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      }

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 320 },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStep("capture");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setErrorMsg("נא לאפשר גישה למצלמה");
      } else if (msg.includes("model")) {
        setErrorMsg("שגיאה בטעינת מודל ה-AI. בדוק חיבור לאינטרנט.");
      } else {
        setErrorMsg("שגיאה בפתיחת המצלמה");
      }
      setStep("error");
    }
  };

  const takeSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setStep("scanning");

    try {
      const faceapi = (await import("face-api.js")).default;
      const video = videoRef.current;

      // Draw current frame to canvas
      const ctx = canvasRef.current.getContext("2d")!;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      stopCamera();

      // Detect face in selfie
      const selfieDetection = await faceapi
        .detectSingleFace(canvasRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!selfieDetection) {
        setErrorMsg("לא זוהה פנים בתמונה. נסה שוב עם תאורה טובה יותר.");
        setStep("error");
        return;
      }

      selfieDescriptor.current = selfieDetection.descriptor;

      // Now scan gallery images
      const images = media.filter((m) => m.media_type === "image");
      const THRESHOLD = 0.55; // lower = stricter match
      const matched = new Set<string>();

      for (let i = 0; i < images.length; i++) {
        setProgress(Math.round(((i + 1) / images.length) * 100));

        const item = images[i];
        try {
          const img = await loadImageElement(item.file_url);
          const detections = await faceapi
            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
            .withFaceLandmarks()
            .withFaceDescriptors();

          for (const det of detections) {
            const distance = faceapi.euclideanDistance(selfieDescriptor.current!, det.descriptor);
            if (distance < THRESHOLD) {
              matched.add(item.id);
              break;
            }
          }
        } catch {
          // Skip images that fail to load
        }
      }

      setMatchCount(matched.size);
      onResults(matched);
      setStep("done");
    } catch (err) {
      console.error("Face scan error:", err);
      setErrorMsg("שגיאה בעיבוד הפנים. נסה שוב.");
      setStep("error");
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={matchCount !== null ? handleClear : handleOpen}
        className={cn(
          "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
          matchCount !== null
            ? "bg-wedding-accent/20 border-wedding-accent/50 text-wedding-accent-dark"
            : "wedding-card border-wedding-border text-wedding-muted hover:text-wedding-ink"
        )}
        title="מצא תמונות שאתה מופיע בהן"
      >
        <ScanFace className="h-3.5 w-3.5" />
        {matchCount !== null ? (
          <span className="flex items-center gap-1">
            {matchCount} תמונות שלי <X className="h-3 w-3" />
          </span>
        ) : "חפש אותי"}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full sm:max-w-sm wedding-card border border-wedding-border rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-wedding-ink text-lg flex items-center gap-2">
                  <ScanFace className="h-5 w-5 text-wedding-accent" />
                  חפש אותי בתמונות
                </h3>
                <p className="text-xs text-wedding-muted mt-0.5">AI מזהה את הפנים שלך בכל הגלריה</p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-wedding-accent/10 text-wedding-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content per step */}
            {step === "idle" && (
              <div className="space-y-3">
                <div className="bg-wedding-accent/10 border border-wedding-accent/20 rounded-2xl p-4 text-sm text-wedding-accent-dark space-y-1.5">
                  <p>📸 צלם סלפי</p>
                  <p>🤖 ה-AI ימפה את הפנים שלך</p>
                  <p>🔍 ויחפש אותך בכל {media.filter(m => m.media_type === "image").length} התמונות</p>
                </div>
                <button
                  onClick={startCamera}
                  className="w-full btn-gold text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  <Camera className="h-5 w-5" />
                  פתח מצלמה
                </button>
              </div>
            )}

            {step === "loading_models" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 text-wedding-accent animate-spin" />
                <p className="text-sm text-wedding-muted">טוען מודל AI...</p>
                <p className="text-xs text-wedding-muted/70">~5 שניות בפעם הראשונה</p>
              </div>
            )}

            {step === "capture" && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    muted
                    playsInline
                  />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-wedding-accent/60 rounded-full" />
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={takeSelfie}
                  className="w-full btn-gold text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  צלם ואתחל חיפוש
                </button>
              </div>
            )}

            {step === "scanning" && (
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center gap-3">
                  <ScanFace className="h-8 w-8 text-wedding-accent animate-pulse" />
                  <p className="text-sm text-wedding-ink font-medium">סורק {media.filter(m => m.media_type === "image").length} תמונות...</p>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-wedding-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-wedding-accent-light to-wedding-accent rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-wedding-muted text-center">{progress}%</p>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {step === "done" && (
              <div className="space-y-4">
                <div className={cn(
                  "rounded-2xl p-4 text-center",
                  matchCount! > 0
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-wedding-accent/5 border border-wedding-border"
                )}>
                  <div className="text-4xl mb-2">{matchCount! > 0 ? "🎉" : "🔍"}</div>
                  <p className="text-wedding-ink font-bold text-lg">
                    {matchCount! > 0 ? `נמצאו ${matchCount} תמונות!` : "לא נמצאו תמונות"}
                  </p>
                  <p className="text-xs text-wedding-muted mt-1">
                    {matchCount! > 0 ? "הגלריה מסוננת לתמונות שלך" : "ייתכן שאין תמונות שלך, או שהאיכות נמוכה"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleClose} className="flex-1 py-2.5 bg-wedding-accent hover:bg-wedding-accent-dark text-white rounded-2xl text-sm font-medium transition-all">
                    הצג תוצאות
                  </button>
                  <button onClick={() => { setStep("idle"); onResults(null); }} className="flex-1 py-2.5 bg-wedding-bg border border-wedding-border text-wedding-ink rounded-2xl text-sm transition-all">
                    נסה שוב
                  </button>
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="text-red-500 text-sm">{errorMsg}</p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="w-full py-2.5 bg-wedding-bg border border-wedding-border text-wedding-ink rounded-2xl text-sm"
                >
                  נסה שוב
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Helper — loads an image URL into an HTMLImageElement
function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
    // Timeout after 8s
    setTimeout(() => reject(new Error("timeout")), 8000);
  });
}
