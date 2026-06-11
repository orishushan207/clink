import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PicMeLogo from "@/components/PicMeLogo";

export default function PrivacyPage() {
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
            <h1 className="text-2xl font-black text-wedding-ink mb-1">מדיניות פרטיות</h1>
            <p className="text-wedding-muted text-xs">עדכון אחרון: מאי 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">1. איזה מידע אנחנו אוספים?</h2>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>שם, מייל וטלפון שמוזנים בטופס יצירת האירוע.</li>
              <li>תמונות וסרטונים שהועלו על ידי אורחי האירוע.</li>
              <li>כינוי ואימוג'י שבחר כל אורח.</li>
              <li>מידע טכני בסיסי (סוג מכשיר, דפדפן) לצורכי תמיכה.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">2. כיצד אנחנו משתמשים במידע?</h2>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>הפעלת השירות — ניהול הגלריה ושיתוף התמונות.</li>
              <li>שליחת אישורי תשלום ופרטי אירוע למייל.</li>
              <li>שיפור השירות ופתרון תקלות.</li>
              <li>אנחנו לא מוכרים מידע לצדדים שלישיים.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">3. שמירת מידע</h2>
            <p>תמונות וסרטונים נשמרים עד 7 ימים לאחר יצירת האירוע, ולאחר מכן נמחקים אוטומטית. ניתן לבקש מחיקה מוקדמת בכל עת.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">4. אבטחת מידע</h2>
            <p>המידע מאוחסן על שרתי Supabase עם הצפנה. גישה לניהול האירוע מוגנת בסיסמה.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">5. זכויות המשתמש</h2>
            <p>בהתאם לחוק הגנת הפרטיות הישראלי, יש לך הזכות לעיין במידע שנאסף עליך, לתקנו, או לבקש מחיקתו. לפניות: <a href="mailto:clink.support@gmail.com" className="text-wedding-accent underline">clink.support@gmail.com</a></p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">6. עוגיות (Cookies)</h2>
            <p>השירות משתמש ב-localStorage לשמירת פרטי הגלריה במכשיר המשתמש בלבד. אנחנו לא משתמשים בעוגיות מעקב.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-wedding-ink font-bold text-base">7. יצירת קשר</h2>
            <p>לכל שאלה בנוגע לפרטיות: <a href="mailto:clink.support@gmail.com" className="text-wedding-accent underline">clink.support@gmail.com</a></p>
          </section>

        </div>

        <div className="text-center mt-6">
          <Link href="/terms" className="text-wedding-muted text-xs hover:text-wedding-ink transition-colors underline">
            תנאי שימוש
          </Link>
        </div>
      </div>
    </div>
  );
}
