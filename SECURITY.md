# Security & Privacy Notes — PartyDrop

## Current Security Model (MVP)

### Authentication
- **Event Owners**: Authenticated via `admin_token` (32-char hex, generated at event creation)
- **Guests**: No authentication. Identified by `guest_id` in localStorage (client-side only)
- **No Supabase Auth** used in MVP — guest-based, no accounts needed

### What is protected
✅ Admin token validated on every sensitive operation  
✅ Service role key never exposed to client  
✅ admin_token never returned in public event queries  
✅ Pending/rejected media not exposed in public gallery  
✅ Private events hide gallery from guests  
✅ File type and size validated server-side  
✅ Supabase RLS as defence-in-depth layer  

### What is NOT fully secure (MVP trade-offs)
⚠️ Guest ID is stored in localStorage — can be spoofed  
⚠️ Likes and reports are based on guest_id honour system  
⚠️ No rate limiting on uploads (could be abused)  
⚠️ Admin token in URL can be shared accidentally  
⚠️ No CAPTCHA on guest creation  

## Privacy

### Data stored
- Event metadata (name, date, description)
- Guest nickname + emoji (no real identity)
- Photos and videos (stored in Supabase Storage)
- Likes (media_id + guest_id)
- Reports (media_id + guest_id + reason)

### Data retention
- No automatic deletion of data after event ends
- TODO: Add event expiry and auto-cleanup after X days
- Event owner should use admin panel to close/clean up

### Media access
- For `open` and `approval` events: media URLs are publicly accessible if you have the URL
- For `private` events: the gallery is hidden but files are still in public storage
- TODO: For true privacy, serve media through signed URLs with expiry

## Recommendations before handling large events

1. Add rate limiting (e.g. max 50 uploads per guest)
2. Enable Supabase's built-in abuse protection
3. Consider adding CAPTCHA to guest creation
4. Use a CDN with access logging
5. Set up alerts for unusual upload activity
6. Review Supabase RLS policies before launch
7. Consider replacing admin_token with proper Supabase Auth
