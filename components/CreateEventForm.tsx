"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { CreateEventPayload, PrivacyMode } from "@/types";
import { uploadCoverImage } from "@/lib/media";
import { generateId, getAdminUrl, getEventUrl, getAdminSessionKey } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Camera, Calendar, Lock, Users, Eye, EyeOff, Shield, Briefcase, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface CreateEventFormProps {
  onSuccess?: (data: {
    eventId: string;
    slug: string;
    adminToken: string;
    eventUrl: string;
    adminUrl: string;
  }) => void;
  licenseId?: string;
  licenseEmail?: string;
  daysAccess?: number;
}

export default function CreateEventForm({ onSuccess, licenseId, licenseEmail, daysAccess }: CreateEventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    event_date: "",
    description: "",
    privacy_mode: "open" as PrivacyMode,
    allow_video: true,
    require_approval: false,
    show_leaderboard: true,
    admin_email: "",
    admin_password: "",
    vendor_token: "",
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "שם האירוע הוא שדה חובה";
    if (form.name.trim().length < 2) newErrors.name = "שם האירוע חייב להכיל לפחות 2 תווים";
    if (!form.admin_email.trim()) newErrors.admin_email = "כתובת מייל היא שדה חובה";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email.trim())) newErrors.admin_email = "כתובת מייל לא תקינה";
    if (!form.admin_password.trim()) newErrors.admin_password = "סיסמה היא שדה חובה";
    else if (form.admin_password.trim().length < 6) newErrors.admin_password = "הסיסמה חייבת להכיל לפחות 6 תווים";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("ניתן להעלות רק תמונות לכיסוי");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      let coverImageUrl: string | undefined;
      const tempEventId = generateId(); // Used for cover storage path

      // Upload cover image if provided
      if (coverFile) {
        try {
          coverImageUrl = await uploadCoverImage(coverFile, tempEventId);
        } catch {
          toast.error("שגיאה בהעלאת תמונת הכיסוי, ממשיך ללא תמונה");
        }
      }

      const days = daysAccess ?? 2;
      const guestLockHours = days * 24;

      const payload: CreateEventPayload & { cover_image_url?: string; vendor_token?: string; license_id?: string } = {
        name: form.name.trim(),
        event_date: form.event_date || undefined,
        description: form.description.trim() || undefined,
        cover_image_url: coverImageUrl,
        allow_video: form.allow_video,
        require_approval: form.require_approval,
        show_leaderboard: form.show_leaderboard,
        privacy_mode: form.privacy_mode,
        admin_email: form.admin_email.trim(),
        admin_password: form.admin_password.trim(),
        guest_lock_hours: guestLockHours,
        vendor_token: form.vendor_token.trim() || undefined,
        license_id: licenseId,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "שגיאה ביצירת האירוע");
      }

      const { event, eventUrl, adminUrl } = await res.json();

      // Save admin token to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          getAdminSessionKey(event.id),
          event.admin_token
        );
      }

      toast.success("האירוע נוצר בהצלחה! 🎉");
      onSuccess?.({
        eventId: event.id,
        slug: event.slug,
        adminToken: event.admin_token,
        eventUrl,
        adminUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה ביצירת האירוע";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const privacyOptions: { value: PrivacyMode; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: "open",
      label: "פתוח",
      desc: "כל מי שיש לו את הקישור יכול לצפות ולהעלות",
      icon: <Users className="h-4 w-4" />,
    },
    {
      value: "approval",
      label: "אישור",
      desc: "לאחר סריקת הברקוד כל אורח יידרש לאישור שלך על מנת להיכנס",
      icon: <Eye className="h-4 w-4" />,
    },
    {
      value: "private",
      label: "פרטי",
      desc: "האורחים מעלים אך רק אתה יכול לצפות בגלריה",
      icon: <Lock className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cover image */}
      <div>
        <label className="text-sm font-medium text-wedding-muted block mb-2">
          תמונת כיסוי (לא חובה)
        </label>
        <label className="cursor-pointer group">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />
          <div
            className={cn(
              "relative w-full h-40 rounded-2xl border-2 border-dashed border-wedding-border flex items-center justify-center overflow-hidden transition-all hover:border-wedding-accent/50",
              coverPreview && "border-solid border-wedding-accent/30"
            )}
          >
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt="כיסוי"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-wedding-muted group-hover:text-wedding-ink transition-colors">
                <Camera className="h-8 w-8" />
                <span className="text-sm">לחץ להוספת תמונת כיסוי</span>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Event name */}
      <Input
        label="שם האירוע *"
        placeholder="למשל: מסיבת יום הולדת של נועה 🎂"
        value={form.name}
        onChange={(e) => {
          setForm((f) => ({ ...f, name: e.target.value }));
          setErrors((e2) => ({ ...e2, name: undefined }));
        }}
        error={errors.name}
        maxLength={100}
      />

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-wedding-muted flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-wedding-muted" />
          תאריך האירוע (לא חובה)
        </label>
        <input
          type="datetime-local"
          value={form.event_date}
          onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
          className="w-full bg-wedding-card border border-wedding-border rounded-xl px-4 py-3 text-wedding-ink focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all"
        />
      </div>

      {/* Description */}
      <Textarea
        label="תיאור קצר (לא חובה)"
        placeholder="מה מיוחד באירוע שלך?"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        rows={3}
        maxLength={300}
      />

      {/* Privacy mode */}
      <div>
        <label className="text-sm font-medium text-wedding-muted block mb-3">
          מצב פרטיות
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {privacyOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((f) => ({ ...f, privacy_mode: opt.value }))}
              className={cn(
                "flex flex-col gap-1.5 p-4 rounded-2xl border text-right transition-all",
                form.privacy_mode === opt.value
                  ? "border-wedding-accent bg-wedding-accent/10"
                  : "border-wedding-border bg-wedding-card hover:border-wedding-accent/40"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  form.privacy_mode === opt.value ? "text-wedding-accent-dark" : "text-wedding-muted"
                )}>
                  {opt.icon}
                </span>
                <span className={cn(
                  "font-medium text-sm",
                  form.privacy_mode === opt.value ? "text-wedding-accent-dark" : "text-wedding-ink"
                )}>
                  {opt.label}
                </span>
              </div>
              <p className="text-xs text-wedding-muted leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle options */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-wedding-muted block">
          אפשרויות נוספות
        </label>

        {[
          { key: "allow_video", label: "אפשר העלאת סרטון", emoji: "🎬" },
          { key: "require_approval", label: "דרוש אישורי לפני פרסום", emoji: "✅" },
          { key: "show_leaderboard", label: "הצג לוח מובילים", emoji: "🏆" },
        ].map(({ key, label, emoji }) => (
          <label
            key={key}
            className="flex items-center justify-between p-4 bg-wedding-card border border-wedding-border rounded-2xl cursor-pointer hover:border-wedding-accent/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{emoji}</span>
              <span className="text-sm text-wedding-ink">{label}</span>
            </div>
            <div
              className={cn(
                "relative w-11 h-6 rounded-full transition-all",
                form[key as keyof typeof form]
                  ? "btn-gold"
                  : "bg-wedding-border"
              )}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  [key]: !f[key as keyof typeof f],
                }))
              }
            >
              <div
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  form[key as keyof typeof form]
                    ? "translate-x-5"
                    : "translate-x-0"
                )}
              />
            </div>
          </label>
        ))}
      </div>

      {/* Account details — required */}
      <div className="bg-wedding-accent/5 border border-wedding-accent/20 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-wedding-accent-dark" />
          <p className="text-sm font-semibold text-wedding-accent-dark">פרטי כניסה לניהול האירוע</p>
        </div>
        <p className="text-xs text-wedding-muted -mt-2">
          תשתמש בפרטים אלה כדי להתחבר ולנהל את האירוע שלך בכל עת
        </p>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-wedding-muted flex items-center gap-1.5 mb-1.5">
            <Mail className="h-4 w-4 text-wedding-accent-dark" />
            כתובת מייל *
          </label>
          <input
            type="email"
            value={form.admin_email}
            onChange={(e) => {
              setForm((f) => ({ ...f, admin_email: e.target.value }));
              setErrors((e2) => ({ ...e2, admin_email: undefined }));
            }}
            placeholder="your@email.com"
            dir="ltr"
            className={cn(
              "w-full bg-wedding-card border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all",
              errors.admin_email ? "border-red-500" : "border-wedding-border"
            )}
            autoComplete="email"
          />
          {errors.admin_email && <p className="text-red-400 text-xs mt-1">{errors.admin_email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="text-sm font-medium text-wedding-muted flex items-center gap-1.5 mb-1.5">
            <Lock className="h-4 w-4 text-wedding-accent-dark" />
            סיסמה * (לפחות 6 תווים)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={form.admin_password}
              onChange={(e) => {
                setForm((f) => ({ ...f, admin_password: e.target.value }));
                setErrors((e2) => ({ ...e2, admin_password: undefined }));
              }}
              placeholder="בחר סיסמה חזקה"
              dir="ltr"
              className={cn(
                "w-full bg-wedding-card border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all pl-11",
                errors.admin_password ? "border-red-500" : "border-wedding-border"
              )}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-wedding-muted hover:text-wedding-ink transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.admin_password && <p className="text-red-400 text-xs mt-1">{errors.admin_password}</p>}
        </div>
      </div>

      {/* Vendor token */}
      <div>
        <label className="text-sm font-medium text-wedding-muted flex items-center gap-1.5 mb-1.5">
          <Briefcase className="h-4 w-4 text-wedding-accent-dark" />
          טוקן ספק (לא חובה)
        </label>
        <input
          type="text"
          value={form.vendor_token}
          onChange={(e) => setForm((f) => ({ ...f, vendor_token: e.target.value }))}
          placeholder="הכנס טוקן ספק אם אתה עובד עם ספק"
          dir="ltr"
          className="w-full bg-wedding-card border border-wedding-border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all"
        />
        <p className="text-xs text-wedding-muted mt-1">
          מאפשר לספק לנהל את האירוע שלך מהדשבורד שלו
        </p>
      </div>

      {/* Submit */}
      <Button
        fullWidth
        size="xl"
        onClick={handleSubmit}
        loading={loading}
        disabled={!form.name.trim()}
        className="mt-4"
      >
        צור אירוע ✨
      </Button>
    </div>
  );
}
