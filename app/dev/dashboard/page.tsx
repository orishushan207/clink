"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, LogOut, Search, Calendar, Lock, Unlock, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface LicenseSnippet {
  type: "onetime" | "subscription";
  days_access: number | null;
  events_per_month: number | null;
  events_used: number;
}

interface EventRow {
  id: string;
  name: string;
  slug: string;
  event_date: string | null;
  uploads_open: boolean;
  require_approval: boolean;
  admin_email: string | null;
  created_at: string;
  privacy_mode: string;
  expires_at: string | null;
  licenses: LicenseSnippet | null;
}

function licenseBadge(lic: LicenseSnippet | null) {
  if (!lic) return null;
  if (lic.type === "onetime") return `חד פעמי · ${lic.days_access} ימים`;
  if (lic.events_per_month === null) return `מנוי ללא הגבלה`;
  return `מנוי ${lic.events_per_month}/חודש (${lic.events_used} בשימוש)`;
}

export default function DevDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filtered, setFiltered] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("dev_token") ?? "";
    if (!t) { router.replace("/dev"); return; }
    setToken(t);
    fetch("/api/dev/events", { headers: { "x-dev-token": t } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { router.replace("/dev"); return; }
        setEvents(d.events);
        setFiltered(d.events);
      })
      .catch(() => router.replace("/dev"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(events.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.slug.toLowerCase().includes(q) ||
      (e.admin_email ?? "").toLowerCase().includes(q)
    ));
  }, [search, events]);

  const toggleUploads = async (ev: EventRow) => {
    const res = await fetch(`/api/dev/events/${ev.id}`, {
      method: "PATCH",
      headers: { "x-dev-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ uploads_open: !ev.uploads_open }),
    });
    if (res.ok) {
      setEvents((prev) => prev.map((e) => e.id === ev.id ? { ...e, uploads_open: !ev.uploads_open } : e));
      toast.success(ev.uploads_open ? "העלאות נסגרו" : "העלאות נפתחו");
    }
  };

  const deleteEvent = async (ev: EventRow) => {
    if (!confirm(`למחוק את "${ev.name}"? פעולה זו בלתי הפיכה.`)) return;
    const res = await fetch(`/api/dev/events/${ev.id}`, {
      method: "DELETE",
      headers: { "x-dev-token": token },
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      toast.success("האירוע נמחק");
    } else {
      toast.error("שגיאה במחיקה");
    }
  };

  const logout = () => {
    localStorage.removeItem("dev_token");
    router.replace("/dev");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-party-bg flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-party-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-party-bg/95 backdrop-blur border-b border-party-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-yellow-400" />
          <span className="font-bold text-white text-sm">Developer Panel</span>
          <span className="text-xs text-gray-500 bg-party-surface px-2 py-0.5 rounded-full">{events.length} אירועים</span>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, slug או מייל..."
            className="w-full bg-party-surface border border-party-border rounded-xl pr-10 pl-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-party-gold transition-colors"
          />
        </div>

        {/* Events list */}
        <div className="space-y-3">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="bg-party-surface border border-party-border rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => router.push(`/dev/event/${ev.id}`)}
                    className="text-white font-semibold text-sm hover:text-yellow-400 transition-colors text-right block"
                  >
                    {ev.name}
                  </button>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-gray-500 text-xs font-mono">{ev.slug}</span>
                    {ev.admin_email && (
                      <span className="text-gray-600 text-xs">{ev.admin_email}</span>
                    )}
                    {ev.event_date && (
                      <span className="text-gray-600 text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ev.event_date).toLocaleDateString("he-IL")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ev.uploads_open ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {ev.uploads_open ? "העלאות פתוחות" : "העלאות סגורות"}
                    </span>
                    {licenseBadge(ev.licenses) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                        {licenseBadge(ev.licenses)}
                      </span>
                    )}
                    {ev.expires_at && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(ev.expires_at) < new Date() ? "bg-red-500/10 text-red-400" : "bg-party-bg text-gray-500"}`}>
                        {new Date(ev.expires_at) < new Date() ? "פג תוקף" : `פג ב-${new Date(ev.expires_at).toLocaleDateString("he-IL")}`}
                      </span>
                    )}
                    <span className="text-xs text-gray-600">
                      {new Date(ev.created_at).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/dev/event/${ev.id}`)}
                    title="פרטים"
                    className="p-2 rounded-xl text-gray-500 hover:text-yellow-400 hover:bg-party-bg transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleUploads(ev)}
                    title={ev.uploads_open ? "סגור העלאות" : "פתח העלאות"}
                    className="p-2 rounded-xl text-gray-500 hover:text-yellow-400 hover:bg-party-bg transition-all"
                  >
                    {ev.uploads_open ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteEvent(ev)}
                    title="מחק אירוע"
                    className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-gray-600 py-12 text-sm">לא נמצאו אירועים</div>
          )}
        </div>
      </div>
    </div>
  );
}
