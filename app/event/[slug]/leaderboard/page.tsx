"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getEventBySlug } from "@/lib/events";
import { getLeaderboard } from "@/lib/leaderboard";
import { loadGuestSession } from "@/lib/guests";
import type { PublicEvent, LeaderboardEntry } from "@/types";
import LeaderboardTable from "@/components/LeaderboardTable";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ArrowRight, Camera } from "lucide-react";

export default function LeaderboardPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const guestSession = loadGuestSession(slug);

  useEffect(() => {
    const load = async () => {
      try {
        const ev = await getEventBySlug(slug);
        if (!ev) { router.replace(`/event/${slug}`); return; }

        const { getAdminSessionKey } = await import("@/lib/utils");
        const storedToken = localStorage.getItem(getAdminSessionKey(ev.id));
        let isAdmin = false;
        if (storedToken) {
          const res = await fetch("/api/admin/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: ev.id, token: storedToken }),
          });
          const { valid } = await res.json();
          isAdmin = valid;
        }

        if (!guestSession && !isAdmin) { router.replace(`/event/${slug}`); return; }
        if (!ev.show_leaderboard) { router.replace(`/event/${slug}/gallery`); return; }

        setEvent(ev);
        setAllowed(true);
        setEntries(await getLeaderboard(ev.id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug, router, guestSession]);

  if (loading || !allowed) return <FullPageSpinner />;
  if (!event) return null;

  return (
    <div className="min-h-screen bg-party-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-party-bg/95 backdrop-blur-md border-b border-party-border">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">לוח מובילים 🏆</h1>
              <p className="text-xs text-gray-500">{event.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Top 3 podium */}
        {entries.length >= 3 && (
          <div className="flex items-end justify-center gap-3 py-4">
            {/* 2nd place */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/10">
                {entries[1].avatar?.startsWith("http") ? (
                  <Image src={entries[1].avatar} alt={entries[1].nickname} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{entries[1].avatar || "👤"}</span>
                )}
              </div>
              <div className="text-sm font-bold text-gray-300 max-w-[70px] truncate text-center">{entries[1].nickname}</div>
              <div className="w-16 bg-gray-400/20 border border-gray-400/30 rounded-t-xl flex items-end justify-center pb-2 h-16">
                <span className="text-gray-400 font-black text-2xl">2</span>
              </div>
            </div>
            {/* 1st place */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-4xl">👑</div>
              <div className="text-sm font-bold text-yellow-300 max-w-[80px] truncate text-center">{entries[0].nickname}</div>
              <div className="w-20 bg-gradient-to-b from-yellow-500/30 to-amber-500/20 border border-yellow-500/40 rounded-t-xl flex items-end justify-center pb-2 h-24">
                <span className="text-yellow-400 font-black text-2xl">1</span>
              </div>
            </div>
            {/* 3rd place */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white/10">
                {entries[2].avatar?.startsWith("http") ? (
                  <Image src={entries[2].avatar} alt={entries[2].nickname} width={40} height={40} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{entries[2].avatar || "👤"}</span>
                )}
              </div>
              <div className="text-sm font-bold text-amber-600 max-w-[70px] truncate text-center">{entries[2].nickname}</div>
              <div className="w-16 bg-amber-600/20 border border-amber-600/30 rounded-t-xl flex items-end justify-center pb-2 h-12">
                <span className="text-amber-600 font-black text-2xl">3</span>
              </div>
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="text-5xl">📷</div>
            <p className="text-white font-bold text-lg">עוד אין תמונות בגלריה</p>
            <p className="text-gray-400 text-sm">לוח המובילים יתמלא ברגע שהאורחים יתחילו להעלות</p>
            <Link href={`/event/${slug}/gallery`} className="mt-2 inline-flex items-center gap-2 btn-gold text-white font-bold px-6 py-3 rounded-2xl shadow-lg">
              <Camera className="h-4 w-4" />
              חזרה לClink
            </Link>
          </div>
        ) : (
          <>
            <LeaderboardTable entries={entries} currentGuestId={guestSession?.guestId} />
            <div className="text-center pt-4">
              <Link href={`/event/${slug}/gallery`} className="inline-flex items-center gap-2 btn-gold text-white font-bold px-6 py-3 rounded-2xl shadow-lg">
                <Camera className="h-4 w-4" />
                המשך להעלות ולצבור נקודות
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
