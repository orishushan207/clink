"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, X, LogIn } from "lucide-react";
import { getAdminSessionKey } from "@/lib/utils";
import toast from "react-hot-toast";

interface AdminLoginModalProps {
  slug: string;
  onClose: () => void;
}

export default function AdminLoginModal({ slug, onClose }: AdminLoginModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, token: password.trim() }),
      });

      if (!res.ok) {
        toast.error("סיסמה שגויה");
        return;
      }

      const { eventId, adminToken } = await res.json();
      localStorage.setItem(getAdminSessionKey(eventId), adminToken);
      toast.success("כניסה בהצלחה!");
      router.push(`/admin/event/${eventId}`);
    } catch {
      toast.error("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-party-surface border border-party-border rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-party-gold to-amber-500 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-white font-bold">כניסת מנהל</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              סיסמת מנהל
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הכנס את קוד המנהל"
                dir="ltr"
                autoFocus
                className="w-full bg-party-surface2 border border-party-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 btn-gold disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                כניסה לפאנל ניהול
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
