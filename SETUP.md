# הגדרת PartyDrop — מדריך מלא

## שלב 1: התקנת תלויות

```bash
cd partydrop
npm install
```

---

## שלב 2: הגדרת Supabase

### 2.1 יצירת פרויקט Supabase

1. גש ל-[app.supabase.com](https://app.supabase.com)
2. לחץ **New Project**
3. מלא שם, סיסמת DB, ובחר Region (מומלץ: `eu-central-1` לישראל)
4. המתן לסיום הבנייה (~2 דקות)

### 2.2 יצירת הטבלאות

1. לך ל-**SQL Editor** בדאשבורד
2. לחץ **New Query**
3. העתק את כל התוכן מ-`supabase/schema.sql`
4. לחץ **Run**

### 2.3 הגדרת Storage Buckets

עיין בקובץ `supabase/storage-setup.md` להוראות מלאות.

בקצרה:
1. לך ל-**Storage** בדאשבורד
2. צור bucket בשם `event-media` (Public: ✅)
3. צור bucket בשם `event-covers` (Public: ✅)
4. הוסף את ה-policies מהקובץ

---

## שלב 3: משתני סביבה

```bash
cp .env.example .env.local
```

מלא את הקובץ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**איפה למצוא את המפתחות:**
- לך ל-Supabase Dashboard → Settings → API
- `URL` = Project URL
- `anon public` = NEXT_PUBLIC_SUPABASE_ANON_KEY
- `service_role secret` = SUPABASE_SERVICE_ROLE_KEY ⚠️ שמור בסוד!

---

## שלב 4: הפעלה מקומית

```bash
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000)

---

## שלב 5: Deploy ל-Vercel

### 5.1 Connect Repository

1. Push את הקוד ל-GitHub
2. לך ל-[vercel.com](https://vercel.com)
3. **Import Project** מ-GitHub
4. Vercel יזהה Next.js אוטומטית

### 5.2 הגדרת Environment Variables ב-Vercel

בדאשבורד Vercel → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` ⚠️ |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |

### 5.3 Deploy

לחץ **Deploy**. Vercel יבנה ויפרסם.

### 5.4 עדכון כתובת ב-Supabase

בסוואפייס Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-domain.vercel.app`

---

## בדיקה ראשונה

1. פתח `https://your-domain.vercel.app`
2. לחץ "צור אירוע חדש"
3. מלא שם אירוע, לחץ "צור אירוע"
4. סרוק את ה-QR Code עם הטלפון
5. הזן כינוי ואמוג'י
6. העלה תמונה מהגלריה
7. ודא שהתמונה מופיעה בגלריה

---

## פתרון בעיות נפוצות

### "Missing Supabase env vars"
→ ודא שה-.env.local מלא ושרץ `npm run dev` מחדש

### "שגיאת העלאה"
→ ודא שה-Storage Buckets קיימים ויש להם policies מתאימים

### "אירוע לא נמצא"
→ ודא שהרצת את כל ה-SQL מ-schema.sql

### תמונות לא נטענות
→ ודא שה-Supabase URL מוגדר ב-next.config.ts תחת `images.remotePatterns`
