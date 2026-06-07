"use client";

import { useRef, useState } from "react";
import { Camera, Images } from "lucide-react";
import { uploadMedia } from "@/lib/media";
import type { Media } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface MediaUploadButtonProps {
  eventId: string;
  guestId: string;
  allowVideo: boolean;
  requireApproval: boolean;
  onUploaded: (media: Media) => void;
  uploadsOpen: boolean;
}

export default function MediaUploadButton({
  eventId,
  guestId,
  allowVideo,
  requireApproval,
  onUploaded,
  uploadsOpen,
}: MediaUploadButtonProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<{ current: number; total: number; percent: number } | null>(null);

  const acceptedTypes = allowVideo
    ? "image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
    : "image/jpeg,image/jpg,image/png,image/webp";

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!uploadsOpen) {
      toast.error("העלאות לאירוע זה נסגרו");
      return;
    }

    const fileArray = Array.from(files);
    const total = fileArray.length;

    setUploading(true);
    setUploadState({ current: 0, total, percent: 0 });

    let successCount = 0;
    let failCount = 0;

    const toastId = toast.loading(
      total === 1 ? "מעלה קובץ..." : `מעלה 0 מתוך ${total}...`
    );

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadState({ current: i + 1, total, percent: 0 });

      try {
        const media = await uploadMedia({
          file,
          eventId,
          guestId,
          allowVideo,
          requireApproval,
          onProgress: ({ percent }) =>
            setUploadState({ current: i + 1, total, percent }),
        });

        successCount++;
        if (!requireApproval) onUploaded(media);

        if (total > 1) {
          toast.loading(`מעלה ${i + 1} מתוך ${total}...`, { id: toastId });
        }
      } catch (err) {
        failCount++;
        const msg = err instanceof Error ? err.message : "שגיאה בהעלאה";
        if (total === 1) toast.error(msg, { id: toastId });
      }
    }

    toast.dismiss(toastId);

    if (total === 1) {
      if (successCount === 1) {
        if (requireApproval) {
          toast("הקובץ עלה וממתין לאישור ✅", { icon: "⏳", duration: 4000 });
        } else {
          toast.success("הקובץ עלה בהצלחה! 🎉");
        }
      }
    } else {
      if (failCount === 0) {
        if (requireApproval) {
          toast(`${successCount} קבצים עלו וממתינים לאישור ✅`, { icon: "⏳", duration: 4000 });
        } else {
          toast.success(`${successCount} קבצים עלו בהצלחה! 🎉`);
        }
      } else {
        toast(`${successCount} קבצים עלו, ${failCount} נכשלו`, { icon: "⚠️", duration: 5000 });
      }
    }

    setUploading(false);
    setUploadState(null);
  };

  const handleClick = (mode: "camera" | "gallery") => {
    if (!uploadsOpen) {
      toast.error("העלאות לאירוע זה נסגרו");
      return;
    }
    if (mode === "camera") cameraRef.current?.click();
    else galleryRef.current?.click();
  };

  const progressPercent = uploadState
    ? uploadState.total === 1
      ? uploadState.percent
      : Math.round(((uploadState.current - 1) / uploadState.total) * 100)
    : 0;

  const label = uploadState
    ? uploadState.total === 1
      ? uploadState.percent > 0 ? `${uploadState.percent}%` : "מעלה..."
      : `${uploadState.current} / ${uploadState.total}`
    : null;

  return (
    <div className="flex gap-2">
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept={acceptedTypes}
        capture="environment"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept={acceptedTypes}
        multiple
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        className="hidden"
      />

      {/* Camera button */}
      <button
        onClick={() => handleClick("camera")}
        disabled={uploading}
        className={cn(
          "relative flex items-center gap-2 px-4 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 overflow-hidden",
          "btn-gold",
          "shadow-lg shadow-party-gold/30",
          uploading && "opacity-60 cursor-wait"
        )}
      >
        <Camera className="h-5 w-5" stroke="white" strokeWidth={2} />
        <span>מצלמה</span>
      </button>

      {/* Gallery / bulk upload button */}
      <button
        onClick={() => handleClick("gallery")}
        disabled={uploading}
        className={cn(
          "relative flex items-center gap-2 px-4 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 overflow-hidden flex-1 justify-center",
          "btn-gold",
          "shadow-lg shadow-party-gold/30",
          uploading && "opacity-60 cursor-wait"
        )}
      >
        {/* Progress bar */}
        {uploading && (
          <div
            className="absolute inset-0 bg-white/20 transition-all duration-300"
            style={{ width: `${progressPercent}%`, transformOrigin: "left" }}
          />
        )}
        <div className="relative flex items-center gap-2">
          <Images className="h-5 w-5" />
          <span>{uploading && label ? label : "גלריה"}</span>
        </div>
      </button>
    </div>
  );
}
