"use client";

import Image from "next/image";
import type { LeaderboardEntry } from "@/types";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentGuestId?: string;
}

const rankColors = [
  "from-yellow-400 to-amber-500",   // 1st
  "from-gray-300 to-gray-400",       // 2nd
  "from-amber-600 to-amber-700",     // 3rd
];


export default function LeaderboardTable({
  entries,
  currentGuestId,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏆</div>
        <p className="text-gray-500">עוד אין נתונים</p>
        <p className="text-gray-600 text-sm mt-1">
          העלה תמונות וצבור נקודות!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="col-span-2 text-center">מקום</div>
        <div className="col-span-4">כינוי</div>
        <div className="col-span-2 text-center">העלאות</div>
        <div className="col-span-2 text-center">לייקים</div>
        <div className="col-span-2 text-center">ניקוד</div>
      </div>

      {/* Rows */}
      {entries.map((entry) => {
        const isTop3 = entry.rank <= 3;

        const isCurrentGuest = entry.guest_id === currentGuestId;

        return (
          <div
            key={entry.guest_id}
            className={cn(
              "grid grid-cols-12 gap-2 items-center p-4 rounded-2xl border transition-all",
              isCurrentGuest
                ? "border-party-gold/50 bg-party-gold/10"
                : "border-party-border bg-party-surface hover:border-white/10",
              isTop3 && "border-opacity-30"
            )}
          >
            {/* Rank */}
            <div className="col-span-2 flex justify-center">
              {isTop3 ? (
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br font-bold text-white text-sm",
                    rankColors[entry.rank - 1]
                  )}
                >
                  {entry.rank}
                </div>
              ) : (
                <span className="text-gray-500 font-mono text-sm w-8 text-center">
                  {entry.rank}
                </span>
              )}
            </div>

            {/* Nickname */}
            <div className="col-span-4 flex items-center gap-2">
              {entry.avatar && (
                entry.avatar.startsWith("http") ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={entry.avatar} alt={entry.nickname} width={28} height={28} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="text-lg">{entry.avatar}</span>
                )
              )}
              <span
                className={cn(
                  "font-medium truncate",
                  isCurrentGuest ? "text-yellow-300" : "text-white"
                )}
              >
                {entry.nickname}
                {isCurrentGuest && (
                  <span className="text-xs text-yellow-400 mr-1">(אתה)</span>
                )}
              </span>
            </div>

            {/* Uploads */}
            <div className="col-span-2 text-center">
              <span className="text-white font-semibold tabular-nums">
                {entry.total_uploads}
              </span>
            </div>

            {/* Likes */}
            <div className="col-span-2 text-center">
              <span className="text-amber-400 font-semibold tabular-nums">
                {entry.total_likes}
              </span>
            </div>

            {/* Score */}
            <div className="col-span-2 text-center">
              <span
                className={cn(
                  "font-bold tabular-nums text-base",
                  isTop3
                    ? `bg-gradient-to-r ${rankColors[entry.rank - 1]} bg-clip-text text-transparent`
                    : "text-gray-300"
                )}
              >
                {entry.score}
              </span>
            </div>
          </div>
        );
      })}

      {/* Scoring legend */}
      <div className="mt-6 p-4 bg-party-surface2 rounded-2xl border border-party-border">
        <p className="text-xs font-medium text-gray-400 mb-2">שיטת הניקוד:</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span>📸 תמונה = 1 נקודה</span>
          <span>🎬 סרטון = 3 נקודות</span>
          <span>❤️ לייק שקיבלת = 1 נקודה</span>
        </div>
      </div>
    </div>
  );
}
