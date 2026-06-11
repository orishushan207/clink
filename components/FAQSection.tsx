"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "איך האורחים מעלים תמונות לאירוע?",
    a: "פשוט מאוד — סורקים את ה-QR Code שמציגים באירוע, בוחרים כינוי, ומיד מתחילים לצלם ולהעלות. ללא הורדת אפליקציה וללא הרשמה.",
  },
  {
    q: "האם צריך להוריד אפליקציה?",
    a: "לא. Clink עובדת ישירות מהדפדפן של הטלפון. סריקה אחת של QR ואתם בפנים — זה הכל.",
  },
  {
    q: "מה זה Live Wall ואיך זה עובד?",
    a: "Live Wall היא מצגת חיה שמוקרנת על המסך הגדול באולם. כל תמונה שאורח מעלה מופיעה תוך שניות על הסקרין — עם שמו והכיתוב. זה יוצר אנרגיה מטורפת ומעלה את כמות התמונות שהאורחים מעלים.",
  },
  {
    q: "מה זה Clink פסיפס?",
    a: "Clink פסיפס הוא פיצ׳ר בלעדי שהופך את כל תמונות האורחים ליצירת אמנות אחת — פורטרט שלכם, תמונה משפחתית או כל תמונה שתבחרו, הופכת לפסיפס המורכב מכל התמונות של האורחים.",
  },
  {
    q: "כמה אורחים יכולים להשתתף?",
    a: "אין הגבלה. בין אם מדובר בחתונה עם 300 איש או מסיבה קטנה של 20 — כולם יכולים להצטרף ולהעלות בו-זמנית.",
  },
  {
    q: "האם ניתן לשלוט על אילו תמונות מופיעות בגלריה?",
    a: "כן. בפאנל הניהול ניתן לאשר או לדחות כל תמונה לפני שמופיעה לכולם. ניתן גם לחסום אורחים ולהסיר תמונות בכל שלב.",
  },
  {
    q: "האם ניתן להוריד את כל התמונות?",
    a: "בהחלט. בסוף האירוע ניתן להוריד את כל התמונות והסרטונים בקובץ ZIP אחד מסודר — ישירות מפאנל הניהול.",
  },
  {
    q: "כמה זמן הגלריה נשמרת?",
    a: "הגלריה נשמרת לפי תנאי המסלול שרכשתם. גם אחרי האירוע — הצ׳אט פעיל, הגלריה פתוחה והאורחים ממשיכים לשתף.",
  },
  {
    q: "מה קורה אחרי האירוע?",
    a: "הגלריה נשארת פתוחה, האורחים ממשיכים לגלוש, להגיב ולצ׳וטט. אפשר להוריד את כל המדיה בכל עת ולשמור את הזיכרונות לנצח.",
  },
  {
    q: "כמה עולה Clink?",
    a: "Clink עובדת במודל של תשלום חד-פעמי לפי אירוע — ללא מנוי וללא הפתעות. המחיר מתחיל מ-249 ₪ ונבנה בהתאם לאורך האירוע ולתוספות שתרצו.",
  },
  {
    q: "מה קורה אם יש תקלה טכנית באמצע האירוע?",
    a: "אנחנו זמינים 24/7 — גם בשבת, גם בחגים, גם בשתיים בלילה. בכל שאלה או תקלה, צוות התמיכה של Clink זמין להגיב בזמן אמת ולוודא שהאירוע שלכם מתנהל בצורה חלקה מהרגע הראשון ועד האחרון.",
  },
  {
    q: "האם אפשר שתנהלו לנו את הכל מרחוק?",
    a: "בהחלט. אם אתם מעדיפים שלא להתעסק בשום דבר טכני, אנחנו נדאג לכל — הגדרת האירוע, עיצוב הגלריה, הפעלת ה-Live Wall וה-Clink פסיפס, וניהול שוטף לאורך כל האירוע. אתם נהנים, אנחנו מטפלים בכל השאר.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="max-w-2xl mx-auto px-6 py-16 pb-20" dir="rtl">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-wedding-ink mb-2">שאלות נפוצות</h2>
        <p className="text-wedding-muted text-sm">כל מה שרציתם לדעת על Clink</p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className={cn(
              "wedding-card border rounded-2xl overflow-hidden transition-all",
              openIndex === i ? "border-wedding-accent/30" : "border-wedding-border"
            )}
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-right gap-4"
            >
              <span className="text-wedding-ink font-semibold text-sm leading-snug">{faq.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-wedding-muted flex-shrink-0 transition-transform duration-200",
                  openIndex === i && "rotate-180 text-wedding-accent"
                )}
              />
            </button>

            {openIndex === i && (
              <div className="px-5 pb-5 border-t border-wedding-border pt-4">
                <p className="text-wedding-muted text-sm leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
