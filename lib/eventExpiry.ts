// ============================================================
// Event lifecycle helpers
// ============================================================

/** Default window (in hours) during which guests can join, view and upload.
 *  7 days — can be overridden per-event via events.guest_lock_hours
 *  (derived from the purchased plan's days_access). */
export const GUEST_LOCK_HOURS = 168;

/** Events are automatically deleted after this many days.
 *  Kept comfortably longer than the upload window so the host still has
 *  time to download the gallery after guests are locked out. */
export const AUTO_DELETE_DAYS = 14;

/**
 * Returns true once the guest window has passed since event creation.
 * Admins (holding a valid admin_token) are exempt from this check.
 */
export function isEventLockedForGuests(createdAt: string, lockHours = GUEST_LOCK_HOURS): boolean {
  const lockMs = lockHours * 60 * 60 * 1000;
  return Date.now() > new Date(createdAt).getTime() + lockMs;
}

/**
 * Returns true when AUTO_DELETE_DAYS have passed.
 * Used by the cron cleanup job.
 */
export function isEventExpiredForAutoDelete(createdAt: string): boolean {
  const deleteMs = AUTO_DELETE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > new Date(createdAt).getTime() + deleteMs;
}

/**
 * Human-readable time remaining until guest lock (Hebrew).
 * Returns null if already locked.
 */
export function timeUntilGuestLock(createdAt: string, lockHours = GUEST_LOCK_HOURS): string | null {
  const lockTime = new Date(createdAt).getTime() + lockHours * 60 * 60 * 1000;
  const remaining = lockTime - Date.now();
  if (remaining <= 0) return null;
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60_000);
  if (days >= 1) return `${days} ימים`;
  if (hours >= 1) return `${hours} שעות`;
  return `${minutes} דקות`;
}
