"use client";
import { useEffect, useState, useCallback } from "react";

export type PushPreferences = {
  messages: boolean;
  likes: boolean;
  adminAll: boolean;
};

export type PushUnsupportedReason =
  | "no_service_worker"   // browser doesn't support SW/Push
  | "http_non_localhost"  // served over HTTP (not localhost) — SW blocked
  | "ios_not_pwa"         // iOS Safari without PWA
  | null;                 // supported

function detectUnsupportedReason(): PushUnsupportedReason {
  if (typeof window === "undefined") return null;

  // Check HTTPS requirement (localhost is OK)
  const isSecure =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isSecure) return "http_non_localhost";

  // iOS Safari without PWA
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIOS && !isStandalone) return "ios_not_pwa";

  // No service worker / push support
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "no_service_worker";
  }

  return null;
}

export function usePushNotifications(guestId: string | undefined, eventId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState<PushUnsupportedReason>(null);

  useEffect(() => {
    setUnsupportedReason(detectUnsupportedReason());
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = useCallback(async (prefs: PushPreferences) => {
    if (!guestId || !eventId) return false;
    if (detectUnsupportedReason()) return false;

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, eventId, subscription: sub.toJSON(), preferences: prefs }),
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe error", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [guestId, eventId]);

  const unsubscribe = useCallback(async () => {
    if (!guestId || !eventId) return;
    setLoading(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
      }
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, eventId }),
      });
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [guestId, eventId]);

  return { permission, subscribed, loading, subscribe, unsubscribe, unsupportedReason };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}
