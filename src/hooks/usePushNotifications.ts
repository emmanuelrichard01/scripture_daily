import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** Converts a base64url VAPID key into the `Uint8Array` the Push API expects. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Base64-encodes a subscription key without blowing the call stack. */
function encodeKey(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

/**
 * Whether an existing subscription was created with `expected`.
 *
 * `options.applicationServerKey` is only populated in browsers that implement
 * `PushSubscriptionOptions`; where it is absent we assume a match rather than
 * unsubscribing on every call, since a needless resubscribe is worse than a
 * missed rotation on a browser that cannot tell us either way.
 */
function hasMatchingKey(subscription: PushSubscription, expected: Uint8Array): boolean {
  const stored = subscription.options?.applicationServerKey;
  if (!stored) return true;

  const storedBytes = new Uint8Array(stored as ArrayBuffer);
  if (storedBytes.length !== expected.length) return false;
  return storedBytes.every((byte, index) => byte === expected[index]);
}

type PermissionResult = { ok: true } | { ok: false; error: string };

/**
 * Web Push subscription management.
 *
 * Permission is read live from the browser rather than mirrored into synced
 * settings — it is per-device and per-origin, so syncing "granted" from a phone
 * to a desktop would have shown reminders as enabled on a device that had never
 * been asked.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return;

    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    let existing = await registration.pushManager.getSubscription();

    /*
     * A subscription is cryptographically bound to the VAPID key it was created
     * with. After the server's keypair is rotated, the browser still hands back
     * the *old* subscription — reusing it would store an endpoint the new
     * private key can never sign for, and every push would silently fail.
     *
     * So compare the stored key against the current one and, on a mismatch,
     * tear the old subscription down before making a new one.
     */
    if (existing && !hasMatchingKey(existing, applicationServerKey)) {
      // Drop the dead row too, or the cron keeps trying an endpoint we can no
      // longer authenticate against until it happens to 410.
      await supabase.from("push_subscriptions").delete().eq("endpoint", existing.endpoint);
      await existing.unsubscribe();
      existing = null;
    }

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }));

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: encodeKey(subscription.getKey("p256dh")),
        auth: encodeKey(subscription.getKey("auth")),
        // Lets the reminder cron fire at the right local hour for this device.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      { onConflict: "endpoint" },
    );
  }, [user]);

  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    if (!isSupported) {
      return { ok: false, error: "This browser doesn't support notifications." };
    }
    if (!VAPID_PUBLIC_KEY) {
      return { ok: false, error: "Push notifications aren't configured for this app." };
    }
    if (!user) {
      return { ok: false, error: "Sign in to receive reminders on this device." };
    }

    setIsBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        return {
          ok: false,
          error:
            result === "denied"
              ? "Notifications are blocked. Enable them for this site in your browser settings."
              : "Notification permission wasn't granted.",
        };
      }

      await subscribe();
      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't enable notifications. Please try again." };
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, user, subscribe]);

  return { isSupported, permission, isBusy, requestPermission };
}
