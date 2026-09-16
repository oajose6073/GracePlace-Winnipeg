import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { church, navLinks, services, socials } from "../data/site";
import {
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  YouTubeIcon,
} from "./SocialIcons";

const socialIcons = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
  send: TelegramIcon,
} as const;

export function Footer() {
  return (
    <footer className="bg-neutral text-neutral-content">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-3 md:gap-8">
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src={church.logo}
              alt=""
              width={44}
              height={44}
              className="size-11 rounded-full mix-blend-screen"
            />
            <span className="leading-none">
              <span className="block font-display text-xl font-semibold text-white">
                {church.name}
              </span>
              <span className="mt-0.5 block text-[10px] tracking-[0.12em] text-primary uppercase">
                {church.city}
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-white/55">{church.tagline}</p>
          <div className="mt-5 flex gap-2">
            {socials.map((social) => {
              const Icon = socialIcons[social.icon];
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-10 items-center justify-center rounded-full border border-white/12 text-white/70 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Icon className="size-4.5" />
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[11px] tracking-[0.14em] text-primary uppercase">Gather with us</h2>
          <ul className="mt-4 space-y-3">
            {services.map((service) => (
              <li key={service.day} className="text-sm">
                <span className="text-white">
                  {service.day} · {service.time}
                </span>
                <span className="block text-white/50">{service.type}</span>
              </li>
            ))}
          </ul>
          <address className="mt-5 flex items-start gap-2.5 text-sm text-white/55 not-italic">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} />
            <span>
              {church.address.street}
              <br />
              {church.address.region}
            </span>
          </address>
        </div>

        <div>
          <h2 className="text-[11px] tracking-[0.14em] text-primary uppercase">Explore</h2>
          <ul className="mt-4 space-y-2.5">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-sm text-white/70 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/give"
                className="text-sm text-white/70 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Give
              </Link>
            </li>
          </ul>
          <div className="mt-5 space-y-2.5">
            <a
              href={church.phoneHref}
              className="flex items-center gap-2.5 text-sm text-white/55 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Phone className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
              {church.phone}
            </a>
            <a
              href={`mailto:${church.email}`}
              className="flex items-center gap-2.5 text-sm break-all text-white/55 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Mail className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
              {church.email}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <p className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-white/45 sm:px-8">
          &copy; {new Date().getFullYear()} <span className="text-white/70">{church.fullName}</span>.
          All rights reserved. Made with love for our community.
        </p>
      </div>
    </footer>
  );
}
