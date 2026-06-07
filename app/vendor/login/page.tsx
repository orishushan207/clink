"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";

const VENDOR_SESSION_KEY = "picme_vendor_token";

export default function VendorLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/vendor/events?token=${encodeURIComponent(token.trim())}`);
      const { events } = await res.json();

      if (!res.ok || !Array.isArray(events)) {
        toast.error("טוקן שגוי");
        return;
      }
      if (events.length === 0) {
        toast.error("לא נמצאו אירועים עם טוקן זה");
        return;
      }

      localStorage.setItem(VENDOR_SESSION_KEY, token.trim());
      router.push("/vendor/dashboard");
    } catch {
      toast.error("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-party-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-party-gold to-amber-500 flex items-center justify-center shadow-lg shadow-party-gold/30 mb-4">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">כניסת ספק</h1>
          <p className="text-gray-500 text-sm mt-1">נהל את כל האירועים שלך ממקום אחד</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">טוקן ספק</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="הכנס את טוקן הספק שלך"
                dir="ltr"
                autoFocus
                className="w-full bg-party-surface border border-party-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors pr-11"
              />
              <button type="button" onClick={() => setShowToken(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !token.trim()}
            className="w-full flex items-center justify-center gap-2 btn-gold disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-party-gold/30">
            {loading
              ? <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><LogIn className="h-5 w-5" />כניסה לדשבורד</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
