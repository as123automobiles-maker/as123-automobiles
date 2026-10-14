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

/** Turns Supabase/Postgres errors into short, readable messages. */
export function errorMessage(err: unknown): string {
  if (!err) return "Something went wrong.";
  const e = err as { message?: string; code?: string };
  if (e.message?.includes("Failed to fetch")) return "Network error. Check your internet connection and try again.";
  if (e.message === "Invalid login credentials") return "Wrong email or password.";
  // Messages raised by save_bill() are already written for staff.
  if (e.code === "22023" || e.code === "P0002" || e.code === "42501") return e.message || "Something went wrong.";
  if (e.code === "23514") return "Some details are not valid. Check the highlighted fields and try again.";
  if (e.code === "PGRST202" || e.code === "PGRST205")
    return "The database isn't set up yet. Run the SQL in supabase/migrations (see README).";
  return e.message || "Something went wrong.";
}
