"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, RefreshCw, ExternalLink, Shield,
  Image as ImageIcon, Users, Clock, ToggleLeft, ToggleRight, LogOut,
} from "lucide-react";
import { formatDate, getEventUrl } from "@/lib/utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const VENDOR_SESSION_KEY = "picme_vendor_token";

interface VendorEvent {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  uploads_open: boolean;
  admin_token: string;
  created_at: string;
}

interface EventStats {
  mediaCount: number;
  guestCount: number;
  pendingCount: number;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [vendorToken, setVendorToken] = useState("");
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [stats, setStats] = useState<Record<string, EventStats>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadEvents = useCallback(async (token: string) => {
    try {
      const res = await fetch(`/api/vendor/events?token=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error();
      const { events: evList } = await res.json();
      setEvents(evList);

      // Load stats for each event in parallel
      const statsEntries = await Promise.all(
        evList.map(async (ev: VendorEvent) => {
          const r = await fetch(`/api/vendor/stats?token=${encodeURIComponent(token)}&eventId=${ev.id}`);
          const s = await r.json();
          return [ev.id, s] as [string, EventStats];
        })
      );
      setStats(Object.fromEntries(statsEntries));
    } catch {
      toast.error("שגיאה בטעינת האירועים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(VENDOR_SESSION_KEY);
    if (!token) { router.replace("/vendor/login"); return; }
    setVendorToken(token);
    loadEvents(token);
  }, [router, loadEvents]);

  const handleToggleUploads = async (ev: VendorEvent) => {
    setTogglingId(ev.id);
    const newValue = !ev.uploads_open;
    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_token: ev.admin_token, uploads_open: newValue }),
      });
      if (!res.ok) throw new Error();
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, uploads_open: newValue } : e));
      toast.success(newValue ? `${ev.name}: העלאות נפתחו 🟢` : `${ev.name}: העלאות נסגרו 🔴`);
    } catch {
      toast.error("שגיאה בעדכון");
    } finally {
      setTogglingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(VENDOR_SESSION_KEY);
    router.push("/vendor/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-party-bg flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-party-gold/30 border-t-party-gold rounded-full animate-spin" />
      </div>
    );
  }

  const totalMedia = Object.values(stats).reduce((s, e) => s + e.mediaCount, 0);
  const totalGuests = Object.values(stats).reduce((s, e) => s + e.guestCount, 0);
  const totalPending = Object.values(stats).reduce((s, e) => s + e.pendingCount, 0);
  const openEvents = events.filter(e => e.uploads_open).length;

  return (
    <div className="min-h-screen bg-party-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-party-bg/95 backdrop-blur-md border-b border-party-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-yellow-400" />
            <h1 className="text-sm font-bold text-white">דשבורד ספק</h1>
            <span className="text-xs text-gray-500 bg-party-surface px-2 py-0.5 rounded-full border border-party-border">
              {events.length} אירועים
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadEvents(vendorToken)}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "אירועים פתוחים", value: openEvents, icon: "🟢" },
            { label: "תמונות/סרטונים", value: totalMedia, icon: "📸" },
            { label: "אורחים", value: totalGuests, icon: "👥" },
            { label: "ממתינים", value: totalPending, icon: "⏳", highlight: totalPending > 0 },
          ].map(({ label, value, icon, highlight }) => (
            <div key={label} className={cn(
              "bg-party-surface border rounded-2xl p-3 text-center",
              highlight ? "border-amber-500/30" : "border-party-border"
            )}>
              <div className="text-xl mb-1">{icon}</div>
              <div className={cn("text-xl font-bold", highlight ? "text-amber-400" : "text-white")}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Events list */}
        {events.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>אין אירועים מקושרים לטוקן זה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const s = stats[ev.id];
              return (
                <div key={ev.id} className="bg-party-surface border border-party-border rounded-2xl p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-white truncate">{ev.name}</h2>
                      {ev.event_date && (
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(ev.event_date)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a href={getEventUrl(ev.slug)} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <Link href={`/admin/event/${ev.id}?token=${ev.admin_token}`}
                        className="p-2 rounded-xl hover:bg-party-gold/10 text-gray-400 hover:text-yellow-400 transition-all">
                        <Shield className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Stats */}
                  {s && (
                    <div className="flex gap-4 mb-3">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {s.mediaCount} קבצים
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Users className="h-3.5 w-3.5" />
                        {s.guestCount} אורחים
                      </span>
                      {s.pendingCount > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-400">
                          <Clock className="h-3.5 w-3.5" />
                          {s.pendingCount} ממתינים לאישור
                        </span>
                      )}
                    </div>
                  )}

                  {/* Toggle uploads */}
                  <div className="flex items-center justify-between pt-3 border-t border-party-border">
                    <span className="text-sm text-gray-300 flex items-center gap-2">
                      {ev.uploads_open ? "🟢 העלאות פתוחות" : "🔴 העלאות סגורות"}
                    </span>
                    <button
                      onClick={() => handleToggleUploads(ev)}
                      disabled={togglingId === ev.id}
                      className={cn(
                        "transition-colors disabled:opacity-50",
                        ev.uploads_open ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {ev.uploads_open
                        ? <ToggleRight className="h-8 w-8" />
                        : <ToggleLeft className="h-8 w-8" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
