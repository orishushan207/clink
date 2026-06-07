"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CreateEventForm from "@/components/CreateEventForm";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import CopyLinkButton from "@/components/CopyLinkButton";
import Button from "@/components/ui/Button";
import { ArrowRight, ExternalLink, Shield, Mail, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface SuccessData {
  eventId: string;
  slug: string;
  adminToken: string;
  eventUrl: string;
  adminUrl: string;
}

interface LicenseInfo {
  id: string;
  type: "onetime" | "subscription";
  days_access: number | null;
  events_per_month: number | null;
  events_used: number;
  period_start: string | null;
}

const DEV_KEY = "clink2025";

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [licenseEmail, setLicenseEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [checkingLicense, setCheckingLicense] = useState(false);
  const [licenseError, setLicenseError] = useState<{ reason: string; resets_at?: string } | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const verifyLicense = useCallback(async (email: string) => {
    setCheckingLicense(true);
    setLicenseError(null);
    try {
      const res = await fetch(`/api/licenses/check?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.valid) {
        setLicense(data.license);
        setLicenseEmail(email);
        localStorage.setItem("clink_license_id", data.license.id);
        localStorage.setItem("clink_license_email", email);
      } else {
        setLicenseError({ reason: data.reason, resets_at: data.resets_at });
      }
    } catch {
      toast.error("שגיאה בבדיקת הרישיון");
    } finally {
      setCheckingLicense(false);
    }
  }, []);

  useEffect(() => {
    const dev = searchParams.get("dev");
    const token = searchParams.get("token");
    if (dev === DEV_KEY || token) {
      setIsDevMode(true);
      return;
    }
    const storedEmail = localStorage.getItem("clink_license_email");
    const storedId = localStorage.getItem("clink_license_id");
    if (storedEmail && storedId) {
      setEmailInput(storedEmail);
      verifyLicense(storedEmail);
    }
  }, [searchParams, verifyLicense]);

  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    await verifyLicense(emailInput.trim().toLowerCase());
  };

  // ── License description helper ──
  function licenseLabel(lic: LicenseInfo) {
    if (lic.type === "onetime") return `רכישה חד פעמית · ${lic.days_access} ימי גישה`;
    if (lic.events_per_month === null) return `מנוי ללא הגבלה · ${lic.events_used} אירועים בחודש זה`;
    return `מנוי ${lic.events_per_month} אירועים/חודש · השתמשת ב-${lic.events_used} מתוך ${lic.events_per_month}`;
  }

  // ── Success screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-party-bg">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-black text-white">האירוע נוצר בהצלחה!</h1>
            <p className="text-gray-400 mt-2">הנה כל מה שצריך להתחיל</p>
          </div>

          <div className="bg-party-surface border border-party-border rounded-3xl p-6 mb-4 flex flex-col items-center">
            <QRCodeDisplay url={success.eventUrl} eventName={success.slug} size={200} />
          </div>

          <div className="bg-party-surface border border-party-border rounded-2xl p-5 mb-4">
            <p className="text-sm font-medium text-gray-400 mb-2">📎 קישור לאירוע (שתף עם האורחים)</p>
            <p className="text-sm text-white font-mono bg-party-surface2 rounded-xl px-4 py-2 mb-3 break-all">{success.eventUrl}</p>
            <div className="flex gap-2">
              <CopyLinkButton url={success.eventUrl} label="העתק קישור" />
              <a href={success.eventUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="md"><ExternalLink className="h-4 w-4" />פתח</Button>
              </a>
            </div>
          </div>

          <div className="bg-party-surface border border-amber-500/20 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-300">קישור לאדמין (שמור אצלך!)</p>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">זה הקישור לפאנל הניהול שלך. שמור אותו — אתה תצטרך אותו לאשר תמונות, לראות סטטיסטיקות ועוד.</p>
            <p className="text-xs text-white font-mono bg-party-surface2 rounded-xl px-4 py-2 mb-3 break-all">{success.adminUrl}</p>
            <div className="flex gap-2">
              <CopyLinkButton url={success.adminUrl} label="העתק קישור אדמין" variant="outline" />
              <a href={success.adminUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="md"><ExternalLink className="h-4 w-4" />פתח</Button>
              </a>
            </div>
          </div>

          <div className="bg-party-surface2 rounded-2xl p-4 mb-6 border border-party-border">
            <p className="text-sm font-medium text-gray-300 mb-2">💡 טיפים מהירים:</p>
            <ul className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
              <li>• הדפס את ה-QR code ותלה במקומות בולטים באירוע</li>
              <li>• שלח את קישור האירוע בוואטסאפ לפני האירוע</li>
              <li>• הצג את קישור ה-Live Wall על מסך גדול בזמן האירוע</li>
              <li>• שמור את קישור האדמין — אי אפשר לשחזר אותו</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Link href={success.adminUrl} className="flex-1">
              <Button fullWidth size="lg">עבור לפאנל ניהול</Button>
            </Link>
            {(isDevMode || (license?.type === "subscription" && (license.events_per_month === null || license.events_used < license.events_per_month))) && (
              <Link href="/create">
                <Button variant="secondary" size="lg">אירוע נוסף</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── License gate ──
  const isAllowed = isDevMode || !!license;

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-party-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-white">אימות רישיון</h1>
            <p className="text-gray-500 text-sm mt-1">הזן את המייל שבו רכשת</p>
          </div>

          <form onSubmit={handleEmailCheck} className="space-y-4">
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                dir="ltr"
                className="w-full bg-party-surface border border-party-border rounded-xl pr-10 pl-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors text-sm"
              />
            </div>

            {licenseError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  {licenseError.reason === "no_license" && (
                    <p className="text-red-300">לא נמצא רישיון פעיל לכתובת זו. <Link href="/checkout" className="underline text-yellow-400">רכוש עכשיו</Link></p>
                  )}
                  {licenseError.reason === "quota_exceeded" && (
                    <>
                      <p className="text-red-300 font-semibold">הגעת למכסת האירועים החודשית</p>
                      {licenseError.resets_at && (
                        <p className="text-gray-400 text-xs mt-1">
                          המנוי מתאפס ב-{new Date(licenseError.resets_at).toLocaleDateString("he-IL")}
                        </p>
                      )}
                      <Link href="/checkout" className="text-yellow-400 underline text-xs">שדרג מנוי</Link>
                    </>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={checkingLicense || !emailInput.trim()}
              className="w-full btn-gold text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {checkingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : "אמת רישיון"}
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-4">
            אין לך רישיון?{" "}
            <Link href="/checkout" className="text-yellow-400 hover:text-yellow-300 transition-colors">רכוש כאן</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-party-bg">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
          <ArrowRight className="h-4 w-4" />
          <span className="text-sm">חזרה</span>
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-black text-white mb-2">צור אירוע חדש ✨</h1>
          <p className="text-gray-400">מלא את הפרטים וקבל QR code בתוך שניות</p>
        </div>

        {/* License status badge */}
        {license && (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-6">
            <span className="text-emerald-400 text-xs font-medium">{licenseLabel(license)}</span>
            <button
              onClick={() => { setLicense(null); setLicenseError(null); }}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="החלף מייל"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="bg-party-surface border border-party-border rounded-3xl p-6">
          <CreateEventForm
            onSuccess={(data) => {
              // Consume license slot
              if (license) {
                fetch(`/api/licenses/${license.id}/consume`, { method: "POST" }).catch(() => {});
              }
              setSuccess(data);
            }}
            licenseId={license?.id}
            licenseEmail={licenseEmail}
            daysAccess={license?.type === "onetime" ? (license.days_access ?? 2) : 7}
          />
        </div>
      </div>
    </div>
  );
}
