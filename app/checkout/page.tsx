"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, User, Phone, Mail, Lock, Check,
  ArrowLeft, ArrowRight, Sparkles, Repeat, Zap, X,
} from "lucide-react";
import Link from "next/link";
import PicMeLogo from "@/components/PicMeLogo";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type PlanTier = "lite" | "spark" | "crown";

// ── Shared base features (included in all plans) ──
const BASE_FEATURES = [
  "גלריה שיתופית — כל תמונה מופיעה לכולם מיד",
  "Live Wall — הקרנה חיה על המסך הגדול באולם 🔴",
  "QR ייחודי לאירוע — האורחים מצטרפים בסריקה אחת",
  "קליפ מסכם אוטומטי מכל רגעי האירוע",
  "לייקים, תגובות וצ׳אט בין האורחים",
  "שליטה מלאה — אישור ודחייה של תמונות",
  "הורדת כל התמונות ב-ZIP אחד בסוף",
  "ללא הגבלת אורחים",
];

// ── One-time plans ──
const ONETIME_PLANS = [
  {
    id: "lite" as PlanTier,
    name: "Lite",
    emoji: "🎉",
    price: 389,
    tagline: "הבסיס המושלם — כל מה שצריך לאירוע בלתי נשכח",
    features: BASE_FEATURES,
    excluded: ["Clink פסיפס 🎨", "תמונות AI 🤖"],
    recommended: false,
    badge: null as string | null,
    bonus: null as string | null,
    borderClass: "border-wedding-border",
    glowClass: "",
  },
  {
    id: "spark" as PlanTier,
    name: "Premium",
    emoji: "✨",
    price: 589,
    tagline: "הכי פופולרי — כולל Clink פסיפס, הפיצ׳ר שכולם מדברים עליו",
    features: [
      ...BASE_FEATURES,
      "Clink פסיפס — כל התמונות הופכות ליצירת אמנות אחת 🎨",
    ],
    excluded: ["תמונות AI 🤖"],
    recommended: true,
    badge: "הכי מומלץ 🔥",
    bonus: null,
    borderClass: "border-wedding-accent/60",
    glowClass: "shadow-lg shadow-wedding-accent/10",
  },
  {
    id: "crown" as PlanTier,
    name: "VIP",
    emoji: "👑",
    price: 899,
    tagline: "החבילה השלמה — בלי פשרות, בלי חסרונות",
    features: [
      ...BASE_FEATURES,
      "Clink פסיפס — כל התמונות הופכות ליצירת אמנות אחת 🎨",
      "תמונות AI ללא הגבלה לכל האורחים 🤖",
    ],
    excluded: [],
    recommended: false,
    badge: "VIP 💎",
    bonus: "🎁 בונוס: שלט רול-אפ כניסה מותאם אישית עם QR של האירוע",
    borderClass: "border-purple-500/50",
    glowClass: "shadow-lg shadow-purple-500/10",
  },
];

