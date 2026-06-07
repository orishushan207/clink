# הגדרת Supabase Storage

## צור שני Buckets

### 1. `event-media` — לתמונות וסרטונים של אורחים

בסוואפייס Dashboard:
Storage → New Bucket → שם: `event-media` → Public: ✅

**Policies:**

```sql
-- אפשר לכולם לקרוא קבצים (URLs ציבוריים)
CREATE POLICY "event_media_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-media');

-- אפשר לכולם להעלות (אורחים ללא auth)
-- TODO: הגבל לפי event_id path עם JWT בגרסה עתידית
CREATE POLICY "event_media_insert_public"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-media');

-- רק service_role יכול למחוק
CREATE POLICY "event_media_delete_service"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-media'
    AND auth.role() = 'service_role'
  );
```

### 2. `event-covers` — לתמונות כיסוי של אירועים

```sql
-- Public read
CREATE POLICY "event_covers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-covers');

-- אפשר לכולם להעלות תמונת כיסוי
CREATE POLICY "event_covers_insert_public"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-covers');
```

## הגדרת מגבלות גודל

בסוואפייס Dashboard → Storage → Bucket Settings:
- `event-media`: Max upload size = 100MB (לוידאו)
- `event-covers`: Max upload size = 10MB

## הפעלת RLS על Storage

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```
