-- Notification recipients per series, chosen from the GracePlace Words member
-- list (public.person, same Supabase project).
--
-- Requires 20261124120000_series_and_admins.sql (public.series, is_admin()).
-- Run once in the Supabase SQL editor. Single transaction: if anything fails,
-- nothing changes.
--
-- Words: this migration creates, alters or drops no Words table, policy or
-- trigger. Its only link to Words is a foreign key FROM the new table TO
-- public.person (Postgres attaches its internal referential-integrity
-- triggers to person for that). ON DELETE CASCADE means it never blocks Words
-- from deleting a person: their recipient rows simply go with them.
--
-- Access: only users in public.admins can read or change recipients or list
-- candidates. anon gets nothing.

-------------------------------------------------------------------------------
-- 0. Pre-flight: prerequisites present, names free
-------------------------------------------------------------------------------

do $$
declare
  problems text[] := '{}';
  col text;
begin
  if to_regclass('public.series') is null or to_regprocedure('public.is_admin()') is null then
    problems := problems || 'public.series / public.is_admin() missing: run 20261124120000_series_and_admins.sql first'::text;
  end if;
  if to_regclass('public.person') is null then
    problems := problems || 'public.person (GracePlace Words member list) missing'::text;
  else
    foreach col in array array['id', 'name', 'email', 'auth_user_id', 'removed_at', 'is_congregation'] loop
      if not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'person' and column_name = col) then
        problems := problems || ('public.person has no column ' || col);
      end if;
    end loop;
  end if;

  if to_regclass('public.series_recipients') is not null then
    problems := problems || 'relation public.series_recipients already exists'::text;
  end if;
  if to_regclass('public.series_recipients_pkey') is not null then
    problems := problems || 'relation public.series_recipients_pkey already exists'::text;
  end if;
  if to_regclass('public.series_recipients_person_id_idx') is not null then
    problems := problems || 'relation public.series_recipients_person_id_idx already exists'::text;
  end if;
  if to_regprocedure('public.ask_pastor_candidates()') is not null then
    problems := problems || 'function public.ask_pastor_candidates() already exists'::text;
  end if;

  if cardinality(problems) > 0 then
    raise exception 'Migration stopped, nothing was changed: %', array_to_string(problems, '; ');
  end if;
end;
$$;

-------------------------------------------------------------------------------
-- 1. series_recipients
-------------------------------------------------------------------------------

create table public.series_recipients (
  series_id   bigint      not null references public.series (id) on delete cascade,
  person_id   uuid        not null references public.person (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (series_id, person_id)
);

-- For the cascade from person and for "which series is this person on".
create index series_recipients_person_id_idx on public.series_recipients (person_id);

comment on table public.series_recipients is
  'Who is emailed about new questions for each series. People come from the '
  'GracePlace Words member list (public.person); removed people are skipped '
  'when sending.';

revoke all on public.series_recipients from anon, authenticated;
-- authenticated holds these so admins can use them; the policies admit admins only.
grant select, insert, delete on public.series_recipients to authenticated;
-- The notify-question Edge Function reads recipients with the service role.
-- Explicit, because this project does not auto-expose new tables.
grant select on public.series_recipients to service_role;

alter table public.series_recipients enable row level security;

create policy "Admins can see recipients"
  on public.series_recipients for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can add recipients"
  on public.series_recipients for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can remove recipients"
  on public.series_recipients for delete to authenticated
  using ((select public.is_admin()));

-------------------------------------------------------------------------------
-- 2. ask_pastor_candidates(): the people an admin can pick from
--
--    Security definer so church admins can see the member list without any
--    Words permission. Returns only id, name, email and whether the person
--    can open /admin. Excludes removed people and the "whole church"
--    placeholder row (is_congregation), which is not a person and never
--    signs in.
-------------------------------------------------------------------------------

create function public.ask_pastor_candidates()
returns table (id uuid, name text, email text, is_church_admin boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Only GracePlace admins can list pastor candidates.'
      using errcode = '42501';
  end if;

  return query
    select p.id,
           p.name,
           p.email,
           exists (select 1 from public.admins a where a.user_id = p.auth_user_id)
    from public.person p
    where p.removed_at is null
      and not p.is_congregation
    order by lower(p.name), p.id;
end;
$$;

revoke execute on function public.ask_pastor_candidates() from public, anon;
grant execute on function public.ask_pastor_candidates() to authenticated;
