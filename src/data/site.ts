/**
 * Every piece of church-specific copy and configuration lives here, so the
 * content can be updated without touching component code.
 */

/** Prefixes a `public/` path with Vite's `base` ("/" on Netlify), so assets
 *  keep working if the site is ever served from a subdirectory. */
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export const church = {
  name: "GracePlace",
  city: "Winnipeg",
  fullName: "GracePlace Winnipeg",
  tagline: "A place where we prioritize growing in the word and flowing in the spirit.",
  address: {
    street: "1150 Waverley Street",
    region: "Winnipeg, MB",
  },
  phone: "(204) 952-1997",
  phoneHref: "tel:+12049521997",
  email: "graceplacewpg@gmail.com",
  logo: asset("images/Graceplace.jpeg"),
} as const;

export const services = [
  { day: "Sundays", time: "4:00 PM", type: "Main Service" },
  { day: "Wednesdays", time: "6:30 PM", type: "Bible Study (Online)" },
] as const;

export const navLinks = [
  { label: "Sermons", to: "/#sermons" },
  { label: "About Us", to: "/#anthem" },
  { label: "Contact", to: "/#contact" },
  { label: "Request Ride", to: "/request-ride" },
  { label: "Ask a Question", to: "/ask" },
] as const;

/**
 * The sermon series that questions on the Ask page are filed under. Change it
 * when a new series starts; every question is saved with this exact text in
 * the `series` column. While it is an empty string the Ask page tells visitors
 * questions will open with the next series instead of showing the form.
 */
export const currentSeries = "Handling Wrongs By Love";

/** Longest question the Ask page accepts, in characters. */
export const questionMaxLength = 1000;

export const socials = [
  { label: "Facebook", href: "https://www.facebook.com/graceplacewpg", icon: "facebook" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/graceplacewpg?igsh=MWNpanhtMmdzcnppdg==",
    icon: "instagram",
  },
  { label: "YouTube", href: "https://www.youtube.com/@GracePlaceWinnipeg", icon: "youtube" },
  { label: "Telegram", href: "https://t.me/graceplacewinnipeg", icon: "send" },
] as const;

export const values = [
  {
    icon: "heart",
    title: "Loving Community",
    body: "We grow in faith through authentic, caring relationships.",
  },
  {
    icon: "book",
    title: "Biblical Teachings",
    body: "Everything we do flows from the truth of God's word.",
  },
  {
    icon: "wind",
    title: "Spirit-Led Worship",
    body: "We prioritize flowing in the Spirit in all that we do.",
  },
] as const;

/** Background frames for the hero. Add a file to `public/images/Slide_photos`
 *  and list it here to include it in the rotation. */
export const heroSlides = [
  "IMG_2068.JPG",
  "IMG_2265.JPG",
  "IMG_2270.JPG",
  "IMG_3669.JPEG",
  "IMG_3670.JPEG",
  "IMG_9678.JPG",
  "IMG_E9737.JPG",
].map((file) => asset(`images/Slide_photos/${file}`));

export const anthemPhotos = {
  back: asset("images/Slide_photos/IMG_2068.JPG"),
  front: asset("images/Slide_photos/IMG_9858.JPG"),
} as const;

export const tickerItems = [
  "Sundays 4:00 PM — Main Service",
  "Wednesdays 6:30 PM — Bible Study (Online)",
  "Growing in the Word, Flowing in the Spirit",
  "1150 Waverley Street, Winnipeg",
] as const;

export const rideInfo = [
  {
    icon: "clock",
    title: "Submit by Saturday",
    body: "Requests must be in before Saturday 5 PM for Sunday pickup.",
  },
  {
    icon: "map-pin",
    title: "Winnipeg Only",
    body: "We currently serve rides within the Winnipeg area.",
  },
  {
    icon: "phone",
    title: "We'll Confirm",
    body: "Our team will call or text to confirm your ride details.",
  },
] as const;

export const givingScripture = {
  quote:
    "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.",
  reference: "2 Corinthians 9:7",
} as const;

export type ChurchEvent = {
  title: string;
  /** ISO date, e.g. "2026-10-04" — rendered in the visitor's locale. */
  date: string;
  time: string;
  location: string;
  description: string;
};

/** Add entries here to fill the "What's On" section. While this is empty the
 *  section invites visitors to the weekly services instead. */
export const events: ChurchEvent[] = [];
