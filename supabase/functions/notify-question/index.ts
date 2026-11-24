// Supabase Edge Function entry point. All logic lives in handler.ts.
// Deploy with JWT verification off; the function checks its own secret header:
//   supabase functions deploy notify-question --no-verify-jwt
import { createHandler } from "./handler.ts";

Deno.serve(createHandler({ env: (name) => Deno.env.get(name), fetch }));
