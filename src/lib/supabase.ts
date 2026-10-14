import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configError =
  !url || !anonKey || url.includes("your-project-ref")
    ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Fill in .env with your project's public values, then restart the dev server."
    : null;

// Only the public (anon / publishable) key is used in the browser.
// All authorization is enforced by Row Level Security.
export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Pings Supabase Auth to confirm the URL and key are valid. */
export async function checkConnection(): Promise<string | null> {
  if (configError) return configError;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anonKey! } });
    if (res.ok) return null;
    return `Supabase responded with ${res.status}. Check the URL and anon key in .env.`;
  } catch {
    return "Could not reach Supabase. Check the URL in .env and your internet connection.";
  }
}
