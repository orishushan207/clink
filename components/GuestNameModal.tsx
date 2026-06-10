"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AVATAR_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { getAdminSessionKey } from "@/lib/utils";
import { Camera, X, Shield, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PicMeLogo from "@/components/PicMeLogo";

interface GuestNameModalProps {
  open: boolean;
  eventName: string;
  eventSlug?: string;
  onClose?: () => void;
  onSubmit: (nickname: string, avatar: string | null, pin?: string) => Promise<void>;
}

export default function GuestNameModal({
  open,
  eventName,
  eventSlug,
  onClose,
  onSubmit,
}: GuestNameModalProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [pinRequired, setPinRequired] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin login state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) return;
    setAdminLoading(true);
    setAdminError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || "פרטים שגויים");
        return;
      }
      const events = data.events as { eventId: string; adminToken: string }[];
      if (!events?.length) { setAdminError("לא נמצאו אירועים"); return; }
      const ev = events[0];
      localStorage.setItem(getAdminSessionKey(ev.eventId), ev.adminToken);
      toast.success("כניסת מנהל בוצעה ✅");
      router.push(`/admin/event/${ev.eventId}`);
    } catch {
      setAdminError("שגיאה בהתחברות");
    } finally {
      setAdminLoading(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("יש לבחור קובץ תמונה");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("התמונה גדולה מדי (מקסימום 5MB)");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `guests/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("event-media")
        .getPublicUrl(path);

      setPhotoUrl(data.publicUrl);
      setSelectedEmoji(null);
    } catch (err) {
      console.error(err);
      setError("שגיאה בהעלאת התמונה");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("יש להזין כינוי");
      return;
    }
    if (trimmed.length < 2) {
      setError("הכינוי חייב להכיל לפחות 2 תווים");
      return;
    }
    if (trimmed.length > 30) {
      setError("הכינוי ארוך מדי (מקסימום 30 תווים)");
      return;
    }

    const RESERVED = ["מנהל האירוע", "admin", "administrator", "מנהל"];
    if (RESERVED.some(r => trimmed.toLowerCase() === r.toLowerCase())) {
      setError("כינוי זה שמור ואינו זמין");
      return;
    }

    if (pin && !/^\d{4}$/.test(pin)) {
      setError("הקוד האישי חייב להיות 4 ספרות");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await onSubmit(trimmed, photoUrl || selectedEmoji, pin || undefined);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "pin_required" || code === "pin_invalid") {
        setPinRequired(true);
        setShowPin(true);
        setError(err instanceof Error ? err.message : "נדרש קוד אישי");
      } else {
        setError(err instanceof Error ? err.message : "שגיאה בכניסה לאירוע");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { if (onClose) onClose(); else router.back(); }} title="">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <PicMeLogo size={48} showText={false} />
          </div>
          <h2 className="text-xl font-bold text-white">אורח/ת יקר/ה ברוכים הבאים לClink!</h2>
          <p className="text-gray-400 text-sm mt-1">{eventName}</p>
        </div>

        {/* Nickname input */}
        <Input
          label="הכינוי שלך"
          placeholder="למשל: דניאל 🔥"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setError("");
            setPinRequired(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          error={pinRequired ? undefined : error}
          maxLength={30}
          autoFocus
        />

        {/* PIN input — protects nickname from being used by someone else */}
        <div>
          {!showPin ? (
            <button
              type="button"
              onClick={() => setShowPin(true)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              הוסף קוד אישי (מומלץ — מונע שימוש בכינוי שלך ממכשיר אחר)
            </button>
          ) : (
            <>
              <Input
                label="קוד אישי (4 ספרות, לא חובה)"
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(v);
                  setError("");
                  setPinRequired(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                inputMode="numeric"
                maxLength={4}
                dir="ltr"
                error={pinRequired ? error : undefined}
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {pinRequired
                  ? "הזן את הקוד האישי ששמרת בכניסה הקודמת"
                  : "אם תגדיר קוד, רק מי שיודע אותו יוכל להיכנס בשם הכינוי הזה ממכשיר אחר"}
              </p>
            </>
          )}
        </div>

        {/* Profile photo upload */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">
            תמונת פרופיל (לא חובה)
          </p>

          {photoUrl ? (
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-party-gold">
                <Image src={photoUrl} alt="פרופיל" fill className="object-cover" />
              </div>
              <button
                onClick={() => {
                  setPhotoUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
                הסר תמונה
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-party-gold/40 text-yellow-300 text-sm hover:bg-party-gold/10 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {uploading ? "מעלה..." : "העלה תמונה מהגלריה"}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Emoji selection — only if no photo */}
        {!photoUrl && (
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">
              או בחר אמוג&apos;י
            </p>
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() =>
                    setSelectedEmoji(selectedEmoji === emoji ? null : emoji)
                  }
                  className={cn(
                    "text-xl p-2 rounded-xl transition-all hover:scale-110 active:scale-95",
                    selectedEmoji === emoji
                      ? "bg-party-gold/20 ring-2 ring-party-gold"
                      : "hover:bg-white/5"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          fullWidth
          size="xl"
          onClick={handleSubmit}
          loading={loading}
          disabled={!nickname.trim()}
        >
          {!photoUrl && selectedEmoji && <span>{selectedEmoji}</span>}
          <PicMeLogo size={18} showText={false} />
          כניסה לClink
        </Button>

        {/* Admin login toggle */}
        {eventSlug && (
          <div className="border-t border-party-border pt-4">
            <button
              onClick={() => { setShowAdminLogin(v => !v); setAdminError(""); }}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mx-auto"
            >
              <Shield className="h-3.5 w-3.5" />
              {showAdminLogin ? "סגור כניסת מנהל" : "כניסה כמנהל האירוע"}
            </button>

            {showAdminLogin && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => { setAdminEmail(e.target.value); setAdminError(""); }}
                  placeholder="אימייל מנהל"
                  dir="ltr"
                  className="w-full bg-party-surface2 border border-party-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors"
                />
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setAdminError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    placeholder="סיסמת מנהל"
                    dir="rtl"
                    className="w-full bg-party-surface2 border border-party-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showAdminPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {adminError && (
                  <p className="text-xs text-red-400 text-center">{adminError}</p>
                )}
                <button
                  onClick={handleAdminLogin}
                  disabled={adminLoading || !adminPassword.trim() || !adminEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-party-gold hover:bg-party-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all"
                >
                  {adminLoading
                    ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Shield className="h-4 w-4" />}
                  כניסה כמנהל
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
