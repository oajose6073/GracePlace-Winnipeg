import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { SectionHeading } from "../components/SectionHeading";
import { church } from "../data/site";
import { submitForm } from "../lib/submitForm";

type Field = "name" | "email" | "message";
type Errors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Contact() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const update =
    (field: Field) =>
    (event: { target: { value: string } }) => {
      setValues((v) => ({ ...v, [field]: event.target.value }));
      setErrors((e) => ({ ...e, [field]: undefined }));
    };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!values.email.trim()) next.email = "Please enter your email address.";
    else if (!EMAIL_PATTERN.test(values.email)) next.email = "Please enter a valid email address.";
    if (!values.message.trim()) next.message = "Please enter your message.";
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);

    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setStatus("sending");
    try {
      await submitForm(`Website message from ${values.name}`, {
        Name: values.name,
        Email: values.email,
        Message: values.message,
      });
      setStatus("sent");
      setValues({ name: "", email: "", message: "" });
    } catch (error) {
      console.error(error);
      setStatus("failed");
    }
  };

  return (
    <section id="contact" className="bg-base-200 px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            label="Get in Touch"
            title="Contact Us"
            sub="We would love to hear from you — whether it is a question, a prayer request, or just saying hello."
            centered
          />
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-14">
          <Reveal>
            <ul className="space-y-7">
              <li className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <MapPin className="size-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[11px] tracking-[0.12em] text-primary uppercase">
                    Address
                  </span>
                  <address className="mt-1 text-[15px] leading-relaxed not-italic">
                    {church.address.street}
                    <br />
                    {church.address.region}
                  </address>
                </span>
              </li>

              <li className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Phone className="size-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[11px] tracking-[0.12em] text-primary uppercase">
                    Phone
                  </span>
                  <a
                    href={church.phoneHref}
                    className="mt-1 block text-[15px] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {church.phone}
                  </a>
                </span>
              </li>

              <li className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Mail className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] tracking-[0.12em] text-primary uppercase">
                    Email
                  </span>
                  <a
                    href={`mailto:${church.email}`}
                    className="mt-1 block text-[15px] break-all hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {church.email}
                  </a>
                </span>
              </li>
            </ul>
          </Reveal>

          <Reveal>
            {status === "sent" ? (
              <div
                role="status"
                className="card h-full border border-primary/25 bg-base-100 text-center"
              >
                <div className="card-body items-center justify-center gap-3 p-10">
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CheckCircle2 className="size-7" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-2xl font-medium text-ink">Message on its way</h3>
                  <p className="max-w-sm text-[15px] text-base-content/65">
                    Thank you for reaching out. Someone from our team will get back to you soon.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="btn btn-ghost btn-sm mt-2"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="card border border-base-300 bg-base-100"
              >
                <div className="card-body p-6 sm:p-8">
                  <fieldset className="fieldset gap-4" disabled={status === "sending"}>
                    <legend className="sr-only">Send us a message</legend>

                    <div>
                      <label className="label text-sm" htmlFor="name">
                        Your name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Jane Doe"
                        value={values.name}
                        onChange={update("name")}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? "name-error" : undefined}
                        className={`input w-full rounded-box ${errors.name ? "input-error" : ""}`}
                      />
                      {errors.name && (
                        <p id="name-error" role="alert" className="mt-1.5 text-sm text-error">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label text-sm" htmlFor="email">
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="jane@example.com"
                        value={values.email}
                        onChange={update("email")}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        className={`input w-full rounded-box ${errors.email ? "input-error" : ""}`}
                      />
                      {errors.email && (
                        <p id="email-error" role="alert" className="mt-1.5 text-sm text-error">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label text-sm" htmlFor="message">
                        Your message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        placeholder="How can we pray for you?"
                        value={values.message}
                        onChange={update("message")}
                        aria-invalid={Boolean(errors.message)}
                        aria-describedby={errors.message ? "message-error" : undefined}
                        className={`textarea w-full rounded-box ${
                          errors.message ? "textarea-error" : ""
                        }`}
                      />
                      {errors.message && (
                        <p id="message-error" role="alert" className="mt-1.5 text-sm text-error">
                          {errors.message}
                        </p>
                      )}
                    </div>

                    {status === "failed" && (
                      <div role="alert" className="alert alert-error alert-soft rounded-box text-sm">
                        <span>
                          That did not go through. Please try again, or email us directly at{" "}
                          <a className="link" href={`mailto:${church.email}`}>
                            {church.email}
                          </a>
                          .
                        </span>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary mt-1 h-12 w-full text-[15px]">
                      {status === "sending" && <span className="loading loading-spinner size-4" />}
                      {status === "sending" ? "Sending" : "Send message"}
                    </button>
                  </fieldset>
                </div>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
