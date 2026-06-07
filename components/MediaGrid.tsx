"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, Play, Users, ScanSearch, Loader2, Share2 } from "lucide-react";
import ShareSheet from "@/components/ShareSheet";
import FaceSearch from "@/components/FaceSearch";
import type { Media, GalleryFilter } from "@/types";
import MediaCard from "@/components/MediaCard";
import { cn } from "@/lib/utils";
import { getBlurScore, BLUR_THRESHOLD } from "@/lib/blurDetection";

interface MediaGridProps {
  media: Media[];
  guestId: string;
  eventId: string;
  eventName?: string;
  likedIds: Set<string>;
  onLikeCountChange: (mediaId: string, newCount: number) => void;
  filter: GalleryFilter;
  onFilterChange: (filter: GalleryFilter) => void;
  showFilterByUser?: boolean;
  isAdmin?: boolean;
  onApprove?: (mediaId: string) => void;
  onReject?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
  // Voting
  voteCounts?: Record<string, number>;
  myVotedMediaId?: string | null;
  onVoteChange?: (mediaId: string, delta: number, isNowVoted: boolean) => void;
}

const FILTER_OPTIONS: { value: GalleryFilter; label: string }[] = [
  { value: "newest", label: "חדש ביותר" },
  { value: "most_liked", label: "הכי אהוב" },
  { value: "by_user", label: "שלי" },
];

