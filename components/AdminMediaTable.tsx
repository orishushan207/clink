"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Media } from "@/types";
import { CheckCircle, XCircle, Trash2, Play, Clock, Check, X, Users, ScanSearch, Loader2 } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getBlurScore, BLUR_THRESHOLD } from "@/lib/blurDetection";

interface AdminMediaTableProps {
  media: Media[];
  onApprove: (mediaId: string) => void;
  onReject: (mediaId: string) => void;
  onDelete: (mediaId: string) => void;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminMediaTable({
  media,
  onApprove,
  onReject,
  onDelete,
}: AdminMediaTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  // Blur detection
  const [hideBlurry, setHideBlurry] = useState(false);
  const [blurScores, setBlurScores] = useState<Map<string, number>>(new Map());
  const [computingBlur, setComputingBlur] = useState(false);

  const computeBlurScores = useCallback(async (items: Media[]) => {
    const images = items.filter((m) => m.media_type !== "video");
    const unscored = images.filter((m) => !blurScores.has(m.id));
    if (unscored.length === 0) return;
    setComputingBlur(true);
    const updates = new Map(blurScores);
    await Promise.all(
      unscored.map(async (m) => {
        const score = await getBlurScore(m.file_url);
        updates.set(m.id, score);
      })
    );
    setBlurScores(new Map(updates));
    setComputingBlur(false);
  }, [blurScores]);

  useEffect(() => {
    if (hideBlurry) computeBlurScores(media);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideBlurry, media]);

  // Unique guests from media
  const uniqueGuests = Array.from(
    new Map(
      media
        .filter((m) => m.guest?.id)
        .map((m) => [m.guest!.id, m.guest!])
    ).values()
  );

  const selectedGuest = selectedGuestId
    ? uniqueGuests.find((g) => g.id === selectedGuestId) ?? null
    : null;

  const filtered = media
    .filter((m) => statusFilter === "all" || m.status === statusFilter)
    .filter((m) => !selectedGuestId || m.guest?.id === selectedGuestId)
    .filter((m) => {
      if (!hideBlurry) return true;
      if (m.media_type === "video") return true;
      const score = blurScores.get(m.id);
      if (score === undefined) return true;
      return score >= BLUR_THRESHOLD;
    });

  const guestFilteredMedia = selectedGuestId
    ? media.filter((m) => m.guest?.id === selectedGuestId)
    : media;

  const counts = {
    all: guestFilteredMedia.length,
    pending: guestFilteredMedia.filter((m) => m.status === "pending").length,
    approved: guestFilteredMedia.filter((m) => m.status === "approved").length,
    rejected: guestFilteredMedia.filter((m) => m.status === "rejected").length,
  };

  const statusLabels: Record<StatusFilter, string> = {
    all: "הכל",
    pending: "ממתין",
    approved: "מאושר",
    rejected: "נדחה",
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                  statusFilter === s
                    ? "btn-gold text-white"
                    : "bg-party-surface2 text-gray-400 hover:text-white border border-party-border"
                )}
              >
                {statusLabels[s]}
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                  {counts[s]}
                </span>
              </button>
            )
          )}

          {/* Blur filter button */}
          <button
            onClick={() => setHideBlurry((v) => !v)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
              hideBlurry
                ? "bg-party-gold/20 border-party-gold/50 text-yellow-300"
                : "bg-party-surface2 border-party-border text-gray-400 hover:text-white"
            )}
            title="הסתר תמונות מטושטשות"
          >
            {computingBlur ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanSearch className="h-3.5 w-3.5" />
            )}
            {computingBlur ? "בודק..." : "הסתר מטושטשות"}
          </button>

          {/* Guest filter button */}
          {uniqueGuests.length > 1 && (
            <button
              onClick={() => setShowGuestPicker((v) => !v)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                selectedGuestId
                  ? "bg-party-gold/20 border-party-gold/50 text-yellow-300"
                  : showGuestPicker
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-party-surface2 border-party-border text-gray-400 hover:text-white"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              {selectedGuest ? (
                <span className="flex items-center gap-1">
                  {selectedGuest.avatar && !selectedGuest.avatar.startsWith("http") && (
                    <span>{selectedGuest.avatar}</span>
                  )}
                  {selectedGuest.nickname}
                </span>
              ) : (
                "לפי אורח"
              )}
              {selectedGuestId && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGuestId(null);
                  }}
                  className="mr-1 hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
          )}
        </div>

        {/* Guest picker dropdown */}
        {showGuestPicker && uniqueGuests.length > 1 && (
          <div className="bg-party-surface border border-party-border rounded-2xl p-3 animate-fade-in">
            <p className="text-xs text-gray-500 mb-2.5">בחר אורח לסינון:</p>
            <div className="flex flex-wrap gap-2">
              {uniqueGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => {
                    setSelectedGuestId(selectedGuestId === guest.id ? null : guest.id);
                    setShowGuestPicker(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all border",
                    selectedGuestId === guest.id
                      ? "bg-party-gold/20 border-party-gold/50 text-yellow-300"
                      : "bg-party-surface2 border-party-border text-gray-300 hover:border-party-gold/30 hover:text-white"
                  )}
                >
                  {guest.avatar && (
                    guest.avatar.startsWith("http") ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                        <Image src={guest.avatar} alt="" width={20} height={20} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-base leading-none">{guest.avatar}</span>
                    )
                  )}
                  <span>{guest.nickname}</span>
                  <span className="text-xs text-gray-500">
                    ({media.filter((m) => m.guest?.id === guest.id).length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active blur filter label — only when at least 1 image is hidden */}
        {hideBlurry && !computingBlur && (() => {
          const hiddenCount = media.filter(
            (m) =>
              m.media_type !== "video" &&
              blurScores.has(m.id) &&
              blurScores.get(m.id)! < BLUR_THRESHOLD
          ).length;
          if (hiddenCount === 0) return null;
          return (
            <div className="flex items-center gap-2 text-sm text-yellow-300 bg-party-gold/10 border border-party-gold/20 rounded-xl px-3 py-2">
              <ScanSearch className="h-3.5 w-3.5" />
              <span>מסנן תמונות מטושטשות — {hiddenCount} הוסתרו</span>
              <button onClick={() => setHideBlurry(false)} className="mr-auto text-gray-500 hover:text-white transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })()}

        {/* Active guest filter label */}
        {selectedGuest && (
          <div className="flex items-center gap-2 text-sm text-yellow-300 bg-party-gold/10 border border-party-gold/20 rounded-xl px-3 py-2">
            <Users className="h-3.5 w-3.5" />
            <span>מציג תמונות של <strong>{selectedGuest.nickname}</strong></span>
            <span className="text-gray-500">({filtered.length} פריטים)</span>
            <button
              onClick={() => setSelectedGuestId(null)}
              className="mr-auto text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12">אין פריטים להצגה</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-party-surface border border-party-border rounded-2xl overflow-hidden"
            >
              {/* Preview */}
              <div className="relative aspect-square bg-party-surface2">
                {item.media_type === "video" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-2">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={item.file_url}
                    alt="מדיה"
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                )}

                {/* Status badge */}
                <div
                  className={cn(
                    "absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                    item.status === "pending" &&
                      "bg-amber-500/90 text-white",
                    item.status === "approved" &&
                      "bg-emerald-500/90 text-white",
                    item.status === "rejected" &&
                      "bg-red-500/90 text-white"
                  )}
                >
                  {item.status === "pending" && <Clock className="h-3 w-3" />}
                  {item.status === "approved" && <Check className="h-3 w-3" />}
                  {item.status === "rejected" && <X className="h-3 w-3" />}
                  {item.status === "pending" ? "ממתין" : item.status === "approved" ? "מאושר" : "נדחה"}
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs text-gray-300 truncate flex items-center gap-1">
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
                <p className="text-xs text-gray-600">
                  {formatRelative(item.created_at)}
                </p>

                {/* Action buttons */}
                <div className="flex gap-1 mt-2">
                  {item.status === "pending" && (
                    <>
                      <button
                        onClick={() => onApprove(item.id)}
                        className="flex-1 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                        title="אשר"
                      >
                        <CheckCircle className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => onReject(item.id)}
                        className="flex-1 p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
                        title="דחה"
                      >
                        <XCircle className="h-4 w-4 mx-auto" />
                      </button>
                    </>
                  )}
                  {item.status === "rejected" && (
                    <button
                      onClick={() => onApprove(item.id)}
                      className="flex-1 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs"
                    >
                      אשר
                    </button>
                  )}

                  {/* Delete with confirmation */}
                  {confirmDelete === item.id ? (
                    <>
                      <button
                        onClick={() => {
                          onDelete(item.id);
                          setConfirmDelete(null);
                        }}
                        className="flex-1 p-1.5 rounded-lg bg-red-500/30 text-red-400 text-xs font-medium"
                      >
                        מחק
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 p-1.5 rounded-lg bg-party-surface2 text-gray-400 text-xs"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                      title="מחק"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
