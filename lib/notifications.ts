import { supabaseAdmin } from "@/lib/supabase/server";

export type NotificationType = "like" | "message" | "upload" | "comment";

interface CreateNotifParams {
  eventId: string;
  recipientId: string | null; // null = admin-only broadcast
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  content: string;
  mediaId?: string;
}

export async function createNotification(p: CreateNotifParams) {
  // Don't notify yourself
  if (p.recipientId === p.actorId) return;

  await supabaseAdmin.from("notifications").insert({
    event_id: p.eventId,
    recipient_id: p.recipientId,
    type: p.type,
    actor_id: p.actorId,
    actor_name: p.actorName,
    actor_avatar: p.actorAvatar ?? null,
    content: p.content,
    media_id: p.mediaId ?? null,
  });
}

// Notify all admin-subscribed guests (notify_admin_all) + the specific recipient
export async function createNotificationForOwnerAndAdmins(
  p: CreateNotifParams & { adminEventId: string }
) {
  const inserts: object[] = [];

  // For the direct recipient
  if (p.recipientId && p.recipientId !== p.actorId) {
    inserts.push({
      event_id: p.eventId,
      recipient_id: p.recipientId,
      type: p.type,
      actor_id: p.actorId,
      actor_name: p.actorName,
      actor_avatar: p.actorAvatar ?? null,
      content: p.content,
      media_id: p.mediaId ?? null,
    });
  }

  // Admin broadcast row (recipient_id = null means "for admin")
  inserts.push({
    event_id: p.eventId,
    recipient_id: null,
    type: p.type,
    actor_id: p.actorId,
    actor_name: p.actorName,
    actor_avatar: p.actorAvatar ?? null,
    content: p.content,
    media_id: p.mediaId ?? null,
  });

  if (inserts.length) {
    await supabaseAdmin.from("notifications").insert(inserts);
  }
}
