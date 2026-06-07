"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { OnlineUser } from "@/hooks/usePresence";

interface PresenceBarProps {
  onlineUsers: OnlineUser[];
  currentGuestId: string;
}

export default function PresenceBar({ onlineUsers, currentGuestId }: PresenceBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (onlineUsers.length === 0) return null;

  const others = onlineUsers.filter((u) => u.guestId !== currentGuestId);
  const total = onlineUsers.length;

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-right"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all",
          "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
        )}
      >
        {/* Pulse dot */}
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>

        {/* Avatars row */}
        <div className="flex -space-x-1.5 rtl:space-x-reverse rtl:-space-x-1.5 flex-shrink-0">
          {onlineUsers.slice(0, 5).map((u) => (
            <div
              key={u.guestId}
              className="w-6 h-6 rounded-full bg-party-surface2 border border-emerald-500/30 flex items-center justify-center text-sm"
              title={u.nickname}
            >
              {u.avatar && !u.avatar.startsWith("http") ? (
                <span className="text-xs leading-none">{u.avatar}</span>
              ) : (
                <span className="text-xs text-gray-400">
                  {u.nickname.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {total > 5 && (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-xs text-emerald-400">+{total - 5}</span>
            </div>
          )}
        </div>

        <span className="text-sm text-emerald-300 flex-1">
          {total === 1
            ? "רק אתה כאן כרגע"
            : others.length === 0
            ? `${total} אורחים מחוברים`
            : `${total} אורחים מחוברים עכשיו`}
        </span>

        <span className="text-xs text-gray-500">{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="mt-2 bg-party-surface border border-party-border rounded-2xl p-3 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((u) => (
              <div
                key={u.guestId}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm border",
                  u.guestId === currentGuestId
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                    : "bg-party-surface2 border-party-border text-gray-300"
                )}
              >
                {u.avatar && !u.avatar.startsWith("http") && (
                  <span className="text-base leading-none">{u.avatar}</span>
                )}
                <span>{u.nickname}</span>
                {u.guestId === currentGuestId && (
                  <span className="text-xs text-emerald-500">(אתה)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
