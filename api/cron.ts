/**
 * Daily reminder dispatch, invoked hourly by `.github/workflows/reminders.yml`.
 *
 * The handler runs every hour and, for each subscription, resolves the device's
 * local clock and sends only when the local hour matches the user's requested
 * hour and the local weekday is one they selected. One schedule therefore
 * covers every timezone — someone in Sydney who asked for 07:00 gets pushed at
 * their 07:00, not at whatever hour the schedule happened to fire.
 *
 * ## Handler signature
 *
 * Vercel's **Node.js** runtime calls functions with `(req, res)` and ignores a
 * returned value. This file previously exported a Web-style
 * `(request: Request) => Response` handler, which is only the contract for the
 * *edge* runtime (see `bible.ts`). The function ran, built a `Response`,
 * returned it into the void and never wrote to `res` — so every request hung
 * until the gateway gave up. `curl` reported `(28) Operation timed out … 0
 * bytes received`, and reminders had never been delivered in production.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const config = { runtime: "nodejs" };

interface UserSettings {
  user_id: string;
  reminder_time: string;
  reminder_days: string[];
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
}

/** Local hour (0–23) and weekday (0=Sunday) in an IANA timezone, right now. */
function localClock(timeZone: string): { hour: number; weekday: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
      weekday: "short",
    }).formatToParts(new Date());
  } catch {
    // An unknown or malformed zone falls back to UTC rather than dropping the
    // reminder entirely.
    return localClock("UTC");
  }

  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "0";
  const weekdayPart = parts.find((part) => part.type === "weekday")?.value ?? "Sun";

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    // `hour12: false` can render midnight as "24" in some ICU versions.
    hour: Number(hourPart) % 24,
    weekday: Math.max(0, WEEKDAYS.indexOf(weekdayPart)),
  };
}

/** Writes a JSON body. Every exit from the handler goes through this. */
function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return send(response, 500, { error: "CRON_SECRET is not configured" });

  // Without this check anyone could trigger a fan-out of push notifications to
  // the entire user base.
  if (request.headers.authorization !== `Bearer ${cronSecret}`) {
    return send(response, 401, { error: "Unauthorized" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return send(response, 500, { error: "Supabase service credentials are not configured" });
  }
  if (!vapidPublic || !vapidPrivate) {
    return send(response, 500, { error: "VAPID keys are not configured" });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@scripturedaily.app",
    vapidPublic,
    vapidPrivate,
  );

  // Service role: the cron must read every user's settings, which RLS forbids
  // to the anon key. Never expose this key to the client.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, reminder_time, reminder_days")
      .eq("reminders_enabled", true);

    if (settingsError) throw new Error(settingsError.message);
    if (!settings?.length) {
      return send(response, 200, { sent: 0, reason: "no reminders enabled" });
    }

    const settingsByUser = new Map<string, UserSettings>(
      (settings as UserSettings[]).map((row) => [row.user_id, row]),
    );

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, timezone")
      .in("user_id", [...settingsByUser.keys()]);

    if (subscriptionError) throw new Error(subscriptionError.message);
    if (!subscriptions?.length) {
      return send(response, 200, { sent: 0, reason: "no subscriptions" });
    }

    // Only the subscriptions whose device-local time is the requested hour.
    const due = (subscriptions as PushSubscriptionRow[]).filter((subscription) => {
      const userSettings = settingsByUser.get(subscription.user_id);
      if (!userSettings) return false;

      const { hour, weekday } = localClock(subscription.timezone);
      const requestedHour = Number(userSettings.reminder_time.split(":")[0]);
      if (!Number.isInteger(requestedHour) || requestedHour !== hour) return false;

      const days = userSettings.reminder_days.map(Number);
      return days.includes(weekday);
    });

    if (due.length === 0) {
      return send(response, 200, { sent: 0, reason: "nothing due this hour" });
    }

    const payload = JSON.stringify({
      title: "Time to read",
      body: "Your ten chapters are waiting.",
      url: "/",
    });

    const expiredIds: string[] = [];

    const results = await Promise.allSettled(
      due.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 3600 },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // 404/410 mean the browser dropped the subscription — prune it so the
          // table does not accumulate dead endpoints forever.
          if (status === 404 || status === 410) {
            expiredIds.push(subscription.id);
            return;
          }
          throw error;
        }
      }),
    );

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    const failed = results.filter((result) => result.status === "rejected").length;

    return send(response, 200, {
      due: due.length,
      sent: due.length - failed - expiredIds.length,
      pruned: expiredIds.length,
      failed,
    });
  } catch (error) {
    console.error("Reminder cron failed:", error);
    return send(response, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
