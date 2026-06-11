import Link from "next/link";
import {
  ArrowLeft, Camera, QrCode, Zap, Shield,
  Trophy, Users, Download, Check, Tv2, Film, Heart, Grid3x3,
} from "lucide-react";
import AppDemo from "@/components/AppDemo";
import PicMeLogo from "@/components/PicMeLogo";
import FAQSection from "@/components/FAQSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-wedding-bg overflow-x-hidden" dir="rtl">

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        {/* Gradient overlay — keeps text readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-wedding-bg pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10 gap-2">
            <PicMeLogo size={80} textSize="text-3xl" />
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-3">
              {["גלריה שיתופית", "Live Wall", "Clink פסיפס", "צ׳אט", "ארכיון לנצח"].map((item, i, arr) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold tracking-wide">{item}</span>
                  {i < arr.length - 1 && <span className="text-white/40 text-xs">·</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <div className="text-right order-2 md:order-1">
              {/* Social proof */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {["🧑‍🦱","👩","🧔","👩‍🦳","🙋"].map((e, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-wedding-accent to-amber-500 border-2 border-wedding-bg flex items-center justify-center text-sm">
                      {e}
                    </div>
                  ))}
                </div>
                <p className="text-white/80 text-sm">
                  אלפי רגעים כבר נשמרו דרך Clink
                </p>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">
                <span className="gradient-text">האירוע שלכם —</span>
                <br />
                <span className="text-white">מכל הזוויות,</span>
                <br />
                <span className="text-white">חי ובלתי נשכח 🥂</span>
              </h1>

              <p className="text-white/90 text-base leading-relaxed mb-6 font-medium">
                Clink מחברת בין כל האורחים (כן, גם אלה שלא מכירים אחד את השני) והופכת כל אירוע לחוויה משותפת שנשמרת לנצח.
              </p>

              {/* Value props */}
              <div className="space-y-2 mb-8">
                {[
                  "כל אורח מצלם — אתם מקבלים את כל הרגעים",
                  "Live Wall — גלריה חיה שכולם רואים ביחד בזמן אמת",
                  "Clink פסיפס — כל התמונות שלכם יוצרות יצירת אמנות אחת",
                  "צ׳אט קבוצתי ופרטי בין כל האורחים",
                  "התראות על לייק, תגובה והודעה — ברגע",
                  "זיכרון אחד משותף לכל המוזמנים",
                ].map((q) => (
                  <div key={q} className="grid items-center gap-2" style={{ gridTemplateColumns: "auto 1fr" }}>
                    <div className="w-5 h-5 rounded-full bg-wedding-accent/20 border border-wedding-accent/50 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-white/80 text-sm font-medium">{q}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/checkout"
                  className="group flex items-center justify-center gap-3 btn-gold text-white font-bold text-base px-7 py-4 rounded-2xl shadow-lg shadow-party-gold/30 transition-all active:scale-95"
                >
                  צרו אירוע ✨
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/admin/login"
                  className="flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium text-base px-7 py-4 rounded-2xl transition-all"
                >
                  <Shield className="h-4 w-4" />
                  כניסה לאירוע קיים
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 mt-6">
                {["בלי אפליקציה", "בלי הרשמה", "עובד מכל מכשיר"].map(b => (
                  <span key={b} className="flex items-center gap-1.5 text-sm text-white/70">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    {b}
                  </span>
                ))}
              </div>

              {/* Social links */}
              <div className="flex items-center gap-3 mt-5">
                <span className="text-xs text-white/60">עקבו אחרינו:</span>
                <a
                  href="https://www.instagram.com/clink.il?igsh=MTVkd2RyeXVjMGdlbQ%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#833ab4]/30 via-[#fd1d1d]/30 to-[#fcb045]/30 border border-white/20 hover:border-white/40 transition-all"
                  title="Instagram"
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@clink.il?_r=1&_t=ZS-96QlrXmzhi6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/20 hover:border-white/40 transition-all"
                  title="TikTok"
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34l-.01-7.38a8.27 8.27 0 004.84 1.55V6.03a4.85 4.85 0 01-1.07-.34z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Right: phone demo */}
            <div className="flex justify-center order-1 md:order-2 pb-10">
              <AppDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROBLEM → SOLUTION ─── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-wedding-muted text-sm uppercase tracking-widest mb-3">כי כל אירוע ראוי לזיכרון אמיתי</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-wedding-ink">
            Clink הופכת את האורחים שלכם
            <span className="gradient-text"> לחלק מהסיפור</span>
          </h2>
          <p className="text-wedding-muted text-sm mt-3 max-w-lg mx-auto">לא עוד תמונות שמפוזרות על 50 טלפונים — אלא חוויה חיה שכולם חלק ממנה, מהרגע הראשון ועד הסוף</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Before */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <p className="text-red-500 text-xs font-semibold uppercase tracking-wider mb-3">בלי Clink</p>
            <ul className="space-y-2.5">
              {[
                "מחכים לצלם שישלח — לפעמים שבועות",
                "קבוצת וואטסאפ מבולגנת עם תמונות כפולות",
                "אורחים עם תמונות מדהימות שלא שיתפו כלום",
                "אין מצגת חיה — הרגעים עוברים בלי שכולם רואים",
                "אי אפשר להגיב ולעשות לייק על רגעים בזמן אמת",
                "אין דרך לדבר עם אורחים שלא מכירים",
                "ארכיון מפוזר בין 50 טלפונים שונים",
                "אין זיכרון משותף — כל אחד שומר לעצמו בנפרד",
              ].map(t => (
                <li key={t} className="flex items-start gap-2 text-sm text-wedding-muted">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
            <p className="text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-3">עם Clink</p>
            <ul className="space-y-2.5">
              {[
                "סריקה אחת — מיד בגלריה, בלי אפליקציה",
                "כל התמונות מכל האורחים במקום אחד",
                "לייקים ותגובות — כולם חיים את הרגעים יחד",
                "צ׳אט קבוצתי ופרטי בין כל האורחים",
                "התראות בזמן אמת על לייק, תגובה והודעה",
                "Live Wall — מצגת חיה שרצה על המסך באולם",
                "Clink פסיפס — כל תמונות האורחים מרכיבות תמונה אחת מרהיבה",
                "חזרתם הביתה? ממשיכים לשתף ולצ׳וטט עם כל האורחים",
                "גלריה שנשמרת לצמיתות, להורדה בכל עת",
              ].map(t => (
                <li key={t} className="flex items-start gap-2 text-sm text-wedding-muted">
                  <span className="text-emerald-600 mt-0.5 flex-shrink-0">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── MARKETING PILLARS ─── */}
      <section className="max-w-3xl mx-auto px-6 py-8">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              emoji: "🥂",
              title: "כל אירוע — חוויה ייחודית",
              desc: "Clink מתאימה לכל אירוע: חתונה, בר מצווה, מסיבה, יום הולדת. כל אחד מקבל גלריה ייחודית משלו שתחיה לנצח.",
              color: "from-wedding-accent/15 to-wedding-accent/5",
              border: "border-wedding-accent/20",
            },
            {
              emoji: "👥",
              title: "מחברת בין אנשים שלא מכירים",
              desc: "כשכולם מעלים, מלייקים, מגיבים ומשוחחים בצ׳אט — נוצרת תחושת קהילה רגעית. Clink הופכת זרים לחלק מאותו סיפור.",
              color: "from-wedding-accent/15 to-wedding-accent/5",
              border: "border-wedding-accent/20",
            },
            {
              emoji: "✨",
              title: "זיכרון שנשמר לנצח",
              desc: "גם אחרי שחזרתם הביתה — הגלריה פתוחה, הצ׳אט פעיל ואפשר להמשיך לשתף. כל תמונה וכל רגע שמורים ומסודרים, מוכנים להורדה בכל עת.",
              color: "from-wedding-accent/15 to-wedding-accent/5",
              border: "border-wedding-accent/20",
            },
          ].map(({ emoji, title, desc, color, border }) => (
            <div key={title} className={`bg-gradient-to-b ${color} border ${border} rounded-2xl p-5`}>
              <span className="text-3xl block mb-3">{emoji}</span>
              <h3 className="font-bold text-wedding-ink text-sm mb-2 leading-snug">{title}</h3>
              <p className="text-wedding-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-wedding-ink text-center mb-2">איך זה עובד?</h2>
        <p className="text-wedding-muted text-center text-sm mb-10">פשוט כמו לסרוק ברקוד</p>

        <div className="space-y-3">
          {[
            { step: "01", emoji: "✨", title: "יוצרים אירוע", desc: "מזינים שם, תאריך, מגדירים סיסמה — מקבלים QR code ייחודי תוך שניות" },
            { step: "02", emoji: "📱", title: "שולחים לאורחים", desc: "מדפיסים QR, מציגים על מסך, או שולחים קישור בוואטסאפ" },
            { step: "03", emoji: "🎉", title: "האורחים מצטרפים", desc: "סורקים ← בוחרים כינוי ← מצלמים ומעלים. ללא הורדה. ללא הרשמה." },
            { step: "04", emoji: "🔥", title: "כולם רואים הכל — בזמן אמת", desc: "כל תמונה או סרטון שתעלו יופיעו לכולם. בסוף האירוע — ארכיון מושלם" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 p-4 wedding-card rounded-2xl">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-wedding-accent/20 to-amber-500/20 border border-wedding-accent/20 flex items-center justify-center">
                <span className="text-xs font-bold text-wedding-accent-dark">{item.step}</span>
              </div>
              <div>
                <h3 className="font-bold text-wedding-ink text-sm flex items-center gap-2">{item.emoji} {item.title}</h3>
                <p className="text-wedding-muted text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="max-w-2xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-wedding-ink text-center mb-8">מה מקבלים?</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: QrCode,   color: "text-wedding-accent-dark", bg: "bg-wedding-accent/10", title: "QR Code ייחודי",      desc: "כל אירוע מקבל QR משלו" },
            { icon: Camera,   color: "text-amber-600",   bg: "bg-amber-500/10",   title: "העלאה קלה",          desc: "תמונות וסרטונים ישירות מהמצלמה" },
            { icon: Zap,      color: "text-amber-600",  bg: "bg-amber-500/10",  title: "זמן אמת",            desc: "כל תמונה וסרטון מופיעים מיד לכולם" },
            { icon: Tv2,      color: "text-cyan-600",   bg: "bg-cyan-500/10",   title: "Live Wall",          desc: "מצגת חיה — כל תמונה וסרטון מוקרנים לכולם בזמן אמת" },
            { icon: Film,     color: "text-wedding-accent-dark", bg: "bg-wedding-accent-light/10", title: "יצירת קליפ",         desc: "קליפ מהאירוע מכל התמונות והסרטונים שעלו" },
            { icon: Heart,    color: "text-rose-500",   bg: "bg-rose-500/10",   title: "לייקים ותגובות",     desc: "האורחים מגיבים ומלייקים — כולם מרגישים חלק" },
            { icon: Grid3x3,  color: "text-purple-500", bg: "bg-purple-500/10", title: "Clink פסיפס",       desc: "כל תמונות האורחים מרכיבות יחד תמונה אחת מרהיבה" },
            { icon: Trophy,   color: "text-emerald-600",bg: "bg-emerald-500/10",title: "לוח מובילים",        desc: "מי צילם הכי הרבה? מי קיבל הכי הרבה לייקים?" },
            { icon: Download, color: "text-blue-500",   bg: "bg-blue-500/10",   title: "הורדת ZIP",          desc: "כל המדיה בקובץ אחד מסודר" },
            { icon: Users,    color: "text-orange-500", bg: "bg-orange-500/10", title: "לכל אירוע",          desc: "חתונות, מסיבות, בר/בת מצווה ועוד" },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="p-3 wedding-card rounded-2xl hover:border-wedding-accent/30 transition-all flex flex-col h-44">
              <div className={`${bg} ${color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-wedding-ink text-sm mb-1">{title}</h3>
              <p className="text-wedding-muted text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MOSAIC SPOTLIGHT ─── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-200/30 via-wedding-card to-wedding-bg p-8 sm:p-10">
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-wedding-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid sm:grid-cols-2 gap-8 items-center" dir="rtl">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-400/30 rounded-full px-3 py-1 mb-4">
                <Grid3x3 className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-purple-600 text-sm font-bold">Clink פסיפס</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-wedding-ink leading-tight mb-3">
                <span className="text-purple-600">יצירת אמנות</span> מהאירוע שלכם
              </h2>
              <p className="text-wedding-ink/80 text-sm leading-relaxed mb-4">
                בסוף האירוע, את כל התמונות שהאורחים העלו — Clink הופכת ליצירת אמנות אחת גדולה: פורטרט שלכם, תמונה משפחתית, זוג, או כל תמונה שתבחרו.
              </p>
              <p className="text-wedding-muted text-sm leading-relaxed mb-5">
                כל סלפי, כל תמונה מהרחבה, מהשולחנות, מהחברים ומהרגעים הכי מצחיקים — הכול הופך לחלק מהתמונה הגדולה.
              </p>
              <ul className="space-y-2 mb-5">
                {[
                  "קובץ מוכן להדפסה, לתלייה ולשמירה",
                  "כל אורח לוקח חלק",
                  "לא עוד אלבום רגיל",
                ].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-wedding-ink/80">
                    <Check className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="text-purple-600 text-sm font-semibold leading-snug">
                מזכרת אחת שמורכבת מכל האנשים שעשו לכם את האירוע. ✨
              </p>
            </div>

            {/* Visual mockup */}
            <div className="flex justify-center">
              <div className="relative w-52 h-52 sm:w-64 sm:h-64">
                {/* Mosaic grid illustration */}
                <div className="w-full h-full rounded-2xl overflow-hidden border border-purple-400/30 shadow-2xl shadow-purple-500/10">
                  <div className="grid grid-cols-6 grid-rows-6 w-full h-full gap-px bg-purple-200/40">
                    {Array.from({ length: 36 }).map((_, i) => {
                      const emojis = ["📸","🥂","🎉","💍","✨","🎊","💃","🕺","🎶","👨‍👩‍👧","🌹","🎂"];
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-center text-xs"
                          style={{
                            background: `hsl(${(i * 47) % 360}, 55%, ${85 - (i % 3) * 5}%)`,
                          }}
                        >
                          {i % 4 === 0 ? emojis[i % emojis.length] : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Overlay label */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-purple-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap border border-purple-300/30">
                  🎨 פסיפס מ-200 תמונות אורחים
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE WALL SPOTLIGHT ─── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-wedding-accent/30 bg-gradient-to-br from-wedding-accent-light/20 via-wedding-card to-wedding-bg p-8 sm:p-10">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-wedding-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid sm:grid-cols-2 gap-8 items-center" dir="rtl">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-400/30 rounded-full px-3 py-1 mb-4">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 text-sm font-bold">Live Wall 🔴</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-wedding-ink leading-tight mb-3">
                הרגע הכי כיף?<br />
                <span className="gradient-text">לראות את עצמך</span> על המסך באולם 😍
              </h2>
              <p className="text-wedding-ink/80 text-sm leading-relaxed mb-4">
                כל תמונה שהאורחים מעלים יכולה להופיע תוך שניות על הסקרין הגדול. שם האורח, התיאור והתמונה — הכול עולה בלייב ונותן לאנשים תחושה שהם חלק מהאירוע, לא רק צופים מהצד.
              </p>
              <p className="text-wedding-muted text-sm leading-relaxed mb-5">
                זה מצחיק, זה מרגש, וכולם רוצים לקחת חלק.
              </p>
              <p className="text-wedding-accent-dark text-sm font-semibold leading-snug">
                מסך אחד. מלא רגעים. אנרגיה של אירוע חי. 🔥
              </p>
            </div>

            {/* Visual mockup */}
            <div className="flex justify-center">
              <div className="relative w-52 h-52 sm:w-64 sm:h-60 rounded-2xl overflow-hidden border border-wedding-accent/30 shadow-2xl shadow-wedding-accent/20 bg-[#3a2a22] flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-sm font-bold">Live Wall 🔴</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 px-3">
                  {["🥂","📸","💃","🎉","💍","🕺"].map((e, i) => (
                    <div key={i} className="w-12 h-12 rounded-lg bg-white/10 border border-wedding-accent/20 flex items-center justify-center text-xl">
                      {e}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-wedding-accent-light font-semibold animate-pulse">+תמונה חדשה 🔥</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-12">
        <div className="text-center mb-8 px-6">
          <h2 className="text-2xl font-bold text-wedding-ink mb-2">מה אומרים עלינו?</h2>
          <p className="text-wedding-muted text-sm">אנשים שכבר חוו את Clink באירועים שלהם</p>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {[
            {
              name: "נועה ואלון",
              role: "חתונה · 14.3.2026",
              avatar: "👩‍❤️‍👨",
              stars: 5,
              text: "היה לנו חשש שהאורחים לא ישתמשו בזה, אבל תוך 10 דקות היו כבר 80 תמונות. המצגת של התמונות שנוספו בלייב על המסך בזמן האוכל הייתה בין הדברים המצחיקים בחתונה. האורחים עפו על זה.",
            },
            {
              name: "תמר",
              role: "בת מצווה · 15.12.2025",
              avatar: "🎉",
              stars: 5,
              text: "ייחודי ברמות!! רוב האורחים כולל הסבתות, הצליחו לסרוק ולהעלות תמונות. בסוף האירוע קיבלנו ארכיון מלא מ-120 איש. לא האמנו שאנשים ישתפו פעולה ברמה כזאת.",
            },
            {
              name: "רועי ומיכל",
              role: "חתונה · 25.11.2025",
              avatar: "🥂",
              stars: 5,
              text: "הכי אהבנו שאנשים שלא מכירים אחד את השני התחילו לתייג ולהגיב על תמונות. זה יצר חיבור ושיח בין אורחים שלא הכירו לפני ויש מצב שנוצרו איזה זוג או שניים 😉😅",
            },
            {
              name: "דני",
              role: "מסיבת יום הולדת · 2.1.2026",
              avatar: "🎂",
              stars: 5,
              text: "השתמשנו ב-Clink ביום הולדת ה-40 שלי. תוך שעה היו מעל 200 תמונות מכל הכיוונים — אנשים שלא ראיתי שנים שלחו תמונות ישנות שלנו מהעבר ביחד עם חדשות. היה מטורף.",
            },
            {
              name: "שירה ויובל",
              role: "חתונה · 8.2.2026",
              avatar: "💍",
              stars: 5,
              text: "הצלם שלנו אמר שזאת הייתה הפעם הראשונה שהוא רואה אורחים מצלמים בתדירות כזאת. כולם רצו להיות בגלריה. הצ׳אט בין האורחים יצר אווירה מטורפת — אנשים שלא הכירו תוך זמן קצר כבר דיברו אחד עם השני.",
            },
            {
              name: "אבי",
              role: "בר מצווה · 20.3.2026",
              avatar: "✡️",
              stars: 5,
              text: "קיבלנו 340 תמונות מ-90 אורחים. הילד שלנו ישב ועבר על כל תמונה עם חיוך ענק. ההתראות בזמן אמת על לייקים ותגובות גרמו לכולם להמשיך לגלוש ולשתף כל הלילה.",
            },
            {
              name: "אופיר",
              role: "מסיבת סיום לימודים · 11.4.2026",
              avatar: "🎓",
              stars: 5,
              text: "השתמשנו ב-Clink לסיום התואר. היה כיף לראות תמונות מכל הכיתה בגלריה אחת. ה-Live Wall על המסך הגדול עשה את האווירה. הורדנו את כל הזיכרונות בZIP אחד בסוף.",
            },
          ].map(({ name, role, avatar, stars, text }) => (
            <div key={name} className="wedding-card rounded-2xl p-5 flex flex-col gap-3 flex-shrink-0 w-72 snap-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wedding-accent/30 to-amber-500/30 border border-wedding-accent/20 flex items-center justify-center text-xl flex-shrink-0">
                  {avatar}
                </div>
                <div>
                  <p className="text-wedding-ink text-sm font-semibold">{name}</p>
                  <p className="text-wedding-muted text-xs">{role}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: stars }).map((_, i) => (
                  <span key={i} className="text-wedding-accent text-sm">★</span>
                ))}
              </div>
              <p className="text-wedding-muted text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <FAQSection />

      {/* ─── BOTTOM CTA ─── */}
      <section className="max-w-xl mx-auto px-6 py-10 pb-20 text-center">
        <div className="wedding-card border border-wedding-accent/20 rounded-3xl p-8">
          <div className="text-4xl mb-4">🥂✨</div>
          <h2 className="text-2xl font-bold text-wedding-ink mb-2">
            תנו לאירוע שלכם להיות בלתי נשכח
          </h2>
          <p className="text-wedding-muted text-sm leading-relaxed mb-6">
            Clink מוכנה תוך דקה. QR code ייחודי לאירוע שלכם.
            <br />כל האורחים מחוברים — כל הרגעים שמורים — כל הזיכרון שלכם.
          </p>
          <Link
            href="/checkout"
            className="inline-flex items-center gap-3 btn-gold text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg shadow-party-gold/30 transition-all active:scale-95"
          >
            צרו אירוע
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-wedding-muted text-xs mt-4">תשלום חד פעמי · ללא מנוי · מוכן בשניות</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-wedding-border py-8 px-6 text-center text-wedding-muted text-sm">
        <div className="flex justify-center mb-3">
          <PicMeLogo size={28} textSize="text-base" />
        </div>

        {/* Contact */}
        <div className="mb-5">
          <p className="text-wedding-muted text-sm mb-3">לפרטים נוספים — צרו קשר</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="https://wa.me/972544378794"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/whatsapp-icon.svg" alt="WhatsApp" className="w-7 h-7" />
            </a>
            <a
              href="mailto:clink.support@gmail.com"
              className="inline-flex items-center justify-center w-12 h-12 bg-wedding-accent/10 hover:bg-wedding-accent/20 border border-wedding-accent/30 rounded-xl transition-all"
              title="clink.support@gmail.com"
            >
              <span className="text-2xl leading-none">✉️</span>
            </a>
            <a
              href="https://www.instagram.com/clink.il?igsh=MTVkd2RyeXVjMGdlbQ%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#833ab4]/15 via-[#fd1d1d]/15 to-[#fcb045]/15 border border-wedding-border hover:border-wedding-accent/40 rounded-xl transition-all"
              title="Instagram"
            >
              <svg className="w-6 h-6 text-wedding-ink" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@clink.il?_r=1&_t=ZS-96QlrXmzhi6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-12 h-12 bg-black/5 border border-wedding-border hover:border-wedding-accent/40 rounded-xl transition-all"
              title="TikTok"
            >
              <svg className="w-6 h-6 text-wedding-ink" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34l-.01-7.38a8.27 8.27 0 004.84 1.55V6.03a4.85 4.85 0 01-1.07-.34z"/>
              </svg>
            </a>
          </div>
        </div>

        <p>© 2025 Clink — גלריה חיה לאירועים</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link href="/terms" className="text-wedding-muted hover:text-wedding-ink transition-colors text-xs">תנאי שימוש</Link>
          <span className="text-wedding-muted/60">·</span>
          <Link href="/privacy" className="text-wedding-muted hover:text-wedding-ink transition-colors text-xs">מדיניות פרטיות</Link>
        </div>
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 mt-3 text-wedding-muted hover:text-wedding-ink transition-colors text-xs"
        >
          <Shield className="h-3 w-3" />
          כניסה לאירוע קיים
        </Link>
      </footer>
    </div>
  );
}
