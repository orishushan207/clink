import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export async function sendPushToSubscription(
  subscription: webpush.PushSubscription,
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    // 410 = subscription expired/invalid, caller should delete it
    if (e?.statusCode === 410) throw Object.assign(new Error("expired"), { expired: true });
    throw err;
  }
}
