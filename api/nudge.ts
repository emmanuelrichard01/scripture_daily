/**
 * Sends a friend a short encouragement push.
 *
 * This exists server-side because the two things it needs — the VAPID private
 * key and the recipient's push subscriptions — must never reach a browser. The
 * caller supplies only a friend's user id; everything that decides whether the
 * send is permitted is re-derived here.
 *
 * Three checks, in order:
 *   1. The bearer token resolves to a real user (identity is never taken from
 *      the request body).
 *   2. That user and the target are *accepted* friends. Without this, anyone
 *      holding a session could push to any user id they could guess.
 *   3. The sender has not nudged this friend within the cooldown, so the
 *      feature cannot be turned into a way to spam someone's lock screen.
 *
 * Uses Vercel's Node `(req, res)` signature — see the note in `cron.ts`; a
 * returned `Response` is silently discarded by this runtime and the request
 * hangs until the gateway times out.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const config = { runtime: "nodejs" };

/** One nudge per friend per this many hours. */
const COOLDOWN_HOURS = 12;

/** Refuse absurd bodies outright rather than buffering them. */
const MAX_BODY_BYTES = 4 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}

/**
 * Reads the request body.
 *
 * Read from the stream rather than trusting a framework-parsed `req.body`, so
 * the handler does not depend on which body parser the platform happens to
 * apply.
 */
async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Buffer);
    size += buffer.byteLength;
    if (size > MAX_BODY_BYTES) throw new Error("Body too large");
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return send(response, 500, { error: "Supabase service credentials are not configured" });
  }
  if (!vapidPublic || !vapidPrivate) {
    return send(response, 500, { error: "Push notifications aren't configured" });
  }

  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) return send(response, 401, { error: "Sign in to send encouragement." });

  let friendId: unknown;
  try {
    ({ friendId } = JSON.parse(await readBody(request)) as { friendId?: unknown });
  } catch {
    return send(response, 400, { error: "Malformed request" });
  }

  if (typeof friendId !== "string" || !UUID_PATTERN.test(friendId)) {
    return send(response, 400, { error: "Unknown recipient" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Identity comes from the token, never from the body.
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const sender = userData?.user;
    if (userError || !sender) {
      return send(response, 401, { error: "Your session has expired." });
    }

    if (sender.id === friendId) {
      return send(response, 400, { error: "You can't nudge yourself." });
    }

    const { data: friendship, error: friendshipError } = await admin
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(sender_id.eq.${sender.id},receiver_id.eq.${friendId}),` +
          `and(sender_id.eq.${friendId},receiver_id.eq.${sender.id})`,
      )
      .maybeSingle();

    if (friendshipError) throw new Error(friendshipError.message);
    // Deliberately the same message whether the id is a stranger or does not
    // exist: distinguishing them would turn this into a membership oracle.
    if (!friendship) {
      return send(response, 403, { error: "You aren't reading together yet." });
    }

    const cooldownStart = new Date(
      Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data: recent, error: recentError } = await admin
      .from("nudges")
      .select("id")
      .eq("sender_id", sender.id)
      .eq("receiver_id", friendId)
      .gte("created_at", cooldownStart)
      .limit(1)
      .maybeSingle();

    if (recentError) throw new Error(recentError.message);
    if (recent) {
      return send(response, 429, {
        error: "You've already encouraged them today. Try again tomorrow.",
      });
    }

    const { data: subscriptions, error: subscriptionError } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", friendId);

    if (subscriptionError) throw new Error(subscriptionError.message);

    // Record the attempt before sending. If delivery fails we would rather
    // enforce the cooldown than let a retry loop hammer the recipient.
    const { error: insertError } = await admin
      .from("nudges")
      .insert({ sender_id: sender.id, receiver_id: friendId });

    if (insertError) throw new Error(insertError.message);

    if (!subscriptions?.length) {
      // Not an error for the sender: the friend simply has no device registered
      // for push. Saying so would leak their notification settings.
      return send(response, 200, { delivered: 0, reason: "no devices registered" });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:support@scripturedaily.app",
      vapidPublic,
      vapidPrivate,
    );

    const metadata = sender.user_metadata as Record<string, unknown> | undefined;
    const senderName =
      (typeof metadata?.display_name === "string" && metadata.display_name) ||
      (typeof metadata?.full_name === "string" && metadata.full_name) ||
      "A friend";

    const payload = JSON.stringify({
      title: `${senderName} is cheering you on`,
      body: "Your ten chapters are waiting.",
      url: "/",
    });

    const expiredIds: string[] = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 21600 },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            expiredIds.push(subscription.id);
            return;
          }
          throw error;
        }
      }),
    );

    if (expiredIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }

    const failed = results.filter((result) => result.status === "rejected").length;

    return send(response, 200, {
      delivered: subscriptions.length - failed - expiredIds.length,
      pruned: expiredIds.length,
    });
  } catch (error) {
    console.error("Nudge failed:", error);
    return send(response, 500, { error: "Couldn't send that right now." });
  }
}
