# GracePlace Winnipeg

The church website, built with React 19, Vite, Tailwind CSS 4 and daisyUI 5.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-checks, then builds to `dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Everything is
optional — the site works without any of it, it just does less.

| Variable | Without it |
| --- | --- |
| `VITE_YOUTUBE_API_KEY`, `VITE_YOUTUBE_CHANNEL_ID` | The Sermons section links to the YouTube channel instead of listing recent videos. |
| `VITE_FORM_ENDPOINT` | The contact and ride forms open a pre-filled email to the church instead of posting to a form backend. |

Anything prefixed `VITE_` is compiled into the public JavaScript bundle and is
readable by anyone. Restrict the YouTube key by HTTP referrer in the Google
Cloud console. Never put a genuinely private secret in a `VITE_` variable.

`VITE_FORM_ENDPOINT` accepts any URL that takes a JSON `POST` — Formspree,
Basin and Web3Forms all work. Until one is set, no submission is lost: the
visitor gets an email addressed to the church with their answers filled in.

## Editing content

Copy, service times, navigation, social links, hero photos and the values list
all live in [`src/data/site.ts`](src/data/site.ts). Most routine updates are a
one-line change there rather than a change to a component.

**Adding an event.** The "What's On" section is driven by the `events` array in
that file. While it is empty the section invites visitors to the weekly
services; add an entry and it becomes a card grid.

**Adding a hero photo.** Drop the file in `public/images/Slide_photos/` and add
its filename to `heroSlides`.

## Structure

```
src/
  data/site.ts      all church content and configuration
  lib/              theme, scroll reveal, slideshow, sermons, form submission
  components/       nav, footer, layout and shared pieces
  sections/         the home page sections
  pages/            Home, Give, Request a Ride, 404
  index.css         Tailwind entry, daisyUI themes, keyframes
```

### Theming

Two daisyUI themes — `graceplace` and `graceplacedark` — are defined in
`src/index.css`. They carry the navy-and-gold brand: only the page canvas, card
surfaces and body text change between them. `neutral` is deliberately identical
in both, because the nav bar, footer and hero are designed dark either way.

Use daisyUI semantic colours (`bg-base-200`, `text-primary`, `text-base-content/65`)
so everything follows the theme. `text-ink` is a small custom utility for
headings on a page surface: navy in light, near-white in dark. Do not use
Tailwind's `dark:` variant — the theme is driven by `data-theme`, not by the
media query.

The chosen theme is stored in `localStorage` under `gp-theme` and applied by a
small inline script in `index.html` before first paint, so there is no flash of
the wrong theme.

## Deployment

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the site and publishes `dist/` to GitHub Pages. Set `API_KEY`,
`CHANNEL_ID` and `FORM_ENDPOINT` as repository secrets to have them compiled in.

The site is served from a project page, so `vite.config.ts` sets
`base: "/GracePlace-Winnipeg/"` for production builds. **If the repository is
ever renamed, that string has to change with it.** The build also writes a
`404.html` copy of the app shell, which is what makes a direct link to
`/give` work on GitHub Pages.

## Accessibility notes

These are easy to regress, so they are worth knowing about:

- Every animation is disabled under `prefers-reduced-motion`, including the
  hero slideshow, which stops auto-advancing rather than just animating faster.
- Form errors are announced with `role="alert"` and tied to their input with
  `aria-describedby`; a failed submit moves focus to the first bad field.
- Gold is a light colour, so text on it is navy (`--color-primary-content`)
  rather than white.