// ── Subscription plans ──
const SUB_PLANS = [
  {
    id: "lite" as PlanTier,
    name: "Lite",
    emoji: "🎉",
    price: 699,
    tagline: "עד 4 אירועים בחודש — הבסיס המושלם לכל מנהל אירועים",
    features: [
      "עד 4 אירועים בחודש",
      ...BASE_FEATURES,
    ],
    excluded: ["Clink פסיפס 🎨", "תמונות AI 🤖"],
    recommended: false,
    badge: null as string | null,
    bonus: null as string | null,
    borderClass: "border-wedding-border",
    glowClass: "",
  },
  {
    id: "spark" as PlanTier,
    name: "Premium",
    emoji: "✨",
    price: 1200,
    tagline: "עד 4 אירועים בחודש — כולל Clink פסיפס בכל אירוע",
    features: [
      "עד 4 אירועים בחודש",
      ...BASE_FEATURES,
      "Clink פסיפס — כל התמונות הופכות ליצירת אמנות אחת 🎨",
    ],
    excluded: ["תמונות AI 🤖"],
    recommended: true,
    badge: "הכי מומלץ 🔥",
    bonus: null,
    borderClass: "border-wedding-accent/60",
    glowClass: "shadow-lg shadow-wedding-accent/10",
  },
  {
    id: "crown" as PlanTier,
    name: "VIP",
    emoji: "👑",
    price: 1899,
    tagline: "עד 4 אירועים בחודש — החבילה המלאה, בלי פשרות",
    features: [
      "עד 4 אירועים בחודש",
      ...BASE_FEATURES,
      "Clink פסיפס — כל התמונות הופכות ליצירת אמנות אחת 🎨",
      "תמונות AI ללא הגבלה לכל האורחים 🤖",
    ],
    excluded: [],
    recommended: false,
    badge: "VIP 💎",
    bonus: "🎁 בונוס: שלט רול-אפ כניסה מותאם אישית עם QR לכל אירוע",
    borderClass: "border-purple-500/50",
    glowClass: "shadow-lg shadow-purple-500/10",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"onetime" | "subscription">("onetime");
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("spark");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    card_number: "", card_expiry: "", card_cvv: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "שדה חובה";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "מייל לא תקין";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 9) e.phone = "מספר לא תקין";
    if (form.card_number.replace(/\D/g, "").length !== 16) e.card_number = "מספר כרטיס לא תקין";
    if (!form.card_expiry || form.card_expiry.length < 5) e.card_expiry = "תאריך לא תקין";
    if (!form.card_cvv || form.card_cvv.length < 3) e.card_cvv = "CVV לא תקין";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const plans = mode === "onetime" ? ONETIME_PLANS : SUB_PLANS;
  const currentPlan = plans.find((p) => p.id === selectedPlan) ?? plans[1];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1800));

    const aiLimit = selectedPlan === "crown" ? -1 : null;

    const licBody: Record<string, unknown> = {
      email: form.email.trim(),
      type: mode === "onetime" ? "onetime" : "subscription",
      plan_tier: selectedPlan,
    };
    if (mode === "onetime") licBody.days_access = 3;
    else licBody.events_per_month = 4;
    licBody.ai_images_limit = aiLimit;

    const licRes = await fetch("/api/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(licBody),
    });
    const licData = await licRes.json();

    setLoading(false);

    if (!licRes.ok || !licData.license) {
      toast.error("שגיאה ביצירת הרישיון. פנה לתמיכה.");
      return;
    }

    localStorage.setItem("clink_license_id", licData.license.id);
    localStorage.setItem("clink_license_email", form.email.trim().toLowerCase());
    localStorage.removeItem("clink_paid");

    setPaid(true);
    setTimeout(() => router.push("/create"), 2000);
  };

  // ── Success screen ──
  if (paid) {
    return (
      <div className="min-h-screen bg-wedding-bg flex items-center justify-center px-4" dir="rtl">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-wedding-ink mb-2">התשלום עבר בהצלחה!</h2>
          <p className="text-wedding-muted text-sm mb-2">מעבירים אותך ליצירת האירוע...</p>
          <div className="flex justify-center mt-4">
            <span className="h-5 w-5 border-2 border-wedding-accent/30 border-t-wedding-accent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wedding-bg py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <PicMeLogo size={64} textSize="text-2xl" />
        </div>

        <Link href="/" className="inline-flex items-center gap-2 text-wedding-muted hover:text-wedding-ink transition-colors mb-6 text-sm">
          <ArrowRight className="h-4 w-4" />
          חזרה לדף הבית
        </Link>

        {/* Mode toggle */}
        <div className="flex wedding-card border border-wedding-border rounded-2xl p-1 mb-8 gap-1">
          <button
            onClick={() => setMode("onetime")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              mode === "onetime"
                ? "bg-wedding-accent text-white shadow-lg shadow-wedding-accent/30"
                : "text-wedding-muted hover:text-wedding-ink"
            )}
          >
            <Zap className="h-4 w-4" />
            רכישה חד פעמית
          </button>
          <button
            onClick={() => setMode("subscription")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              mode === "subscription"
                ? "bg-wedding-accent text-white shadow-lg shadow-wedding-accent/30"
                : "text-wedding-muted hover:text-wedding-ink"
            )}
          >
            <Repeat className="h-4 w-4" />
            מנוי חודשי
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-wedding-muted text-sm">
            {mode === "onetime"
              ? "כל האירועים פתוחים ל-3 ימים · ניתן להאריך בפנייה לתמיכה"
              : "עד 4 אירועים בחודש · ביטול בכל עת"}
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 items-stretch">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isLite = plan.id === "lite";
            const isPremium = plan.id === "spark";
            const isVip = plan.id === "crown";

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative rounded-3xl text-right transition-all duration-300 overflow-hidden h-full flex flex-col",
                  isSelected ? "scale-[1.02]" : "hover:scale-[1.01]",
                )}
              >
                {/* Background gradient per tier */}
                <div className={cn(
                  "absolute inset-0",
                  isLite   ? "bg-wedding-card" : "",
                  isPremium ? "bg-gradient-to-br from-wedding-accent/10 via-wedding-card to-wedding-card" : "",
                  isVip    ? "bg-gradient-to-br from-purple-500/10 via-wedding-card to-wedding-card" : "",
                )} />

                {/* Shimmering top border */}
                <div className={cn(
                  "absolute top-0 inset-x-0 h-[2px]",
                  isLite    ? "bg-gradient-to-r from-transparent via-wedding-border to-transparent" : "",
                  isPremium ? "bg-gradient-to-r from-transparent via-wedding-accent to-transparent" : "",
                  isVip     ? "bg-gradient-to-r from-transparent via-purple-400 to-transparent" : "",
                )} />

                {/* Badge ribbon */}
                {plan.badge && (
                  <div className={cn(
                    "absolute top-4 right-0 px-3 py-1 text-[10px] font-black tracking-wide rounded-l-full",
                    isPremium ? "bg-wedding-accent text-white" : "bg-purple-600 text-white"
                  )}>
                    {plan.badge}
                  </div>
                )}

                <div className="relative p-6 pt-8 flex flex-col flex-1">
                  {/* Selected dot */}
                  <div className={cn(
                    "absolute top-4 left-4 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected
                      ? isPremium ? "border-wedding-accent bg-wedding-accent"
                        : isVip ? "border-purple-400 bg-purple-400"
                        : "border-wedding-accent/50 bg-wedding-accent/20"
                      : "border-wedding-border"
                  )}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>

                  {/* Emoji + name */}
                  <div className="mb-4">
                    <div className={cn(
                      "text-3xl mb-2 w-12 h-12 rounded-2xl flex items-center justify-center",
                      isLite    ? "bg-wedding-bg" : "",
                      isPremium ? "bg-wedding-accent/15" : "",
                      isVip     ? "bg-purple-500/15" : "",
                    )}>{plan.emoji}</div>
                    <h3 className={cn(
                      "font-black text-xl mb-1",
                      isPremium ? "text-wedding-accent-dark" : isVip ? "text-purple-600" : "text-wedding-ink"
                    )}>{plan.name}</h3>
                    <p className="text-wedding-muted text-[11px] leading-snug">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className={cn(
                    "mb-5 pb-5 border-b",
                    isPremium ? "border-wedding-accent/20" : isVip ? "border-purple-500/20" : "border-wedding-border"
                  )}>
                    <div className="flex items-end gap-1">
                      <span className={cn(
                        "text-4xl font-black",
                        isPremium ? "text-wedding-accent-dark" : isVip ? "text-purple-600" : "text-wedding-ink"
                      )}>{plan.price.toLocaleString()}</span>
                      <span className="text-wedding-muted text-sm mb-1.5">₪{mode === "subscription" ? "/חודש" : ""}</span>
                    </div>
                    {mode === "onetime" && (
                      <p className="text-wedding-muted text-[10px] mt-0.5">לאירוע · 3 ימי גישה</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-4 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-wedding-ink text-right">
                        <div className={cn(
                          "mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                          isPremium ? "bg-wedding-accent/20" : isVip ? "bg-purple-500/20" : "bg-wedding-border"
                        )}>
                          <Check className={cn(
                            "h-2.5 w-2.5",
                            isPremium ? "text-wedding-accent" : isVip ? "text-purple-500" : "text-wedding-muted"
                          )} />
                        </div>
                        {f}
                      </li>
                    ))}
                    {plan.excluded.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-wedding-muted/60 text-right">
                        <div className="mt-0.5 w-4 h-4 rounded-full bg-wedding-bg flex items-center justify-center flex-shrink-0">
                          <X className="h-2.5 w-2.5 text-wedding-muted/60" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Bonus */}
                  {plan.bonus && (
                    <div className="bg-purple-500/10 border border-purple-500/25 rounded-2xl px-4 py-3">
                      <p className="text-purple-600 text-[11px] font-semibold leading-relaxed">{plan.bonus}</p>
                    </div>
                  )}

                  {/* CTA line */}
                  <div className={cn(
                    "mt-5 w-full py-2.5 rounded-xl text-xs font-bold text-center transition-all",
                    isSelected
                      ? isPremium ? "bg-wedding-accent text-white"
                        : isVip ? "bg-purple-600 text-white"
                        : "bg-wedding-accent/15 text-wedding-ink"
                      : isPremium ? "bg-wedding-accent/10 text-wedding-accent-dark border border-wedding-accent/30"
                        : isVip ? "bg-purple-500/10 text-purple-600 border border-purple-500/30"
                        : "bg-wedding-bg text-wedding-muted border border-wedding-border"
                  )}>
                    {isSelected ? "✓ נבחר" : "בחרו מסלול זה"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected plan summary */}
        <div className={cn(
          "rounded-2xl border-2 p-5 mb-6 transition-all",
          currentPlan.borderClass,
          currentPlan.glowClass,
          "wedding-card"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentPlan.emoji}</span>
              <div>
                <h3 className="text-wedding-ink font-black">מסלול {currentPlan.name}</h3>
                <p className="text-wedding-muted text-xs">{currentPlan.tagline}</p>
              </div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-black gradient-text">{currentPlan.price.toLocaleString()} ₪</div>
              <div className="text-xs text-wedding-muted">{mode === "subscription" ? "לחודש" : "לאירוע"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {currentPlan.features.map((f) => (
              <span key={f} className="flex items-center gap-1.5 text-xs text-wedding-ink">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                {f}
              </span>
            ))}
          </div>

          {currentPlan.bonus && (
            <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <p className="text-purple-600 text-xs font-semibold">{currentPlan.bonus}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
            {(mode === "onetime"
              ? ["תשלום חד פעמי", "אין מנוי", "גישה ל-3 ימים"]
              : ["עד 4 אירועים/חודש", "ביטול בכל עת", "3 ימי גישה לכל אירוע"]
            ).map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs text-wedding-muted">
                <Check className="h-3 w-3 text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal details */}
          <div className="wedding-card border border-wedding-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-wedding-accent" />
              <p className="text-sm font-semibold text-wedding-ink">פרטים אישיים</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-wedding-muted mb-1.5">שם מלא *</label>
              <input type="text" value={form.full_name} onChange={(e) => set("full_name", e.target.value)}
                placeholder="ישראל ישראלי"
                className={cn("w-full bg-wedding-bg border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all text-sm",
                  errors.full_name ? "border-red-500" : "border-wedding-border")} />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-wedding-muted mb-1.5 flex items-center gap-1">
                <Mail className="h-3 w-3" /> מייל * (לקבלת אישור ופרטי האירוע)
              </label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="your@email.com" dir="ltr" autoComplete="email"
                className={cn("w-full bg-wedding-bg border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all text-sm",
                  errors.email ? "border-red-500" : "border-wedding-border")} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-wedding-muted mb-1.5 flex items-center gap-1">
                <Phone className="h-3 w-3" /> טלפון *
              </label>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="050-0000000" dir="ltr" autoComplete="tel"
                className={cn("w-full bg-wedding-bg border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all text-sm",
                  errors.phone ? "border-red-500" : "border-wedding-border")} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Payment details */}
          <div className="wedding-card border border-wedding-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-wedding-accent" />
                <p className="text-sm font-semibold text-wedding-ink">פרטי תשלום</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-wedding-muted">
                <Lock className="h-3 w-3" />
                מאובטח
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-wedding-muted mb-1.5">מספר כרטיס *</label>
              <div className="relative">
                <input type="text" inputMode="numeric" value={form.card_number}
                  onChange={(e) => set("card_number", formatCard(e.target.value))}
                  placeholder="0000 0000 0000 0000" dir="ltr" maxLength={19}
                  className={cn("w-full bg-wedding-bg border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all text-sm tracking-widest",
                    errors.card_number ? "border-red-500" : "border-wedding-border")} />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-wedding-muted" />
              </div>
              {errors.card_number && <p className="text-red-500 text-xs mt-1">{errors.card_number}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-wedding-muted mb-1.5">תוקף *</label>
                <input type="text" inputMode="numeric" value={form.card_expiry}
                  onChange={(e) => set("card_expiry", formatExpiry(e.target.value))}
                  placeholder="MM/YY" dir="ltr" maxLength={5}
                  className={cn("w-full bg-wedding-bg border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all text-sm",
                    errors.card_expiry ? "border-red-500" : "border-wedding-border")} />
                {errors.card_expiry && <p className="text-red-500 text-xs mt-1">{errors.card_expiry}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-wedding-muted mb-1.5">CVV *</label>
                <input type="password" inputMode="numeric" value={form.card_cvv}
                  onChange={(e) => set("card_cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••" dir="ltr" maxLength={4}
                  className={cn("w-full bg-wedding-bg border rounded-xl px-4 py-3 text-wedding-ink placeholder-wedding-muted/60 focus:outline-none focus:ring-2 focus:ring-wedding-accent transition-all text-sm",
                    errors.card_cvv ? "border-red-500" : "border-wedding-border")} />
                {errors.card_cvv && <p className="text-red-500 text-xs mt-1">{errors.card_cvv}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-wedding-muted">מקבלים:</span>
              {["Visa", "Mastercard", "Amex"].map((c) => (
                <span key={c} className="text-xs text-wedding-muted bg-wedding-bg border border-wedding-border rounded px-2 py-0.5">{c}</span>
              ))}
            </div>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAgreedToTerms(v => !v)}
              className={cn(
                "mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all",
                agreedToTerms
                  ? "bg-wedding-accent border-wedding-accent"
                  : "border-wedding-muted group-hover:border-wedding-ink"
              )}
            >
              {agreedToTerms && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="text-sm text-wedding-ink leading-snug" onClick={() => setAgreedToTerms(v => !v)}>
              קראתי ואני מאשר/ת את{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-wedding-accent underline hover:text-wedding-accent-dark transition-colors"
              >
                תנאי השימוש
              </a>
              {" "}ו
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-wedding-accent underline hover:text-wedding-accent-dark transition-colors"
              >
                מדיניות הפרטיות
              </a>
            </span>
          </label>

          {/* Submit */}
          <button type="submit" disabled={loading || !agreedToTerms}
            className="w-full flex items-center justify-center gap-3 btn-gold disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-wedding-accent/30 transition-all active:scale-95">
            {loading ? (
              <>
                <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                מעבד תשלום...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                {mode === "onetime"
                  ? `שלם ${currentPlan.price.toLocaleString()} ₪ וצור אירוע`
                  : `הירשם למנוי ${currentPlan.name} — ${currentPlan.price.toLocaleString()} ₪ / חודש`}
                <ArrowLeft className="h-5 w-5" />
              </>
            )}
          </button>

          <p className="text-center text-wedding-muted text-xs flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            תשלום מאובטח · הפרטים שלך מוצפנים ומוגנים
          </p>
        </form>
      </div>
    </div>
  );
}
