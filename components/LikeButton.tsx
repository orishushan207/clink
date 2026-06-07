"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { likeMedia, unlikeMedia, getMediaLikers } from "@/lib/likes";

interface LikeButtonProps {
  mediaId: string;
  guestId: string;
  eventId: string;
  initialCount: number;
  initialLiked?: boolean;
  onCountChange?: (newCount: number) => void;
}

export default function LikeButton({
  mediaId,
  guestId,
  eventId,
  initialCount,
  initialLiked = false,
  onCountChange,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<{ nickname: string; avatar: string | null }[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : Math.max(0, count - 1);
    setLiked(newLiked);
    setCount(newCount);
    onCountChange?.(newCount);

    try {
      if (newLiked) {
        await likeMedia(mediaId, guestId, eventId);
      } else {
        await unlikeMedia(mediaId, guestId);
      }
    } catch {
      setLiked(liked);
      setCount(count);
      onCountChange?.(count);
    } finally {
      setLoading(false);
    }
  };

  const handleShowLikers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count === 0) return;
    setShowLikers(true);
    setLoadingLikers(true);
    const data = await getMediaLikers(mediaId);
    setLikers(data);
    setLoadingLikers(false);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Heart toggle */}
        <button
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-90",
            liked
              ? "text-amber-400 bg-amber-500/15"
              : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/10"
          )}
        >
          <Heart className={cn("h-4 w-4 transition-all", liked && "fill-pink-400")} />
        </button>

        {/* Count — clickable to see likers */}
        <button
          onClick={handleShowLikers}
          disabled={count === 0}
          className={cn(
            "min-w-[1.25rem] h-6 px-1.5 rounded-lg text-xs font-semibold tabular-nums transition-all border",
            count > 0
              ? "text-amber-400 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 active:scale-95"
              : "text-gray-500 border-white/10 cursor-default"
          )}
        >
          {count}
        </button>
      </div>

      {/* Likers modal */}
      {showLikers && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLikers(false)}
        >
          <div
            className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-t-3xl p-6 pb-10 max-h-[60vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Heart className="h-4 w-4 fill-pink-400 text-amber-400" />
                {count} לייקים
              </h3>
              <button
                onClick={() => setShowLikers(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingLikers ? (
              <div className="text-center text-gray-400 py-6">טוען...</div>
            ) : likers.length === 0 ? (
              <div className="text-center text-gray-400 py-6">אין לייקים עדיין</div>
            ) : (
              <ul className="space-y-3">
                {likers.map((liker, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                      {liker.avatar?.startsWith("http") ? (
                        <Image src={liker.avatar} alt={liker.nickname} width={36} height={36} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{liker.avatar || "👤"}</span>
                      )}
                    </div>
                    <span className="text-white font-medium">{liker.nickname}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
