"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function DevLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);

    // Verify against the events API with the secret
    const res = await fetch("/api/dev/events", {
      headers: { "x-dev-token": secret.trim() },
    });

    if (res.ok) {
      localStorage.setItem("dev_token", secret.trim());
      router.push("/dev/dashboard");
    } else {
      toast.error("קוד גישה שגוי");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-party-bg flex items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-party-surface border border-party-border flex items-center justify-center mb-4">
            <Terminal className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Developer Panel</h1>
          <p className="text-gray-500 text-sm mt-1">כניסה עם קוד גישה סודי</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Secret key"
              dir="ltr"
              className="w-full bg-party-surface border border-party-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-party-gold transition-colors pr-12 font-mono text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full btn-gold text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              "כניסה"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
