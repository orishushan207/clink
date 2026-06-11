"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import { getAdminSessionKey } from "@/lib/utils";
import PicMeLogo from "@/components/PicMeLogo";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [multipleEvents, setMultipleEvents] = useState<
    { eventId: string; adminToken: string; slug: string; name?: string }[]
  >([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        toast.error("מייל או סיסמה שגויים");
        return;
      }

      const { events } = await res.json();

      if (!events || events.length === 0) {
        toast.error("לא נמצאו אירועים עם פרטים אלה");
        return;
      }

      if (events.length === 1) {
        enterEvent(events[0]);
      } else {
        setMultipleEvents(events);
      }
    } catch {
      toast.error("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  const enterEvent = (ev: { eventId: string; adminToken: string }) => {
    localStorage.setItem(getAdminSessionKey(ev.eventId), ev.adminToken);
    toast.success("התחברת בהצלחה!");
    router.push(`/admin/event/${ev.eventId}`);
  };

  // ── Event picker when user has multiple events ──
  if (multipleEvents.length > 0) {
    return (
      <div className="min-h-screen bg-wedding-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <PicMeLogo size={64} textSize="text-2xl" />
            <h1 className="text-xl font-bold text-wedding-ink mt-4">בחר אירוע לניהול</h1>
            <p className="text-wedding-muted text-sm mt-1">נמצאו מספר אירועים תחת המייל שלך</p>
          </div>
          <div className="space-y-3">
            {multipleEvents.map((ev) => (
              <button
                key={ev.eventId}
                onClick={() => enterEvent(ev)}
                className="w-full flex items-center justify-between p-4 wedding-card border border-wedding-border rounded-2xl hover:border-wedding-accent/40 transition-all text-right"
              >
                <span className="text-wedding-ink font-medium">{ev.name || ev.slug}</span>
                <LogIn className="h-4 w-4 text-wedding-accent flex-shrink-0" />
              </button>
            ))}
          </div>
          <button
            onClick={() => setMultipleEvents([])}
            className="w-full text-center text-wedding-muted text-sm mt-6 hover:text-wedding-ink transition-colors"
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wedding-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <PicMeLogo size={80} textSize="text-3xl" />
          <h1 className="text-xl font-bold text-wedding-ink mt-4">כניסה לניהול אירוע</h1>
          <p className="text-wedding-muted text-sm mt-1">היכנס עם המייל והסיסמה שהגדרת</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-wedding-muted mb-1.5 flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-wedding-accent" />
              כתובת מייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              dir="ltr"
              className="w-full wedding-card border border-wedding-border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:border-wedding-accent transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-wedding-muted mb-1.5 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-wedding-accent" />
              סיסמה
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הסיסמה שבחרת ביצירת האירוע"
                dir="ltr"
                className="w-full wedding-card border border-wedding-border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:border-wedding-accent transition-colors pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-wedding-muted hover:text-wedding-ink transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 btn-gold disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-wedding-accent/30 mt-2"
          >
            {loading ? (
              <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="h-5 w-5" />
                כניסה לניהול
              </>
            )}
          </button>
        </form>

        <p className="text-center text-wedding-muted text-xs mt-6">
          לא יצרת אירוע עדיין?{" "}
          <a href="/create" className="text-wedding-accent hover:text-wedding-accent-dark transition-colors">
            צור אירוע חדש
          </a>
        </p>
      </div>
    </div>
  );
}
