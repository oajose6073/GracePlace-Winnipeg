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

Copy `.env.example` to `.env` (gitignored) and fill in what you need. The
site builds without any of it, it just does less.

| Variable | Without it |
| --- | --- |
| `VITE_YOUTUBE_API_KEY`, `VITE_YOUTUBE_CHANNEL_ID` | The Sermons section links to the YouTube channel instead of listing recent videos. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | The Ask a Question page cannot load series or save questions (it shows an error with the church email instead), and `/admin` cannot sign in. Use the publishable key, never the secret one. |
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
  pages/            Home, Give, Request a Ride, Ask a Question, 404
  pages/admin/      private /admin page (sign-in, questions, series)
  index.css         Tailwind entry, daisyUI themes, keyframes
supabase/
  migrations/       SQL for the series, admins and row-level security
  tests/            access test for those rules (run in the SQL editor)
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

The site is hosted on Netlify at graceplacewpg.ca. [`netlify.toml`](netlify.toml)
sets the build (`npm run build`, publishing `dist/`, Node 22) and rewrites
every path to `index.html`, so a direct link to `/give` or `/ask` loads the
app and React Router renders the page.

Set the variables from the table above in Netlify under **Site configuration
> Environment variables**. They are compiled in at build time, so after
changing one, trigger a new deploy.

## Sermon series and the admin page

Series live in the Supabase `series` table, not in the code. Sign in at
`/admin` (it is not linked from the site) and use the **Series** tab to add,
rename, or switch a series on and off. Every active series appears in the Ask
a Question dropdown as "Sunday series: …" or "Wednesday series: …"; with none
active, the page shows "Questions open with the next series". The
**Questions** tab lists everything asked, newest first, in Winnipeg time, with
a filter by series and a button to mark each one answered.

Sign-in is by magic link (an emailed one-time link). The Supabase project is
shared with GracePlace Words, which keeps sign-up on but makes it invite-only:
its trigger `app.handle_new_auth_user()` refuses any new account whose email is
not on the Words member list (`public.person`). `/admin` never creates accounts
(`shouldCreateUser: false`), and only users listed in the `admins` table get
past "You don't have access".

To add an admin (all SQL in the dashboard's SQL editor; replace the name and
email):

1. If they are not already on the Words member list, add them as a Words
   member. This also gives them member access to GracePlace Words. Safe to run
   twice:

   ```sql
   insert into public.person (name, email, role)
   values ('Pastor Name', 'pastor@example.com', 'member')
   on conflict ((lower(email))) do nothing;
   ```

   If they were removed from Words earlier, this does nothing and the invite
   will still be refused; restoring them is a Words decision.
2. If they have no account yet, create one: **Authentication → Users → Add
   user → Send invitation**. The invitation link opens the Words app (the
   project's Site URL); that is expected. Signing in to Words once works too.
3. Make them an admin:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where lower(email) = lower('pastor@example.com')
   on conflict (user_id) do nothing;
   ```

   Check it took: `select * from public.admins;` shows one more row.
4. They sign in at `graceplacewpg.ca/admin`.

Because the Site URL belongs to Words, the login sets its redirect explicitly
to `<this site>/admin`. That URL must be listed under **Authentication → URL
Configuration → Redirect URLs**, or Supabase sends the link to Words instead.

The database enforces all of this with row-level security (see
[`supabase/migrations/`](supabase/migrations/)): the public key can read active
series and insert a question for an active series, but can never read
questions, and a signed-in user who is not in `admins` gets nothing beyond the
active series. The admin page only decides what to show.
[`supabase/tests/admin_access.test.sql`](supabase/tests/admin_access.test.sql)
checks these rules; run it in the SQL editor after any policy change (it rolls
back everything it creates and reports the result as an error message).

## Accessibility notes

These are easy to regress, so they are worth knowing about:

- Every animation is disabled under `prefers-reduced-motion`, including the
  hero slideshow, which stops auto-advancing rather than just animating faster.
- Form errors are announced with `role="alert"` and tied to their input with
  `aria-describedby`; a failed submit moves focus to the first bad field.
- Gold is a light colour, so text on it is navy (`--color-primary-content`)
  rather than white.
