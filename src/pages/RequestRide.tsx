import { useEffect, useState, type FormEvent } from "react";
import { Calendar, CheckCircle2, Clock, MapPin, Phone, Repeat, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { Reveal } from "../components/Reveal";
import { church, rideInfo } from "../data/site";
import { submitForm } from "../lib/submitForm";

const infoIcons = { clock: Clock, "map-pin": MapPin, phone: Phone } as const;

type Field = "name" | "phone" | "email" | "address" | "date" | "passengers" | "weekly";
type Errors = Partial<Record<Field, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  address: "",
  date: "",
  passengers: "",
  weekly: "",
  notes: "",
};

/** `min` on the date input, so a pickup cannot be requested in the past. */
const today = new Date().toISOString().slice(0, 10);

export default function RequestRide() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    document.title = "Request a Ride — GracePlace Winnipeg";
  }, []);

  const set = (field: keyof typeof EMPTY, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!values.phone.trim()) next.phone = "Please enter your phone number.";
    if (!EMAIL_PATTERN.test(values.email)) next.email = "Please enter a valid email address.";
    if (!values.address.trim()) next.address = "Please enter your pickup address.";
    if (!values.date) next.date = "Please select a date.";

    const passengers = Number(values.passengers);
    if (!values.passengers.trim()) next.passengers = "Please enter the number of passengers.";
    else if (!Number.isInteger(passengers) || passengers < 1 || passengers > 10) {
      next.passengers = "Please enter a number between 1 and 10.";
    }

    if (!values.weekly) next.weekly = "Please select an option.";
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);

    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      const node =
        document.getElementById(firstInvalid) ??
        document.querySelector<HTMLElement>(`[name="${firstInvalid}"]`);
      node?.focus();
      node?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setStatus("sending");
    try {
      await submitForm(`Ride request from ${values.name}`, {
        Name: values.name,
        Phone: values.phone,
        Email: values.email,
        "Pickup address": values.address,
        "Pickup date": values.date,
        Passengers: values.passengers,
        "Weekly recurring": values.weekly === "yes" ? "Yes, every week" : "Just this once",
        Notes: values.notes,
      });
      setStatus("sent");
    } catch (error) {
      console.error(error);
      setStatus("failed");
    }
  };

  const fieldClass = (field: Field) =>
    `input w-full rounded-box ${errors[field] ? "input-error" : ""}`;

  return (
    <>
      <PageHero
        badge={church.fullName}
        title={
          <>
            Request a <em className="text-primary italic">ride</em> to church
          </>
        }
      >
        No one should miss church because of transportation. Fill out the form below and our team
        will be in touch.
      </PageHero>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <ul className="grid gap-4 sm:grid-cols-3">
              {rideInfo.map((info) => {
                const Icon = infoIcons[info.icon];
                return (
                  <li
                    key={info.title}
                    className="card border border-base-300 bg-base-200 p-5 text-center sm:text-left"
                  >
                    <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary sm:mx-0">
                      <Icon className="size-4.5" strokeWidth={1.75} />
                    </span>
                    <strong className="mt-3 block font-medium text-ink">{info.title}</strong>
                    <span className="mt-1 block text-sm text-base-content/65">{info.body}</span>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal className="mt-10">
            {status === "sent" ? (
              <div
                role="status"
                className="card border border-primary/25 bg-base-200 text-center"
              >
                <div className="card-body items-center gap-3 p-10 sm:p-14">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <CheckCircle2 className="size-8" strokeWidth={1.5} />
                  </span>
                  <h2 className="font-display text-3xl font-medium text-ink">Request received</h2>
                  <p className="max-w-md text-[15px] text-base-content/65">
                    Thank you. Our team will reach out to confirm your ride details shortly. We look
                    forward to seeing you Sunday.
                  </p>
                  <Link to="/" className="btn btn-primary mt-3 h-11 px-7">
                    Back to home
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="card border border-base-300 bg-base-200"
              >
                <div className="card-body gap-0 p-6 sm:p-9">
                  <fieldset className="fieldset gap-4" disabled={status === "sending"}>
                    <legend className="text-[11px] tracking-[0.14em] text-primary uppercase">
                      Personal information
                    </legend>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label text-sm" htmlFor="name">
                          Full name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Jane Doe"
                          value={values.name}
                          onChange={(e) => set("name", e.target.value)}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? "name-error" : undefined}
                          className={fieldClass("name")}
                        />
                        {errors.name && (
                          <p id="name-error" role="alert" className="mt-1.5 text-sm text-error">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label text-sm" htmlFor="phone">
                          Phone number
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="(204) 555-0100"
                          value={values.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? "phone-error" : undefined}
                          className={fieldClass("phone")}
                        />
                        {errors.phone && (
                          <p id="phone-error" role="alert" className="mt-1.5 text-sm text-error">
                            {errors.phone}
                          </p>
                        )}
                      </div>
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
                        onChange={(e) => set("email", e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        className={fieldClass("email")}
                      />
                      {errors.email && (
                        <p id="email-error" role="alert" className="mt-1.5 text-sm text-error">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label text-sm" htmlFor="address">
                        Full pickup address
                      </label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        autoComplete="street-address"
                        placeholder="123 Main St, Winnipeg, MB"
                        value={values.address}
                        onChange={(e) => set("address", e.target.value)}
                        aria-invalid={Boolean(errors.address)}
                        aria-describedby={errors.address ? "address-error" : undefined}
                        className={fieldClass("address")}
                      />
                      {errors.address && (
                        <p id="address-error" role="alert" className="mt-1.5 text-sm text-error">
                          {errors.address}
                        </p>
                      )}
                    </div>
                  </fieldset>

                  <div className="divider my-7" />

                  <fieldset className="fieldset gap-4" disabled={status === "sending"}>
                    <legend className="text-[11px] tracking-[0.14em] text-primary uppercase">
                      Ride details
                    </legend>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label text-sm" htmlFor="date">
                          Pickup date
                        </label>
                        <input
                          id="date"
                          name="date"
                          type="date"
                          min={today}
                          value={values.date}
                          onChange={(e) => set("date", e.target.value)}
                          aria-invalid={Boolean(errors.date)}
                          aria-describedby={errors.date ? "date-error" : undefined}
                          className={fieldClass("date")}
                        />
                        {errors.date && (
                          <p id="date-error" role="alert" className="mt-1.5 text-sm text-error">
                            {errors.date}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="label text-sm" htmlFor="passengers">
                          Number of passengers
                        </label>
                        <input
                          id="passengers"
                          name="passengers"
                          type="number"
                          min={1}
                          max={10}
                          inputMode="numeric"
                          placeholder="2"
                          value={values.passengers}
                          onChange={(e) => set("passengers", e.target.value)}
                          aria-invalid={Boolean(errors.passengers)}
                          aria-describedby={errors.passengers ? "passengers-error" : undefined}
                          className={fieldClass("passengers")}
                        />
                        {errors.passengers && (
                          <p
                            id="passengers-error"
                            role="alert"
                            className="mt-1.5 text-sm text-error"
                          >
                            {errors.passengers}
                          </p>
                        )}
                      </div>
                    </div>

                    <fieldset
                      className="fieldset gap-2"
                      aria-invalid={Boolean(errors.weekly)}
                      aria-describedby={errors.weekly ? "weekly-error" : undefined}
                    >
                      <legend className="label text-sm">Weekly recurring pickup?</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { value: "yes", label: "Yes, every week", Icon: Repeat },
                          { value: "no", label: "Just this once", Icon: Calendar },
                        ].map(({ value, label, Icon }) => {
                          const selected = values.weekly === value;
                          return (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-center gap-3 rounded-box border px-4 py-3 text-[15px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
                                selected
                                  ? "border-primary bg-primary/10 text-ink"
                                  : "border-base-300 bg-base-100 hover:border-primary/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name="weekly"
                                value={value}
                                checked={selected}
                                onChange={() => set("weekly", value)}
                                className="sr-only"
                              />
                              <Icon
                                className={`size-4.5 shrink-0 ${
                                  selected ? "text-primary" : "text-base-content/50"
                                }`}
                                strokeWidth={1.75}
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                      {errors.weekly && (
                        <p id="weekly-error" role="alert" className="text-sm text-error">
                          {errors.weekly}
                        </p>
                      )}
                    </fieldset>

                    <div>
                      <label className="label text-sm" htmlFor="notes">
                        Additional notes{" "}
                        <span className="text-base-content/50">(optional)</span>
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        placeholder="Mobility needs, a car seat, anything else we should know"
                        value={values.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        className="textarea w-full rounded-box"
                      />
                    </div>

                    {status === "failed" && (
                      <div role="alert" className="alert alert-error alert-soft rounded-box text-sm">
                        <span>
                          That did not go through. Please try again, or call us at{" "}
                          <a className="link" href={church.phoneHref}>
                            {church.phone}
                          </a>
                          .
                        </span>
                      </div>
                    )}

                    <button type="submit" className="btn btn-primary mt-2 h-12 w-full text-[15px]">
                      {status === "sending" ? (
                        <span className="loading loading-spinner size-4" />
                      ) : (
                        <Send className="size-4" strokeWidth={2} />
                      )}
                      {status === "sending" ? "Sending" : "Submit ride request"}
                    </button>

                    <p className="text-center text-sm leading-relaxed text-base-content/60">
                      Need immediate help? Call us at{" "}
                      <a className="link link-hover text-primary" href={church.phoneHref}>
                        {church.phone}
                      </a>
                      <br />
                      or email{" "}
                      <a className="link link-hover text-primary" href={`mailto:${church.email}`}>
                        {church.email}
                      </a>
                    </p>
                  </fieldset>
                </div>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
