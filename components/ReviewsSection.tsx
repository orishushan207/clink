"use client";

import { useEffect, useState } from "react";
import { Star, PenLine } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface Review {
  id?: string;
  name: string;
  role: string;
  avatar: string;
  stars: number;
  text: string;
}

const AVATARS = ["💬", "💍", "🎉", "🥂", "🎂", "🎓", "✡️", "👨‍👩‍👧", "❤️", "⭐"];

// Seed reviews shown by default (alongside the ones visitors submit).
const SEED_REVIEWS: Review[] = [
  { name: "נועה ואלון", role: "חתונה · 14.3.2026", avatar: "👩‍❤️‍👨", stars: 5, text: "היה לנו חשש שהאורחים לא ישתמשו בזה, אבל תוך 10 דקות היו כבר 80 תמונות. המצגת של התמונות שנוספו בלייב על המסך בזמן האוכל הייתה בין הדברים המצחיקים בחתונה. האורחים עפו על זה." },
  { name: "תמר", role: "בת מצווה · 15.12.2025", avatar: "🎉", stars: 5, text: "ייחודי ברמות!! רוב האורחים כולל הסבתות, הצליחו לסרוק ולהעלות תמונות. בסוף האירוע קיבלנו ארכיון מלא מ-120 איש. לא האמנו שאנשים ישתפו פעולה ברמה כזאת." },
  { name: "רועי ומיכל", role: "חתונה · 25.11.2025", avatar: "🥂", stars: 5, text: "הכי אהבנו שאנשים שלא מכירים אחד את השני התחילו לתייג ולהגיב על תמונות. זה יצר חיבור ושיח בין אורחים שלא הכירו לפני ויש מצב שנוצרו איזה זוג או שניים 😉😅" },
  { name: "דני", role: "מסיבת יום הולדת · 2.1.2026", avatar: "🎂", stars: 5, text: "השתמשנו ב-Clink ביום הולדת ה-40 שלי. תוך שעה היו מעל 200 תמונות מכל הכיוונים — אנשים שלא ראיתי שנים שלחו תמונות ישנות שלנו מהעבר ביחד עם חדשות. היה מטורף." },
  { name: "שירה ויובל", role: "חתונה · 8.2.2026", avatar: "💍", stars: 5, text: "הצלם שלנו אמר שזאת הייתה הפעם הראשונה שהוא רואה אורחים מצלמים בתדירות כזאת. כולם רצו להיות בגלריה. הצ׳אט בין האורחים יצר אווירה מטורפת — אנשים שלא הכירו תוך זמן קצר כבר דיברו אחד עם השני." },
  { name: "אבי", role: "בר מצווה · 20.3.2026", avatar: "✡️", stars: 5, text: "קיבלנו 340 תמונות מ-90 אורחים. הילד שלנו ישב ועבר על כל תמונה עם חיוך ענק. ההתראות בזמן אמת על לייקים ותגובות גרמו לכולם להמשיך לגלוש ולשתף כל הלילה." },
  { name: "אופיר", role: "מסיבת סיום לימודים · 11.4.2026", avatar: "🎓", stars: 5, text: "השתמשנו ב-Clink לסיום התואר. היה כיף לראות תמונות מכל הכיתה בגלריה אחת. ה-Live Wall על המסך הגדול עשה את האווירה. הורדנו את כל הזיכרונות בZIP אחד בסוף." },
];

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [stars, setStars] = useState(5);
  const [avatar, setAvatar] = useState("💬");
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.reviews) && data.reviews.length > 0) {
          const fetched: Review[] = data.reviews.map((r: Review) => ({
            name: r.name,
            role: r.role || "",
            avatar: r.avatar || "💬",
            stars: r.stars,
            text: r.text,
          }));
          // Visitor reviews first, then the seed stories.
          setReviews([...fetched, ...SEED_REVIEWS]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setName(""); setRole(""); setStars(5); setAvatar("💬"); setText("");
  };

  const handleSubmit = async () => {
    if (name.trim().length < 2) { toast.error("נא להזין שם (לפחות 2 תווים)"); return; }
    if (text.trim().length < 10) { toast.error("הביקורת קצרה מדי (לפחות 10 תווים)"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role: role.trim(), stars, avatar, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "שגיאה בשליחת הביקורת"); return; }

      setReviews((prev) => [data.review as Review, ...prev]);
      toast.success("תודה! הביקורת שלך נוספה 🙏");
      resetForm();
      setOpen(false);
    } catch {
      toast.error("שגיאת רשת, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12">
      <div className="text-center mb-8 px-6">
        <h2 className="text-2xl font-bold text-wedding-ink mb-2">מה אומרים עלינו?</h2>
        <p className="text-wedding-muted text-sm">אנשים שכבר חוו את Clink באירועים שלהם</p>
        <Button
          variant="outline"
          size="md"
          className="mt-4 inline-flex items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <PenLine className="h-4 w-4" />
          כתבו ביקורת
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {reviews.map((r, idx) => (
          <div key={r.id ?? `${r.name}-${idx}`} className="wedding-card rounded-2xl p-5 flex flex-col gap-3 flex-shrink-0 w-72 snap-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wedding-accent/30 to-amber-500/30 border border-wedding-accent/20 flex items-center justify-center text-xl flex-shrink-0">
                {r.avatar}
              </div>
              <div>
                <p className="text-wedding-ink text-sm font-semibold">{r.name}</p>
                {r.role && <p className="text-wedding-muted text-xs">{r.role}</p>}
              </div>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: r.stars }).map((_, i) => (
                <span key={i} className="text-wedding-accent text-sm">★</span>
              ))}
            </div>
            <p className="text-wedding-muted text-xs leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="כתיבת ביקורת">
        <div className="flex flex-col gap-4">
          <Input
            label="שם"
            placeholder="איך לקרוא לך?"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="סוג האירוע (לא חובה)"
            placeholder="לדוגמה: חתונה · 2026"
            value={role}
            maxLength={40}
            onChange={(e) => setRole(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-wedding-muted">דירוג</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  aria-label={`${n} כוכבים`}
                  className="p-1 transition-transform active:scale-90"
                >
                  <Star
                    className={`h-7 w-7 ${n <= stars ? "fill-wedding-accent text-wedding-accent" : "text-wedding-border"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-wedding-muted">סמל</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border transition-all ${
                    avatar === a
                      ? "border-wedding-accent bg-wedding-accent/10 scale-105"
                      : "border-wedding-border hover:bg-wedding-accent/5"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="הביקורת שלך"
            placeholder="ספרו על החוויה שלכם עם Clink..."
            value={text}
            maxLength={500}
            rows={4}
            onChange={(e) => setText(e.target.value)}
          />

          <Button fullWidth size="lg" loading={submitting} onClick={handleSubmit}>
            שליחת ביקורת
          </Button>
        </div>
      </Modal>
    </section>
  );
}
