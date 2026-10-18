"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, LogOut, Eye, EyeOff, Trash2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface ReviewRow {
  id: string;
  name: string;
  role: string | null;
  avatar: string;
  stars: number;
  text: string;
  approved: boolean;
  created_at: string;
}

export default function DevReviews() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("dev_token") ?? "";
    if (!t) { router.replace("/dev"); return; }
    setToken(t);
    fetch("/api/dev/reviews", { headers: { "x-dev-token": t } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { router.replace("/dev"); return; }
        setReviews(d.reviews);
      })
      .catch(() => router.replace("/dev"))
      .finally(() => setLoading(false));
  }, [router]);

  const toggleApproved = async (rev: ReviewRow) => {
    const res = await fetch(`/api/dev/reviews/${rev.id}`, {
      method: "PATCH",
      headers: { "x-dev-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !rev.approved }),
    });
    if (res.ok) {
      setReviews((prev) => prev.map((r) => r.id === rev.id ? { ...r, approved: !rev.approved } : r));
      toast.success(rev.approved ? "הביקורת הוסתרה" : "הביקורת מוצגת שוב");
    } else {
      toast.error("שגיאה בעדכון");
    }
  };

  const deleteReview = async (rev: ReviewRow) => {
    if (!confirm(`למחוק לצמיתות את הביקורת של "${rev.name}"?`)) return;
    const res = await fetch(`/api/dev/reviews/${rev.id}`, {
      method: "DELETE",
      headers: { "x-dev-token": token },
    });
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== rev.id));
      toast.success("הביקורת נמחקה");
    } else {
      toast.error("שגיאה במחיקה");
    }
  };

  const logout = () => {
    localStorage.removeItem("dev_token");
    router.replace("/dev");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-party-bg flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-party-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-party-bg/95 backdrop-blur border-b border-party-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-yellow-400" />
          <span className="font-bold text-white text-sm">ניהול ביקורות</span>
          <span className="text-xs text-gray-500 bg-party-surface px-2 py-0.5 rounded-full">{reviews.length} ביקורות</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dev/dashboard")}
            title="חזרה לדשבורד"
            className="text-gray-500 hover:text-yellow-400 transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowRight className="h-4 w-4" />
            דשבורד
          </button>
          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`bg-party-surface border rounded-2xl p-4 ${rev.approved ? "border-party-border" : "border-red-500/30 opacity-70"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rev.avatar}</span>
                    <span className="text-white font-semibold text-sm">{rev.name}</span>
                    {rev.role && <span className="text-gray-500 text-xs">{rev.role}</span>}
                    <span className="text-yellow-400 text-xs">{"★".repeat(rev.stars)}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed mt-2">{rev.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rev.approved ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {rev.approved ? "מוצגת" : "מוסתרת"}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(rev.created_at).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleApproved(rev)}
                    title={rev.approved ? "הסתר ביקורת" : "הצג ביקורת"}
                    className="p-2 rounded-xl text-gray-500 hover:text-yellow-400 hover:bg-party-bg transition-all"
                  >
                    {rev.approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteReview(rev)}
                    title="מחק ביקורת"
                    className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {reviews.length === 0 && (
            <div className="text-center text-gray-600 py-12 text-sm">אין ביקורות עדיין</div>
          )}
        </div>
      </div>
    </div>
  );
}
