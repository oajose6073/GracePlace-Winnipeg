import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An expired or reused magic link comes back as #error_description=... */
function linkErrorFromUrl(): string | undefined {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const description = params.get("error_description");
  if (!description) return undefined;
  window.history.replaceState(null, "", window.location.pathname);
  return params.get("error_code") === "otp_expired"
    ? "That sign-in link has expired or was already used. Request a new one below."
    : description.replace(/\+/g, " ");
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | undefined>(linkErrorFromUrl);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError("Please enter a valid email address.");
      document.getElementById("admin-email")?.focus();
      return;
    }

    setError(undefined);
    setStatus("sending");
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        // Never create an account from this form. Public sign-up stays on for
        // GracePlace Words (same Supabase project), so this flag is what keeps
        // /admin from creating accounts.
        shouldCreateUser: false,
        // Always explicit: the project's Site URL points at the Words app, so
        // without this the link would land there. Must be in the dashboard's
        // Redirect URLs allow-list.
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (!otpError) {
      setStatus("sent");
      return;
    }

    // An address with no account is refused because sign-ups are off. Show the
    // same message as success so the form does not reveal who has an account.
    if (otpError.code === "otp_disabled" || /signups not allowed/i.test(otpError.message)) {
      setStatus("sent");
      return;
    }

    console.error("Magic link request failed:", otpError);
    setStatus("idle");
    setError(
      otpError.status === 429
        ? "Too many sign-in emails were requested. Please wait a minute and try again."
        : "We could not send the sign-in link. Please try again.",
    );
  };

  if (status === "sent") {
    return (
      <div role="status" className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
          <MailCheck className="size-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 font-display text-3xl font-medium text-ink">Check your email</h1>
        <p className="mt-3 text-[15px] text-base-content/65">
          If <strong className="font-medium text-base-content">{email.trim()}</strong> belongs to
          an admin, a sign-in link is on its way. It can take a minute, and may land in spam.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="btn btn-ghost btn-sm mt-4"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-display text-3xl font-medium text-ink">Admin sign in</h1>
      <p className="mt-2 text-[15px] text-base-content/65">
        Enter your email and we will send you a one-time sign-in link.
      </p>
      <form onSubmit={handleSubmit} noValidate className="card mt-6 border border-base-300 bg-base-200">
        <div className="card-body p-6">
          <fieldset className="fieldset gap-3" disabled={status === "sending"}>
            <label className="label text-sm" htmlFor="admin-email">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(undefined);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-email-error" : undefined}
              className={`input w-full rounded-box ${error ? "input-error" : ""}`}
            />
            {error && (
              <p id="admin-email-error" role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary mt-1 h-11">
              {status === "sending" && <span className="loading loading-spinner size-4" />}
              {status === "sending" ? "Sending" : "Email me a sign-in link"}
            </button>
          </fieldset>
        </div>
      </form>
    </div>
  );
}
