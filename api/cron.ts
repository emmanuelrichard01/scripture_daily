/**
 * Daily reminder dispatch, invoked by Vercel Cron once an hour.
 *
 * The previous version sent to *every* user with reminders enabled on every
 * run, ignoring both their chosen time and their timezone — its own comment
 * conceded this. Someone in Sydney who asked for 07:00 got pushed at whatever
 * hour the cron happened to fire.
 *
 * This runs hourly and, for each subscription, resolves the device's local
 * clock and sends only when the local hour matches the user's requested hour
 * and the local weekday is one they selected.
 */

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return json({ error: "CRON_SECRET is not configured" }, 500);

  // Vercel Cron sends this header; without the check anyone could trigger a
  // fan-out of push notifications to the entire user base.
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase service credentials are not configured" }, 500);
  }
  if (!vapidPublic || !vapidPrivate) {
    return json({ error: "VAPID keys are not configured" }, 500);
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
    if (!settings?.length) return json({ sent: 0, reason: "no reminders enabled" });

    const settingsByUser = new Map<string, UserSettings>(
      (settings as UserSettings[]).map((row) => [row.user_id, row]),
    );

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, timezone")
      .in("user_id", [...settingsByUser.keys()]);

    if (subscriptionError) throw new Error(subscriptionError.message);
    if (!subscriptions?.length) return json({ sent: 0, reason: "no subscriptions" });

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

    if (due.length === 0) return json({ sent: 0, reason: "nothing due this hour" });

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

    return json({
      due: due.length,
      sent: due.length - failed - expiredIds.length,
      pruned: expiredIds.length,
      failed,
    });
  } catch (error) {
    console.error("Reminder cron failed:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
}
