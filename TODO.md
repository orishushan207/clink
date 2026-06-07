# TODO — PartyDrop Future Development

## 🔴 Critical / Bugs to fix before first production event

- [ ] Add rate limiting on API routes (prevent spam uploads)
- [ ] Validate guest_id ownership on like/report API routes
- [ ] Add CORS headers to API routes for production
- [ ] Handle Vercel function timeout for large video uploads (use presigned URL instead)
- [ ] Add file size validation on server side (not just client)
- [ ] Test RTL on iOS Safari (known quirks)

---

## 🟡 MVP Improvements (before scaling)

- [ ] Replace polling with Supabase Realtime subscriptions (`supabase.channel()`)
- [ ] Add proper loading skeletons instead of full-page spinners
- [ ] Image optimization: auto-resize large images before upload (use browser canvas)
- [ ] Video thumbnail generation (ffmpeg on edge or pre-signed upload with lambda)
- [ ] Better error boundary components
- [ ] Admin: download all media as ZIP (use JSZip + Blob)
- [ ] Guest can view their own uploads even in private mode
- [ ] Pagination / infinite scroll for large galleries (currently loads all)

---

## 🟢 Feature Roadmap

### Payments
- [ ] Stripe integration for event pricing
- [ ] Monthly subscription plans for bars/clubs
- [ ] Per-event pricing tiers (free/basic/pro)
- [ ] Usage limits per plan

### Media Features
- [ ] Auto-generate highlight video from best photos (ffmpeg + AI)
- [ ] Instagram Stories export button per photo
- [ ] Branded photo frames with event logo/name
- [ ] Photo challenges for guests ("take a selfie with the host")
- [ ] Download all as digital album (PDF or Google Photos link)

### Social & Gamification
- [ ] Advanced leaderboard with badges and achievements
- [ ] Guest missions ("first to upload a group photo gets 5 bonus points")
- [ ] Comment system on photos
- [ ] Private messages between guests
- [ ] Guest-to-guest photo reactions (beyond like)

### Admin Features
- [ ] Full ZIP download of all event media
- [ ] Analytics dashboard (upload timeline, popular media, guest activity)
- [ ] Custom event themes (colors, fonts, branding)
- [ ] Scheduled auto-close uploads
- [ ] Bulk approve/reject media
- [ ] Export guest list (CSV)

### Authentication
- [ ] Replace admin_token with proper Supabase Auth for event owners
- [ ] Google/Apple login for event owners
- [ ] Guest account creation (optional, for returning users)
- [ ] Business accounts (multiple events, team management)

### AI Features
- [ ] AI content moderation (NSFW detection before publish)
- [ ] Auto-tagging and categorization
- [ ] Smart album curation (pick best shots)
- [ ] Face grouping (show all photos with guest X)

### Technical
- [ ] Implement Supabase Realtime for live updates
- [ ] Add Redis caching for leaderboard (avoid recomputing on every request)
- [ ] CDN optimization for media delivery
- [ ] Progressive Web App (PWA) manifest for "Add to Home Screen"
- [ ] Offline support for slow event venues
- [ ] Multi-language support (English, Russian, Arabic)

### Invite System
- [ ] Pre-event invitation page with RSVP
- [ ] Send QR codes via WhatsApp/SMS/Email
- [ ] Guest list management before event
- [ ] Personalized welcome message per guest

---

## 💅 Design Improvements

- [ ] Dark/Light mode toggle
- [ ] Custom event themes (wedding white, birthday colorful, club dark)
- [ ] Confetti animation on upload
- [ ] Better mobile swipe gestures in gallery
- [ ] Haptic feedback on like (mobile)
- [ ] Better onboarding flow for first-time event owners
