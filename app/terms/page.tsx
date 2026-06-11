import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PicMeLogo from "@/components/PicMeLogo";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-wedding-bg py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">

        <div className="flex justify-center mb-8">
          <PicMeLogo size={64} textSize="text-2xl" />
        </div>

        <Link href="/" className="inline-flex items-center gap-2 text-wedding-muted hover:text-wedding-ink transition-colors mb-8 text-sm">
          <ArrowRight className="h-4 w-4" />
          חזרה לעמוד הראשי
        </Link>

        <div className="wedding-card border border-wedding-border rounded-3xl p-8 space-y-8 text-wedding-muted text-sm leading-relaxed">

          <div>
            <h1 className="text-2xl font-black text-wedding-ink mb-1">תנאי שימוש</h1>
            <p className="text-wedding-muted text-xs">עדכון אחרון: מאי 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">1. כללי</h2>
            <p>Clink ("השירות") הינו פלטפורמה לניהול גלריות תמונות ושיתוף מדיה באירועים. השימוש בשירות מהווה הסכמה לתנאים המפורטים להלן.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">2. השירות</h2>
            <p>Clink מאפשרת ליוצרי אירועים לפתוח גלריה שיתופית שאורחיהם יכולים להעלות אליה תמונות וסרטונים. הגלריה זמינה למשך 7 ימים מיום יצירת האירוע.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">3. תשלום</h2>
            <p>העלות היא 499 ₪ לאירוע, תשלום חד פעמי. אין מנוי ואין חיובים נסתרים. התשלום מתבצע בטרם יצירת האירוע.</p>
          </section>

          <section className="space-y-2 bg-wedding-accent/5 border border-wedding-accent/20 rounded-2xl p-4">
            <h2 className="text-wedding-accent-dark font-bold text-base">4. מדיניות ביטול והחזרים</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>ביטול עד 24 שעות מרגע התשלום ולפני יצירת האירוע — החזר מלא.</li>
              <li>האירוע התבטל מכל סיבה שהיא ולא נעשה שימוש בשירות Clink — החזר כספי מלא.</li>
              <li>ביטול לאחר יצירת האירוע ושימוש בשירות — לא יינתן החזר כספי.</li>
              <li>במקרה של תקלה טכנית מצד Clink שמנעה שימוש — יינתן החזר מלא או אירוע חלופי.</li>
              <li>לפניות בנושא ביטולים: <a href="mailto:clink.support@gmail.com" className="text-wedding-accent underline">clink.support@gmail.com</a></li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">5. תוכן ואחריות</h2>
            <p>המשתמש אחראי לכל תוכן שהוא מעלה. אסור להעלות תוכן פוגעני, מיני, גזעני, מפר זכויות יוצרים, או כל תוכן בלתי חוקי. Clink שומרת לעצמה הזכות להסיר תוכן כזה ללא הודעה מוקדמת.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">6. קניין רוחני</h2>
            <p>התמונות והסרטונים שהועלו שייכים לבעליהם המקוריים. Clink אינה רוכשת בעלות על תוכן שהועלה לפלטפורמה.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">7. הגבלת אחריות</h2>
            <p>Clink אינה אחראית לאובדן תמונות עקב תקלות טכניות מעבר לשליטתה. מומלץ לשמור עותקים מקומיים של קבצים חשובים.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">8. יצירת קשר</h2>
            <p>לכל שאלה: <a href="mailto:clink.support@gmail.com" className="text-wedding-accent underline">clink.support@gmail.com</a></p>
          </section>

        </div>

        <div className="text-center mt-6">
          <Link href="/privacy" className="text-wedding-muted text-xs hover:text-wedding-ink transition-colors underline">
            מדיניות פרטיות
          </Link>
        </div>
      </div>
    </div>
  );
}
