"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface OnlineUser {
  guestId: string;
  nickname: string;
  avatar: string | null;
  joinedAt: number;
}

interface UsePresenceOptions {
  eventId: string;
  guestId: string;
  nickname: string;
  avatar: string | null;
  enabled?: boolean;
}

export function usePresence({
  eventId,
  guestId,
  nickname,
  avatar,
  enabled = true,
}: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !eventId || !guestId) return;

    const channelName = `presence:event:${eventId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: guestId } },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = Object.entries(state).map(([key, presences]) => {
          const p = (presences as unknown as Array<{ nickname: string; avatar: string | null; joinedAt: number }>)[0];
          return { guestId: key, nickname: p?.nickname ?? "", avatar: p?.avatar ?? null, joinedAt: p?.joinedAt ?? 0 };
        });
        // Sort by join time
        users.sort((a, b) => a.joinedAt - b.joinedAt);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            nickname,
            avatar,
            joinedAt: Date.now(),
          });
        }
      });

    return () => {
      channel.untrack().then(() => {
        supabase.removeChannel(channel);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, guestId, enabled]);

  return { onlineUsers, count: onlineUsers.length };
}
