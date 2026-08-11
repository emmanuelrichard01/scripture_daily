import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Serverless function running on Node.js

// Required VAPID setup for web-push
webpush.setVapidDetails(
  "mailto:support@scripturedaily.com",
  process.env.VITE_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export default async function handler(req: Request) {
  // Only allow GET requests for the cron job
  if (req.method !== 'GET') {
    return new Response("Method not allowed", { status: 405 });
  }

  // Authorize cron via Vercel secure header
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY as string;
  
  if (!supabaseUrl || !supabaseKey) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Get all users who have reminders enabled (user_settings)
    const { data: usersWithReminders, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, reminder_time")
      .eq("reminders_enabled", true);

    if (settingsError) throw settingsError;
    if (!usersWithReminders || usersWithReminders.length === 0) {
      return new Response("No users to notify", { status: 200 });
    }

    // A real implementation would check if current UTC time matches the user's local `reminder_time`
    // For simplicity in this demo, we'll just send to everyone who has reminders enabled.
    const userIds = usersWithReminders.map(u => u.user_id);

    // 2. Get push subscriptions for those users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response("No push subscriptions found", { status: 200 });
    }

    // 3. Dispatch notifications
    const payload = JSON.stringify({
      title: "Scripture Daily",
      body: "Time for your 10 chapters! Let's get reading.",
      url: "/today"
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Subscription expired or unsubscribed, remove from DB
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push Error for user", sub.user_id, err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    console.error("Cron Job Error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
