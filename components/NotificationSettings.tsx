"use client";

import { useState } from "react";
import { Bell, BellOff, X, MessageCircle, Heart, Activity, Smartphone, Lock, WifiOff } from "lucide-react";
import { usePushNotifications, type PushPreferences } from "@/hooks/usePushNotifications";
import toast from "react-hot-toast";

interface NotificationSettingsProps {
  guestId: string;
  eventId: string;
  isAdmin?: boolean;
  onClose: () => void;
}

export default function NotificationSettings({ guestId, eventId, isAdmin, onClose }: NotificationSettingsProps) {
  const { permission, subscribed, loading, subscribe, unsubscribe, unsupportedReason } =
    usePushNotifications(guestId, eventId);

  const [prefs, setPrefs] = useState<PushPreferences>({
    messages: true,
    likes: true,
    adminAll: false,
  });

  const toggle = (key: keyof PushPreferences) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleEnable = async () => {
    const ok = await subscribe(prefs);
    if (ok) toast.success("התראות הופעלו ✅");
  };

  const handleDisable = async () => {
    await unsubscribe();
    toast("התראות כובו", { icon: "🔕" });
  };

  const isBlocked = permission === "denied";
  const isUnsupported = !!unsupportedReason;

  const unsupportedContent = () => {
    if (unsupportedReason === "http_non_localhost") {
      return (
        <div className="text-center py-6 space-y-4">
          <WifiOff className="h-10 w-10 text-gray-500 mx-auto" />
          <div className="space-y-1">
            <p className="text-white font-semibold text-sm">נדרש חיבור מאובטח (HTTPS)</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              התראות Push דורשות HTTPS.<br />
              בסביבת פיתוח (192.168.x.x) הפיצ׳ר לא פועל —<br />
              לאחר פריסה לדומיין אמיתי הכל יעבוד.
            </p>
          </div>
        </div>
      );
    }

    if (unsupportedReason === "ios_not_pwa") {
      return (
        <div className="space-y-4">
          <div className="text-center pt-2">
            <p className="text-white font-bold text-base">התקן את האפליקציה לקבלת התראות</p>
            <p className="text-gray-400 text-xs mt-1">ב-iOS צריך להוסיף למסך הבית</p>
          </div>

          <div className="space-y-2">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="text-white text-sm font-medium">לחץ על כפתור השיתוף</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  הכפתור{" "}
                  <span className="inline-flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded text-white text-xs">
                    <span>⬆</span> שתף
                  </span>{" "}
                  נמצא בתחתית ספארי, באמצע
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="text-white text-sm font-medium">בחר "הוסף למסך הבית"</p>
                <p className="text-gray-400 text-xs mt-0.5">גלול למטה ברשימת האפשרויות עד שתמצא את האפשרות הזו</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
              <div>
                <p className="text-white text-sm font-medium">לחץ "הוסף" בפינה הימנית העליונה</p>
                <p className="text-gray-400 text-xs mt-0.5">האפליקציה תתווסף למסך הבית שלך</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 bg-party-gold/10 border border-party-gold/20 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-full bg-party-gold/20 text-yellow-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
              <div>
                <p className="text-yellow-200 text-sm font-medium">פתח מהמסך הבית וחזור לכאן</p>
                <p className="text-gray-400 text-xs mt-0.5">מהאייקון במסך הבית — לא מספארי</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-6 space-y-3">
        <BellOff className="h-10 w-10 text-gray-500 mx-auto" />
        <p className="text-gray-400 text-sm">התראות אינן נתמכות בדפדפן זה.</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-lg bg-party-surface border border-party-border rounded-t-3xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-1" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">הגדרות התראות</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Blocked by user */}
        {isBlocked && !isUnsupported && (
          <div className="space-y-4">
            <div className="text-center py-4 space-y-3">
              <Lock className="h-10 w-10 text-gray-500 mx-auto" />
              <div className="space-y-1">
                <p className="text-white font-semibold text-sm">ההתראות חסומות בדפדפן</p>
                <p className="text-gray-400 text-sm">בעבר נבחר לחסום התראות מאתר זה.</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 space-y-2 text-sm text-gray-300 text-right">
              <p className="font-medium text-white mb-1">איך מאפשרים:</p>
              <p>1. לחץ על <span className="text-blue-400">🔒</span> בשורת הכתובת</p>
              <p>2. בחר <span className="text-blue-400">הגדרות אתר</span></p>
              <p>3. שנה <span className="text-blue-400">התראות → אפשר</span></p>
              <p>4. רענן את הדף וחזור לכאן</p>
            </div>
          </div>
        )}

        {/* Unsupported environment */}
        {isUnsupported && unsupportedContent()}

        {/* Normal state: show preferences + button */}
        {!isBlocked && !isUnsupported && (
          <>
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">קבל התראה על:</p>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 cursor-pointer">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-white">הודעות ישירות</span>
                </div>
                <input type="checkbox" checked={prefs.messages} onChange={() => toggle("messages")} className="w-4 h-4 accent-yellow-500" />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-white">לייקים על התמונות שלך</span>
                </div>
                <input type="checkbox" checked={prefs.likes} onChange={() => toggle("likes")} className="w-4 h-4 accent-yellow-500" />
              </label>

              {isAdmin && (
                <label className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="text-sm text-white">כל פעילות באירוע</p>
                      <p className="text-xs text-gray-500">העלאות, לייקים ועוד</p>
                    </div>
                  </div>
                  <input type="checkbox" checked={prefs.adminAll} onChange={() => toggle("adminAll")} className="w-4 h-4 accent-amber-500" />
                </label>
              )}
            </div>

            {subscribed ? (
              <button
                onClick={handleDisable}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-2xl transition-all disabled:opacity-40"
              >
                <BellOff className="h-4 w-4" />
                כבה התראות
              </button>
            ) : (
              <button
                onClick={handleEnable}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-party-gold hover:bg-party-gold-light text-white text-sm font-semibold rounded-2xl transition-all disabled:opacity-40"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                הפעל התראות
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
