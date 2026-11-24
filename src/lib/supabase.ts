/**
 * Supabase client for the /admin page only. Public pages talk to Supabase
 * with plain fetch (see questions.ts), so this library is loaded only when
 * someone opens /admin.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = createClient(
  // Placeholder values only so the module can load; the admin page checks
  // supabaseConfigured before making any call.
  SUPABASE_URL || "http://localhost",
  SUPABASE_KEY || "missing",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Implicit flow: the magic link carries the session itself, so it works
      // even when opened on a different device from the one that asked for it.
      flowType: "implicit",
    },
  },
);
