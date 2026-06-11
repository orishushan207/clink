"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  mediaId: string;
  eventId: string;
  guestId: string;
  votesCount: number;
  isVotedByMe: boolean;           // I voted for THIS photo
  iHaveVoted: boolean;            // I voted for ANY photo in this event
  isWinner: boolean;              // This photo has the most votes
  onVoteChange: (mediaId: string, delta: number, isNowVoted: boolean) => void;
}

export default function VoteButton({
  mediaId,
  eventId,
  guestId,
  votesCount,
  isVotedByMe,
  iHaveVoted,
  isWinner,
  onVoteChange,
}: VoteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    const action = isVotedByMe ? "remove" : "cast";
    const previousVoteMediaId = isVotedByMe ? null : mediaId; // track for optimistic UI

    // Optimistic update
    onVoteChange(mediaId, isVotedByMe ? -1 : 1, !isVotedByMe);

    try {
      await fetch(`/api/events/${eventId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, media_id: mediaId, action }),
      });
    } catch {
      // Revert on error
      onVoteChange(mediaId, isVotedByMe ? 1 : -1, isVotedByMe);
    } finally {
      setLoading(false);
    }

    void previousVoteMediaId; // suppress lint
  };

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      title={
        isVotedByMe
          ? "הסר הצבעה"
          : iHaveVoted
          ? "שנה הצבעה לתמונה זו"
          : "הצבע לתמונת האירוע"
      }
      className={cn(
        "flex items-center gap-1 text-xs font-medium transition-all rounded-lg px-2 py-1",
        isVotedByMe
          ? "bg-amber-500/30 text-amber-600 border border-amber-500/50"
          : isWinner && votesCount > 0
          ? "bg-amber-500/10 text-amber-600/70 hover:bg-amber-500/20 border border-amber-500/20"
          : "bg-wedding-bg text-wedding-muted hover:bg-amber-500/10 hover:text-amber-600 border border-wedding-border"
      )}
    >
      <Crown
        className={cn(
          "h-3 w-3 transition-all",
          isVotedByMe ? "fill-amber-400 text-amber-400" : "",
          loading ? "animate-pulse" : ""
        )}
      />
      {votesCount > 0 && <span>{votesCount}</span>}
    </button>
  );
}