export default function MediaGrid({
  media,
  guestId,
  eventId,
  eventName = "",
  likedIds,
  onLikeCountChange,
  filter,
  onFilterChange,
  showFilterByUser = true,
  isAdmin = false,
  onApprove,
  onReject,
  onDelete,
  voteCounts = {},
  myVotedMediaId = null,
  onVoteChange,
}: MediaGridProps) {
  const [lightboxMedia, setLightboxMedia] = useState<Media | null>(null);
  const [lightboxShareOpen, setLightboxShareOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showGuestPicker, setShowGuestPicker] = useState(false);
  const [faceMatchIds, setFaceMatchIds] = useState<Set<string> | null>(null);

  // Blur detection
  const [hideBlurry, setHideBlurry] = useState(false);
  const [blurSensitivity, setBlurSensitivity] = useState<"normal" | "high">("normal");
  const [blurScores, setBlurScores] = useState<Map<string, number>>(new Map());
  const [computingBlur, setComputingBlur] = useState(false);

  // Dynamic threshold based on sensitivity
  const activeThreshold = blurSensitivity === "high" ? 350 : BLUR_THRESHOLD;

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

  const filters = showFilterByUser
    ? FILTER_OPTIONS
    : FILTER_OPTIONS.filter((f) => f.value !== "by_user");

  // Unique guests extracted from current media
  const uniqueGuests = Array.from(
    new Map(
      media
        .filter(m => m.guest?.id)
        .map(m => [m.guest!.id, m.guest!])
    ).values()
  );

  // Apply all filters
  const displayMedia = media
    .filter((m) => !selectedGuestId || m.guest?.id === selectedGuestId)
    .filter((m) => !faceMatchIds || faceMatchIds.has(m.id))
    .filter((m) => {
      if (!hideBlurry) return true;
      if (m.media_type === "video") return true;
      const score = blurScores.get(m.id);
      if (score === undefined) return true;
      return score >= activeThreshold;
    });

  const selectedGuest = selectedGuestId
    ? uniqueGuests.find(g => g.id === selectedGuestId)
    : null;

  // Determine winner (most votes, at least 1)
  const winnerId = Object.entries(voteCounts).length > 0
    ? Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const iHaveVoted = !!myVotedMediaId;

  return (
    <>
      {/* Filter tabs + guest filter */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filter === opt.value
                  ? "btn-gold text-white"
                  : "bg-party-surface2 text-gray-400 hover:text-white border border-party-border"
              )}
            >
              {opt.label}
            </button>
          ))}

          {/* Blur filter button */}
          <button
            onClick={() => setHideBlurry((v) => !v)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
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

          {/* Sensitivity toggle — shown only when blur filter is active */}
          {hideBlurry && !computingBlur && (
            <button
              onClick={() => {
                setBlurSensitivity(s => s === "normal" ? "high" : "normal");
                // Re-trigger compute for new threshold
              }}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium border border-party-border bg-party-surface2 text-gray-400 hover:text-white transition-all"
              title="שנה רגישות"
            >
              {blurSensitivity === "normal" ? "🎚 רגיל" : "🎚 גבוה"}
            </button>
          )}

          {/* Face search button */}
          <FaceSearch
            media={media}
            onResults={(ids) => setFaceMatchIds(ids)}
          />

          {/* Guest filter button */}
          {uniqueGuests.length > 1 && (
            <button
              onClick={() => setShowGuestPicker(v => !v)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
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
              ) : "לפי אורח"}
              {selectedGuestId && (
                <span
                  onClick={(e) => { e.stopPropagation(); setSelectedGuestId(null); }}
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
              {uniqueGuests.map(guest => (
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
                    ({media.filter(m => m.guest?.id === guest.id).length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active blur filter label — only when at least 1 image is hidden */}
      {hideBlurry && !computingBlur && (() => {
        const hiddenCount = media.filter(
          (m) =>
            m.media_type !== "video" &&
            blurScores.has(m.id) &&
            blurScores.get(m.id)! < activeThreshold
        ).length;
        if (hiddenCount === 0) return null;
        return (
          <div className="flex items-center gap-2 text-sm text-yellow-300 bg-party-gold/10 border border-party-gold/20 rounded-xl px-3 py-2">
            <ScanSearch className="h-3.5 w-3.5" />
            <span>מסנן מטושטשות ({blurSensitivity === "high" ? "רגישות גבוהה" : "רגישות רגילה"}) — {hiddenCount} הוסתרו</span>
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
          <span className="text-gray-500">({displayMedia.length} פריטים)</span>
          <button onClick={() => setSelectedGuestId(null)} className="mr-auto text-gray-500 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Empty state */}
      {displayMedia.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-6xl opacity-50">📷</div>
          <p className="text-gray-500 text-center">
            {selectedGuestId ? "אין תמונות לאורח זה" : "עדיין לא הועלו תמונות לאירוע"}
          </p>
          {!selectedGuestId && <p className="text-gray-600 text-sm text-center">היה הראשון להעלות!</p>}
        </div>
      )}

      {/* Media grid */}
      {displayMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayMedia.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              guestId={guestId}
              eventId={eventId}
              eventName={eventName}
              isLiked={likedIds.has(item.id)}
              onLikeCountChange={onLikeCountChange}
              onClick={() => setLightboxMedia(item)}
              isAdmin={isAdmin}
              onApprove={onApprove}
              onReject={onReject}
              onDelete={onDelete}
              votesCount={voteCounts[item.id] ?? 0}
              isVotedByMe={myVotedMediaId === item.id}
              iHaveVoted={iHaveVoted}
              isWinner={winnerId === item.id}
              onVoteChange={onVoteChange}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            onClick={() => setLightboxMedia(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.media_type === "video" ? (
              <video
                src={lightboxMedia.file_url}
                controls
                autoPlay
                className="w-full rounded-2xl"
                playsInline
              />
            ) : (
              <div className="relative w-full aspect-square sm:aspect-auto sm:max-h-[80vh]">
                <Image
                  src={lightboxMedia.file_url}
                  alt="תצוגה מלאה"
                  fill
                  className="object-contain rounded-2xl"
                  sizes="100vw"
                />
              </div>
            )}

            <div className="mt-3 px-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lightboxMedia.guest?.avatar && !lightboxMedia.guest.avatar.startsWith("http") && (
                    <span className="text-xl">{lightboxMedia.guest.avatar}</span>
                  )}
                  <p className="text-white font-semibold text-sm">
                    {lightboxMedia.guest?.nickname || "אורח"}
                  </p>
                </div>
                <button
                  onClick={() => setLightboxShareOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 transition-all px-3 py-1.5 rounded-xl"
                >
                  <Share2 className="h-4 w-4" />
                  שתף
                </button>
              </div>
              {lightboxMedia.caption && (
                <p className="text-gray-200 text-sm leading-relaxed">{lightboxMedia.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox share sheet */}
      {lightboxShareOpen && lightboxMedia && (
        <ShareSheet
          media={lightboxMedia}
          eventName={eventName}
          onClose={() => setLightboxShareOpen(false)}
        />
      )}
    </>
  );
}
