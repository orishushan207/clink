"use client";

import { useMemo } from "react";
import { Users, Image as ImageIcon, Heart, Clock, Crown, TrendingUp } from "lucide-react";
import type { Media } from "@/types";
import type { OnlineUser } from "@/hooks/usePresence";
import type { EventStats } from "@/lib/events";

interface AdminAnalyticsProps {
  media: Media[];
  stats: EventStats;
  onlineUsers: OnlineUser[];
  voteCounts: Record<string, number>;
}

export default function AdminAnalytics({ media, stats, onlineUsers, voteCounts }: AdminAnalyticsProps) {
  // Uploads per day (last 7 days)
  const uploadsPerDay = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    return Array.from({ length: 7 }, (_, i) => {
      const start = now - (6 - i) * DAY;
      const end = start + DAY;
      const count = media.filter((m) => {
        const t = new Date(m.created_at).getTime();
        return t >= start && t < end;
      }).length;
      const d = new Date(start);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      return { label, count };
    });
  }, [media]);

  const maxUploads = Math.max(...uploadsPerDay.map((h) => h.count), 1);

  // Top uploaders
  const topUploaders = useMemo(() => {
    const map: Record<string, { nickname: string; avatar: string | null; count: number; likes: number }> = {};
    for (const m of media) {
      if (!m.guest) continue;
      const key = m.guest_id;
      if (!map[key]) map[key] = { nickname: m.guest.nickname, avatar: m.guest.avatar ?? null, count: 0, likes: 0 };
      map[key].count++;
      map[key].likes += m.likes_count;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [media]);

  // Winner photo
  const winnerId = Object.entries(voteCounts).length > 0
    ? Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const winnerMedia = winnerId ? media.find((m) => m.id === winnerId) : null;
  const winnerVotes = winnerId ? voteCounts[winnerId] : 0;
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  // Total likes
  const totalLikes = media.reduce((sum, m) => sum + m.likes_count, 0);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "אורחים", value: stats.guestCount, color: "text-yellow-400", bg: "bg-party-gold/10" },
          { icon: ImageIcon, label: "תמונות/סרטונים", value: stats.mediaCount, color: "text-amber-400", bg: "bg-amber-500/10" },
          { icon: Heart, label: "לייקים", value: totalLikes, color: "text-red-400", bg: "bg-red-500/10" },
          { icon: Crown, label: "הצבעות", value: totalVotes, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((item) => (
          <div key={item.label} className="bg-party-surface border border-party-border rounded-2xl p-4 flex flex-col items-center gap-2">
            <div className={`${item.bg} ${item.color} p-2.5 rounded-xl`}>
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold text-white">{item.value}</span>
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Online now */}
      <div className="bg-party-surface border border-party-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h3 className="text-sm font-semibold text-white">
            {onlineUsers.length > 0 ? `${onlineUsers.length} אורחים מחוברים עכשיו` : "אין אורחים מחוברים כרגע"}
          </h3>
        </div>
        {onlineUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((u) => (
              <div key={u.guestId} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-300">
                {u.avatar && !u.avatar.startsWith("http") && <span>{u.avatar}</span>}
                <span>{u.nickname}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uploads over time */}
      <div className="bg-party-surface border border-party-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-white">העלאות ב-7 ימים אחרונים</h3>
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {uploadsPerDay.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-gradient-to-t from-party-gold to-amber-500 rounded-t opacity-80 hover:opacity-100 transition-all relative"
                style={{ height: `${Math.max((d.count / maxUploads) * 100, d.count > 0 ? 8 : 4)}%` }}
                title={`${d.label}: ${d.count} העלאות`}
              >
                {d.count > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {d.count}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-600">
          {uploadsPerDay.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>

      {/* Top uploaders + winner side by side */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Top uploaders */}
        <div className="bg-party-surface border border-party-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            המעלים הפעילים ביותר
          </h3>
          <div className="space-y-2">
            {topUploaders.length === 0 && <p className="text-xs text-gray-500">אין נתונים עדיין</p>}
            {topUploaders.map((g, i) => (
              <div key={g.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                {g.avatar && !g.avatar.startsWith("http") && <span className="text-base">{g.avatar}</span>}
                <span className="text-sm text-white flex-1 truncate">{g.nickname}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{g.count} תמונות</span>
                <span className="text-xs text-red-400 flex-shrink-0">❤️ {g.likes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Winner */}
        <div className="bg-party-surface border border-party-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" />
            תמונת האירוע ({totalVotes} הצבעות)
          </h3>
          {winnerMedia ? (
            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-amber-500/30">
                {winnerMedia.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={winnerMedia.file_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-party-surface2 flex items-center justify-center text-2xl">🎬</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium">{winnerMedia.guest?.nickname}</p>
                <p className="text-xs text-amber-400">{winnerVotes} הצבעות 👑</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">עוד לא הוצבעו תמונות</p>
          )}
        </div>
      </div>

      {/* Pending/Reports */}
      {(stats.pendingCount > 0 || stats.reportCount > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.pendingCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.pendingCount}</div>
              <div className="text-xs text-amber-300 mt-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> ממתינים לאישור
              </div>
            </div>
          )}
          {stats.reportCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.reportCount}</div>
              <div className="text-xs text-red-300 mt-1">דיווחים</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
