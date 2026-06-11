"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getEventBySlug } from "@/lib/events";
import { createGuest } from "@/lib/guests";
import { loadGuestSession, saveGuestSession } from "@/lib/guests";
import type { PublicEvent } from "@/types";
import GuestNameModal from "@/components/GuestNameModal";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatDate, getAdminSessionKey } from "@/lib/utils";
import { Calendar, Lock, AlertCircle, Shield, Images, Clock } from "lucide-react";
import { isEventLockedForGuests, timeUntilGuestLock, GUEST_LOCK_HOURS } from "@/lib/eventExpiry";

export default function EventEntryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const noRedirect = searchParams.get("noRedirect") === "1";

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [adminEventId, setAdminEventId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // Check for existing guest session → go straight to gallery (unless user explicitly left)
      const session = loadGuestSession(slug);
      if (session && !noRedirect) {
        router.replace(`/event/${slug}/gallery`);
        return;
      }

      // Load event
      try {
        const ev = await getEventBySlug(slug);
        if (!ev) {
          setNotFound(true);
        } else {
          setEvent(ev);

          // Check if this device has a valid admin token for the event
          const storedToken = localStorage.getItem(getAdminSessionKey(ev.id));
          if (storedToken) {
            const verifyRes = await fetch("/api/admin/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId: ev.id, token: storedToken }),
            });
            const { valid } = await verifyRes.json();
            if (valid) {
              if (!noRedirect) {
                router.replace(`/admin/event/${ev.id}`);
                return;
              }
              setAdminEventId(ev.id);
            } else {
              localStorage.removeItem(getAdminSessionKey(ev.id));
              setShowModal(true); // Invalid token → treat as regular guest
            }
          } else {
            setShowModal(true); // No admin token → regular guest flow
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [slug, router]);

  const handleGuestSubmit = async (nickname: string, avatar: string | null, pin?: string) => {
    if (!event) return;

    const deviceTokenKey = `partydrop_device_token`;
    let deviceToken = localStorage.getItem(deviceTokenKey);
    if (!deviceToken) {
      deviceToken =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      localStorage.setItem(deviceTokenKey, deviceToken);
    }

    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: event.id,
        nickname,
        avatar,
        device_token: deviceToken,
        pin,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      const e = new Error(err.error || "שגיאה בכניסה לאירוע") as Error & { code?: string };
      if (err.code) e.code = err.code;
      throw e;
    }

    const { guest, reconnected } = await res.json();

    saveGuestSession(slug, {
      guestId: guest.id,
      nickname: guest.nickname,
      avatar: guest.avatar,
      deviceToken,
    });

    router.push(`/event/${slug}/gallery${reconnected ? "?reconnected=1" : ""}`);
  };

  if (loading) return <FullPageSpinner />;

  if (notFound) {
    return (
      <div className="min-h-screen bg-wedding-bg flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-wedding-ink mb-2">אירוע לא נמצא</h1>
        <p className="text-wedding-muted">ייתכן שהקישור שגוי או שהאירוע הסתיים</p>
      </div>
    );
  }

  if (!event) return null;

  const locked = isEventLockedForGuests(event.created_at, event.guest_lock_hours ?? GUEST_LOCK_HOURS);
  const remaining = timeUntilGuestLock(event.created_at, event.guest_lock_hours ?? GUEST_LOCK_HOURS);

  // Non-admin trying to enter a locked event
  if (locked && !adminEventId) {
    return (
      <div className="min-h-screen bg-wedding-bg flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-wedding-ink">הגלריה נסגרה</h1>
        <p className="text-wedding-muted max-w-xs">
          הגישה לאורחים ניתנת רק במשך {GUEST_LOCK_HOURS} שעות מתחילת האירוע.
          אם אתה בעל האירוע, התחבר דרך פאנל הניהול.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-wedding-bg relative overflow-hidden">
        {event.cover_image_url && (
          <div className="absolute inset-0">
            <Image
              src={event.cover_image_url}
              alt="כיסוי"
              fill
              className="object-cover opacity-20 blur-2xl scale-110"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-wedding-bg/60 via-wedding-bg/85 to-wedding-bg" />
          </div>
        )}

        <div className="relative z-10 max-w-lg mx-auto px-6 py-16 flex flex-col items-center text-center min-h-screen justify-center">
          {/* Invitation card */}
          <div className="w-full wedding-card rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12 flex flex-col items-center animate-float-in">
            {event.cover_image_url && (
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-wedding-accent/40 shadow-2xl mb-6 ring-4 ring-wedding-accent/10">
                <Image
                  src={event.cover_image_url}
                  alt={event.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-wedding-accent/80 text-xs tracking-[0.3em] uppercase mb-2">
              ברוכים הבאים ל
            </p>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-wedding-ink mb-3 leading-tight">
              {event.name}
            </h1>

            {/* Decorative divider */}
            <div className="flex items-center gap-3 my-3 text-wedding-accent/60">
              <span className="h-px w-10 bg-wedding-accent/30" />
              <span className="text-lg">✦</span>
              <span className="h-px w-10 bg-wedding-accent/30" />
            </div>

            {event.event_date && (
              <div className="flex items-center gap-1.5 text-wedding-accent-dark/90 text-sm mb-3 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(event.event_date)}</span>
              </div>
            )}

            {event.description && (
              <p className="text-wedding-muted text-base leading-relaxed mb-2 max-w-sm italic">
                {event.description}
              </p>
            )}
          </div>

          <div className="w-full mt-6 flex flex-col items-center">

          {event.privacy_mode === "private" && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-amber-300 text-sm mb-6">
              <Lock className="h-4 w-4" />
              <span>האירוע במצב פרטי — תוכל להעלות תמונות</span>
            </div>
          )}

          {!event.uploads_open && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-red-300 text-sm mb-6">
              <AlertCircle className="h-4 w-4" />
              <span>העלאות לאירוע זה נסגרו</span>
            </div>
          )}

          {/* Expiry warning — shown when fewer than 6 hours remain */}
          {!locked && remaining && !adminEventId && (
            (() => {
              const hours = parseInt(remaining);
              if (!isNaN(hours) && hours <= 6) {
                return (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-amber-300 text-sm mb-6">
                    <Clock className="h-4 w-4" />
                    <span>הגלריה תיסגר בעוד {remaining}</span>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Admin quick-access buttons — only shown to verified admins */}
          {adminEventId && (
            <div className="w-full max-w-xs space-y-3 mb-6">
              <Link
                href={`/admin/event/${adminEventId}`}
                className="flex items-center justify-center gap-2 w-full btn-gold text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-party-gold/30 transition-all"
              >
                <Shield className="h-5 w-5" />
                פאנל ניהול
              </Link>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center gap-2 w-full border border-wedding-border hover:border-wedding-accent/40 text-wedding-muted hover:text-wedding-ink font-medium py-3 rounded-2xl transition-all"
              >
                <Images className="h-4 w-4" />
                כניסה לClink כאורח
              </button>
            </div>
          )}

          {!adminEventId && (
            <div className="text-wedding-muted text-sm animate-pulse">
              מכין את הכניסה...
            </div>
          )}
          </div>
        </div>
      </div>

      {event && (
        <GuestNameModal
          open={showModal}
          eventName={event.name}
          eventSlug={slug}
          onSubmit={handleGuestSubmit}
        />
      )}
    </>
  );
}
