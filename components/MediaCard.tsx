"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Flag, Clock, Trash2, CheckCircle, XCircle, MessageCircle, Download, Share2, AlertTriangle } from "lucide-react";
import type { Media } from "@/types";
import LikeButton from "@/components/LikeButton";
import VoteButton from "@/components/VoteButton";
import ReportModal from "@/components/ReportModal";
import CommentsSheet from "@/components/CommentsSheet";
import ShareSheet from "@/components/ShareSheet";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  media: Media;
  guestId: string;
  eventId: string;
  eventName?: string;
  isLiked?: boolean;
  onLikeCountChange?: (mediaId: string, newCount: number) => void;
  onClick?: () => void;
  // Voting
  votesCount?: number;
  isVotedByMe?: boolean;
  iHaveVoted?: boolean;
  isWinner?: boolean;
  onVoteChange?: (mediaId: string, delta: number, isNowVoted: boolean) => void;
  // Admin props
  isAdmin?: boolean;
  onApprove?: (mediaId: string) => void;
  onReject?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
}

export default function MediaCard({
  media,
  guestId,
  eventId,
  eventName = "",
  isLiked = false,
  onLikeCountChange,
  onClick,
  votesCount = 0,
  isVotedByMe = false,
  iHaveVoted = false,
  isWinner = false,
  onVoteChange,
  isAdmin = false,
  onApprove,
  onReject,
  onDelete,
}: MediaCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(media.file_url);
      const blob = await res.blob();
      const ext = media.file_url.split(".").pop()?.split("?")[0] ?? (isVideo ? "mp4" : "jpg");
      const nickname = (media.guest?.nickname || "media").replace(/[^a-zA-Z0-9֐-׿_-]/g, "_");
      const filename = `${nickname}_${media.id.slice(0, 6)}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement("a");
      a.href = media.file_url;
      a.download = "";
      a.target = "_blank";
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const guest = media.guest;
  const isVideo = media.media_type === "video";
  const isPending = media.status === "pending";
  const isRejected = media.status === "rejected";
  const isOwner = !isAdmin && media.guest_id === guestId;

  return (
    <>
      <div
        className={cn(
          "group relative bg-party-surface border border-party-border rounded-2xl overflow-hidden transition-all hover:border-party-gold/30",
          (isPending || isRejected) && "opacity-75",
          isWinner && votesCount > 0 && "border-amber-500/40 shadow-lg shadow-amber-500/10"
        )}
      >
        {/* Winner crown badge */}
        {isWinner && votesCount > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-amber-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            👑 תמונת האירוע
          </div>
        )}

        {/* Media Preview */}
        <div
          className="relative aspect-square cursor-pointer overflow-hidden bg-party-surface2"
          onClick={onClick}
        >
          {isVideo ? (
            <>
              <video
                src={media.file_url}
                className="w-full h-full object-cover"
                preload="metadata"
                poster={media.thumbnail_url ?? undefined}
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-3">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
            </>
          ) : (
            <Image
              src={media.file_url}
              alt={`תמונה מאת ${guest?.nickname || "אורח"}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Status badges */}
          {isPending && (
            <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ממתין
            </div>
          )}
          {isRejected && (
            <div className="absolute top-2 right-2 bg-red-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium">
              נדחה
            </div>
          )}
          {/* Uploader + caption overlay at bottom of image */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-8 pb-2.5 px-2.5">
            <div className="flex items-center gap-1.5">
              {guest?.avatar && (
                guest.avatar.startsWith("http") ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-white/30">
                    <Image src={guest.avatar} alt={guest.nickname || ""} width={20} height={20} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="text-sm leading-none">{guest.avatar}</span>
                )
              )}
              <p className="text-xs font-semibold text-white truncate drop-shadow">{guest?.nickname || "אורח"}</p>
              <p className="text-[10px] text-white/50 flex-shrink-0">{formatRelative(media.created_at)}</p>
            </div>
            {media.caption && (
              <p className="text-xs text-white/90 mt-1 leading-snug line-clamp-2 drop-shadow">{media.caption}</p>
            )}
          </div>

          {isVideo && (
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
              🎬 סרטון
            </div>
          )}
        </div>

        {/* Card footer — actions only */}
        <div className="p-3">
          {/* Actions row */}
          <div className="flex items-center overflow-x-auto scrollbar-hide gap-1">
            <LikeButton
              mediaId={media.id}
              guestId={guestId}
              eventId={eventId}
              initialCount={media.likes_count}
              initialLiked={isLiked}
              onCountChange={(newCount) => onLikeCountChange?.(media.id, newCount)}
            />

            {!isAdmin && (
              <>
                {/* Comments */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCommentsOpen(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-gray-400 hover:text-yellow-400 transition-colors hover:bg-party-gold/10 flex-shrink-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCommentsOpen(true)}
                    className={cn(
                      "min-w-[1.25rem] h-6 px-1.5 rounded-lg text-xs font-semibold tabular-nums transition-all border flex-shrink-0",
                      "text-yellow-400 border-party-gold/30 hover:border-party-gold/60 hover:bg-party-gold/10 active:scale-95"
                    )}
                  >
                    {commentCount}
                  </button>
                </div>

                {/* Vote */}
                {onVoteChange && (
                  <VoteButton
                    mediaId={media.id}
                    eventId={eventId}
                    guestId={guestId}
                    votesCount={votesCount}
                    isVotedByMe={isVotedByMe}
                    iHaveVoted={iHaveVoted}
                    isWinner={isWinner}
                    onVoteChange={onVoteChange}
                  />
                )}

                {/* Share */}
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-party-gold/10 whitespace-nowrap flex-shrink-0"
                  title="שתף"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-party-gold/10 whitespace-nowrap flex-shrink-0 disabled:opacity-40"
                >
                  {downloading
                    ? <span className="h-3.5 w-3.5 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                </button>

                {/* Report */}
                <button
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10 whitespace-nowrap flex-shrink-0"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>

                {/* Owner delete */}
                {isOwner && onDelete && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10 whitespace-nowrap flex-shrink-0"
                    title="מחק תמונה שלי"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex items-center gap-1">
                {isPending && (
                  <>
                    <button onClick={() => onApprove?.(media.id)} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors" title="אשר">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => onReject?.(media.id)} className="p-1.5 rounded-lg hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 transition-colors" title="דחה">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button onClick={() => onDelete?.(media.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="מחק">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <h3 className="text-white font-bold mb-1">מחיקת תמונה</h3>
            <p className="text-gray-400 text-sm mb-5">פעולה זו תמחק את התמונה לצמיתות ולא ניתן לשחזרה.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-all"
              >
                ביטול
              </button>
              <button
                onClick={() => { setDeleteConfirm(false); onDelete?.(media.id); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold transition-all"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} mediaId={media.id} guestId={guestId} eventId={eventId} />
      <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} mediaId={media.id} guestId={guestId} eventId={eventId} onCountChange={setCommentCount} />
      {shareOpen && <ShareSheet media={media} eventName={eventName} onClose={() => setShareOpen(false)} />}
    </>
  );
}
