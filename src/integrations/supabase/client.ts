import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Fails loudly, and early, when the build was made without Supabase credentials.
 *
 * `createClient` throws a bare "supabaseUrl is required" during *module
 * evaluation* — before React mounts, so the ErrorBoundary never sees it and the
 * user gets a blank page with a cryptic console error. Since these values are
 * inlined at build time, a deployment missing them is dead on arrival and the
 * only useful thing to do is say exactly which variables are absent.
 */
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [
    !SUPABASE_URL && "VITE_SUPABASE_URL",
    !SUPABASE_PUBLISHABLE_KEY && "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  throw new Error(
    `Scripture Daily was built without ${missing.join(" and ")}. ` +
      "These are build-time variables, so they must be set in the hosting " +
      "platform's environment settings (Vercel → Settings → Environment " +
      "Variables) and the project redeployed. See .env.example.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Supabase parses the OAuth token out of the callback URL fragment.
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
