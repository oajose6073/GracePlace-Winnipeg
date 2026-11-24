-- Sermon series in the database, questions linked to a series, and admins.
--
-- Run once in the Supabase SQL editor (or with `supabase db push`). The whole
-- script runs as a single transaction: if any statement fails, nothing changes.
--
-- This Supabase project also hosts GracePlace Words, which has public sign-up,
-- so "authenticated" means anyone with a Words account. Nothing here grants
-- that role anything beyond reading the (public) active series; every other
-- access requires a row in public.admins.
--
-- After this migration:
--   anon           can read active series, and can insert a question only for
--                  an active series. It still cannot read any questions.
--   authenticated  (non-admin) can read active series. Nothing else: no
--                  questions (read, insert or update) and no series writes.
--   admins         (users listed in public.admins) can read and update every
--                  question, and read, create and update every series.

-------------------------------------------------------------------------------
-- 0. Pre-flight: stop with one clear message if any name is already taken
--    (for example by GracePlace Words). Nothing below uses CREATE OR REPLACE,
--    so a clash would also abort the transaction; this just lists them all.
-------------------------------------------------------------------------------

do $$
declare
  taken text[] := '{}';
  rel text;
begin
  foreach rel in array array[
    'series', 'series_pkey', 'series_id_seq', 'admins', 'admins_pkey',
    'series_questions_series_id_idx', 'series_questions_created_at_idx'
  ] loop
    if to_regclass('public.' || quote_ident(rel)) is not null then
      taken := taken || ('relation public.' || rel);
    end if;
  end loop;

  if to_regprocedure('public.is_admin()') is not null then
    taken := taken || 'function public.is_admin()'::text;
  end if;
  if to_regprocedure('public.series_questions_fill_series_name()') is not null then
    taken := taken || 'function public.series_questions_fill_series_name()'::text;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'series_questions'
               and column_name = 'series_id') then
    taken := taken || 'column public.series_questions.series_id'::text;
  end if;
  if exists (select 1 from pg_trigger
             where tgrelid = 'public.series_questions'::regclass
               and tgname = 'series_questions_fill_series_name') then
    taken := taken || 'trigger series_questions_fill_series_name'::text;
  end if;
  if exists (select 1 from pg_constraint
             where conrelid = 'public.series_questions'::regclass
               and conname = 'series_questions_series_id_fkey') then
    taken := taken || 'constraint series_questions_series_id_fkey'::text;
  end if;
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'series_questions'
               and policyname in ('Visitors can ask about an active series',
                                  'Admins can read questions',
                                  'Admins can update questions')) then
    taken := taken || 'a policy name on public.series_questions'::text;
  end if;

  if cardinality(taken) > 0 then
    raise exception 'Migration stopped, nothing was changed. Already exists: %',
      array_to_string(taken, '; ');
  end if;
end;
$$;

-------------------------------------------------------------------------------
-- 1. Series
-------------------------------------------------------------------------------

create table public.series (
  id          bigint generated always as identity primary key,
  name        text        not null check (char_length(btrim(name)) between 1 and 120),
  kind        text        not null check (kind in ('sunday', 'wednesday')),
  active      boolean     not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.series is
  'Sermon series that members can ask questions about. Only active ones are public.';

-------------------------------------------------------------------------------
-- 2. Link questions to a series
-------------------------------------------------------------------------------

-- Nullable: questions asked before this migration have no series row. Their
-- original `series` text is kept as it was.
alter table public.series_questions
  add column series_id bigint references public.series (id) on delete restrict;

create index series_questions_series_id_idx on public.series_questions (series_id);
create index series_questions_created_at_idx on public.series_questions (created_at desc);

-- The old text column stays for existing rows. New rows have it filled in from
-- the series name by the trigger below, so the site no longer sends it.
alter table public.series_questions alter column series drop not null;

create function public.series_questions_fill_series_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.series_id is not null then
    select s.name into new.series from public.series s where s.id = new.series_id;
  end if;
  return new;
end;
$$;

create trigger series_questions_fill_series_name
  before insert on public.series_questions
  for each row execute function public.series_questions_fill_series_name();

-------------------------------------------------------------------------------
-- 3. Admins
-------------------------------------------------------------------------------

create table public.admins (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.admins is
  'Users allowed into /admin. Add rows from the SQL editor; there is no API to add admins.';

-- Security definer so policies on other tables can check membership without
-- the caller needing to read the admins table themselves.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-------------------------------------------------------------------------------
-- 4. Table privileges (row-level security below decides which rows)
-------------------------------------------------------------------------------

revoke all on public.series, public.admins, public.series_questions from anon, authenticated;

-- authenticated holds these privileges so that admins can use them; the
-- policies below admit only rows for users in public.admins.
grant select                 on public.series             to anon, authenticated;
grant insert, update         on public.series             to authenticated;
grant insert                 on public.series_questions   to anon;
grant select, update         on public.series_questions   to authenticated;
grant select                 on public.admins             to authenticated;

-------------------------------------------------------------------------------
-- 5. Row-level security
-------------------------------------------------------------------------------

alter table public.series  enable row level security;
alter table public.admins  enable row level security;
alter table public.series_questions enable row level security;

-- admins: a signed-in user can see only their own row, which is how /admin
-- tells an admin from someone who merely has an account.
create policy "Users can see their own admin row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- series
create policy "Anyone can see active series"
  on public.series for select to anon, authenticated
  using (active);

create policy "Admins can see all series"
  on public.series for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can create series"
  on public.series for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update series"
  on public.series for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- series_questions: replace the old insert-only policy (whatever it was
-- named) with one that requires an active series.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'series_questions' and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.series_questions', p.policyname);
  end loop;
end;
$$;

-- anon only: the Ask page always posts with the publishable key alone, and
-- signed-in Words users get no access to this table.
create policy "Visitors can ask about an active series"
  on public.series_questions for insert to anon
  with check (
    series_id is not null
    and coalesce(answered, false) = false
    and exists (
      select 1 from public.series s
      where s.id = series_questions.series_id and s.active
    )
  );

create policy "Admins can read questions"
  on public.series_questions for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update questions"
  on public.series_questions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
