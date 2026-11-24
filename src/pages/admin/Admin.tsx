import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../../components/ThemeToggle";
import { church } from "../../data/site";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { Dashboard } from "./Dashboard";
import { LoginForm } from "./LoginForm";

/** Result of looking the signed-in user up in public.admins. */
type AdminCheck = { userId: string; result: "admin" | "denied" | "error" };

/**
 * /admin — private page for church staff. Not linked from the site and
 * marked noindex. Row-level security on the database is what actually
 * protects the data; this page only decides what to show.
 */
export default function Admin() {
  // undefined until Supabase reports the initial session (including one
  // arriving in a magic-link URL), then a session or null.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [check, setCheck] = useState<AdminCheck>();

  useEffect(() => {
    document.title = "Admin — GracePlace Winnipeg";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Admin check failed:", error);
        setCheck({ userId, result: error ? "error" : data ? "admin" : "denied" });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = () => supabase.auth.signOut();

  let content;
  if (!supabaseConfigured) {
    content = (
      <Notice title="Not configured">
        VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY were not set when this site was built.
      </Notice>
    );
  } else if (session === undefined || (session && check?.userId !== userId)) {
    content = (
      <div className="flex justify-center py-24" role="status" aria-label="Loading">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  } else if (!session) {
    content = <LoginForm />;
  } else if (check?.result === "denied") {
    content = (
      <Notice title="You don't have access">
        <button type="button" onClick={signOut} className="btn btn-ghost btn-sm mt-2">
          Sign out
        </button>
      </Notice>
    );
  } else if (check?.result === "error") {
    content = (
      <Notice title="Something went wrong">
        We could not check your access. Refresh the page to try again.
      </Notice>
    );
  } else {
    content = <Dashboard />;
  }

  const showAccount = session && check?.userId === userId && check?.result === "admin";

  return (
    <div className="flex min-h-svh flex-col bg-base-100 text-base-content">
      <header className="bg-neutral text-neutral-content">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-box focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <img src={church.logo} alt="" width={36} height={36} className="size-9 rounded-full mix-blend-screen" />
            <span className="font-display text-lg font-semibold text-white">
              {church.name} <span className="text-primary">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {showAccount && (
              <>
                <span className="hidden max-w-[16rem] truncate text-sm text-white/60 sm:inline">
                  {session.user.email}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="btn btn-ghost btn-sm text-white/80 hover:bg-white/10"
                >
                  <LogOut className="size-4" strokeWidth={1.75} />
                  Sign out
                </button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">{content}</main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-3xl font-medium text-ink">{title}</h1>
      {children && <div className="mt-3 text-[15px] text-base-content/65">{children}</div>}
    </div>
  );
}
