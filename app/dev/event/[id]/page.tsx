"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Trash2, Lock, Unlock, Key, Ban, CheckCircle,
  Image as ImageIcon, Video, Users, AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";

interface EventDetail {
  id: string; name: string; slug: string; event_date: string | null;
  uploads_open: boolean; require_approval: boolean; admin_email: string | null;
  admin_password: string | null; created_at: string; privacy_mode: string;
  description: string | null; allow_video: boolean;
}
interface MediaRow {
  id: string; file_url: string; thumbnail_url: string | null;
  media_type: string; status: string; created_at: string; guest_id: string;
}
interface GuestRow { id: string; nickname: string; avatar: string | null; created_at: string; blocked?: boolean; }

export default function DevEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [token, setToken] = useState("");
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("dev_token") ?? "";
    if (!t) { router.replace("/dev"); return; }
    setToken(t);
    fetch(`/api/dev/events/${id}`, { headers: { "x-dev-token": t } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { router.replace("/dev/dashboard"); return; }
        setEvent(d.event);
        setMedia(d.media);
        setGuests(d.guests);
      })
      .catch(() => router.replace("/dev/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const patch = async (updates: Record<string, unknown>) => {
    const res = await fetch(`/api/dev/events/${id}`, {
      method: "PATCH",
      headers: { "x-dev-token": token, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.ok;
  };

  const toggleUploads = async () => {
    if (!event) return;
    const ok = await patch({ uploads_open: !event.uploads_open });
    if (ok) { setEvent({ ...event, uploads_open: !event.uploads_open }); toast.success(event.uploads_open ? "העלאות נסגרו" : "העלאות נפתחו"); }
  };

  const changePassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 6) { toast.error("סיסמה חייבת להכיל לפחות 6 תווים"); return; }
    setChangingPassword(true);
    const ok = await patch({ admin_password: newPassword.trim() });
    if (ok) { toast.success("הסיסמה עודכנה"); setNewPassword(""); setChangingPassword(false); }
    else { toast.error("שגיאה"); setChangingPassword(false); }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!confirm("למחוק את התמונה/וידאו הזה?")) return;
    const res = await fetch(`/api/dev/media/${mediaId}`, {
      method: "DELETE", headers: { "x-dev-token": token },
    });
    if (res.ok) { setMedia((prev) => prev.filter((m) => m.id !== mediaId)); toast.success("נמחק"); }
    else toast.error("שגיאה במחיקה");
  };

  const toggleBlock = async (guest: GuestRow) => {
    const res = await fetch(`/api/dev/guests/${guest.id}`, {
      method: "PATCH",
      headers: { "x-dev-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: !guest.blocked }),
    });
    if (res.ok) {
      setGuests((prev) => prev.map((g) => g.id === guest.id ? { ...g, blocked: !g.blocked } : g));
      toast.success(guest.blocked ? "חסימה הוסרה" : "אורח נחסם");
    }
  };

  const deleteEvent = async () => {
    if (!event) return;
    if (!confirm(`למחוק את "${event.name}" לצמיתות כולל כל המדיה?`)) return;
    const res = await fetch(`/api/dev/events/${id}`, { method: "DELETE", headers: { "x-dev-token": token } });
    if (res.ok) { toast.success("האירוע נמחק"); router.replace("/dev/dashboard"); }
    else toast.error("שגיאה במחיקה");
  };

  if (loading) {
    return <div className="min-h-screen bg-party-bg flex items-center justify-center">
      <span className="h-8 w-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
    </div>;
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-party-bg pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-party-bg/95 backdrop-blur border-b border-party-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/dev/dashboard")} className="text-gray-500 hover:text-white transition-colors">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate">{event.name}</h1>
          <p className="text-gray-500 text-xs font-mono">{event.slug}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info card */}
        <div className="bg-party-surface border border-party-border rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">מייל אדמין</span><span className="text-white">{event.admin_email ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">פרטיות</span><span className="text-white">{event.privacy_mode}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">תאריך אירוע</span><span className="text-white">{event.event_date ? new Date(event.event_date).toLocaleDateString("he-IL") : "—"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">נוצר</span><span className="text-white">{new Date(event.created_at).toLocaleDateString("he-IL")}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">סטטוס העלאות</span>
            <span className={event.uploads_open ? "text-green-400" : "text-red-400"}>{event.uploads_open ? "פתוח" : "סגור"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-party-surface border border-party-border rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-semibold text-sm mb-3">פעולות</h2>

          {/* Toggle uploads */}
          <button onClick={toggleUploads}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-party-bg border border-party-border hover:border-yellow-400/40 transition-all text-right">
            {event.uploads_open ? <Lock className="h-4 w-4 text-yellow-400 flex-shrink-0" /> : <Unlock className="h-4 w-4 text-green-400 flex-shrink-0" />}
            <span className="text-white text-sm">{event.uploads_open ? "סגור העלאות" : "פתח העלאות"}</span>
          </button>

          {/* Change password */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="סיסמה חדשה לאדמין"
              dir="ltr"
              className="flex-1 bg-party-bg border border-party-border rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-party-gold transition-colors font-mono"
            />
            <button
              onClick={changePassword}
              disabled={changingPassword || !newPassword.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 rounded-xl text-sm font-medium hover:bg-yellow-400/20 transition-all disabled:opacity-40"
            >
              <Key className="h-4 w-4" />
              שנה
            </button>
          </div>

          {/* View event */}
          <a
            href={`/event/${event.slug}/gallery`}
            target="_blank"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-party-bg border border-party-border hover:border-yellow-400/40 transition-all text-right"
          >
            <ImageIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-white text-sm">פתח גלריה</span>
          </a>

          {/* Delete event */}
          <button onClick={deleteEvent}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all text-right">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">מחק אירוע לצמיתות</span>
          </button>
        </div>

        {/* Guests */}
        <div className="bg-party-surface border border-party-border rounded-2xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-yellow-400" />
            אורחים ({guests.length})
          </h2>
          <div className="space-y-2">
            {guests.length === 0 && <p className="text-gray-600 text-xs text-center py-4">אין אורחים עדיין</p>}
            {guests.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 py-2 border-b border-party-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{g.avatar ?? "👤"}</span>
                  <div>
                    <span className={`text-sm ${g.blocked ? "text-gray-500 line-through" : "text-white"}`}>{g.nickname}</span>
                    <p className="text-xs text-gray-600">{new Date(g.created_at).toLocaleDateString("he-IL")}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleBlock(g)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    g.blocked
                      ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  }`}
                >
                  {g.blocked ? <><CheckCircle className="h-3 w-3" /> בטל חסימה</> : <><Ban className="h-3 w-3" /> חסום</>}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Media */}
        <div className="bg-party-surface border border-party-border rounded-2xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-yellow-400" />
            מדיה ({media.length})
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {media.length === 0 && <p className="text-gray-600 text-xs col-span-3 text-center py-4">אין מדיה עדיין</p>}
            {media.map((m) => (
              <div key={m.id} className="relative group aspect-square rounded-xl overflow-hidden bg-party-bg border border-party-border">
                {m.media_type === "video" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-6 w-6 text-gray-500" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumbnail_url ?? m.file_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => deleteMedia(m.id)}
                    className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {m.status === "pending" && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400" title="ממתין לאישור" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
