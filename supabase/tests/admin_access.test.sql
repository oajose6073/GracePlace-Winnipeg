-- Access test for the series / series_questions / admins rules, and, once
-- 20261125120000_series_recipients.sql has been run, for series_recipients
-- and ask_pastor_candidates().
--
-- Run AFTER the migrations, in the Supabase SQL editor or with psql.
--
-- Everything happens inside one DO block that always ends by raising an
-- exception, so every row it creates (test users, series, a question,
-- recipients) is rolled back, on any database, every time. The exception
-- message is the report:
--     RLS TEST PASSED: N checks ...    (expected, nothing was changed)
--     RLS TEST FAILED: ...             (lists each failing check)
-- N is 24 before the recipients migration and 44 after it.
--
-- Each check runs as a database role the way the Supabase API runs a request:
-- SET ROLE anon/authenticated plus the JWT claims auth.uid() reads.
-- "member" is a signed-in user who is NOT in public.admins, such as anyone
-- with a GracePlace Words account.
--
-- GracePlace Words shares this Supabase project and is invite-only: its
-- trigger app.handle_new_auth_user() refuses any new auth user whose email is
-- not on the Words member list (public.person). So the test first puts its two
-- throwaway emails on that list. Those person rows are rolled back with
-- everything else; the Words trigger itself is not touched.
--
-- The one thing a rollback does not undo is the series id sequence: ids used
-- by the test's series are skipped, so the next real series id has a gap.

do $$
declare
  admin_id     uuid := gen_random_uuid();
  member_id    uuid := gen_random_uuid();
  admin_email  text := 'rls-test-admin-'  || admin_id  || '@example.invalid';
  member_email text := 'rls-test-member-' || member_id || '@example.invalid';
  removed_email text := 'rls-test-removed-' || gen_random_uuid() || '@example.invalid';
  admin_person  uuid;
  member_person uuid;
  congregation  uuid;
  has_recipients boolean := to_regclass('public.series_recipients') is not null
                            and to_regprocedure('public.ask_pastor_candidates()') is not null;
  active_id   bigint;
  inactive_id bigint;
  question_id text;
  c           record;
  n           bigint;
  state       text;
  got         text;
  passed      int := 0;
  failures    text[] := '{}';
begin
  -- Fixtures (as the caller, i.e. the table owner) --------------------------

  -- Words member list first, so its sign-up trigger accepts the test users.
  -- Dynamic SQL so the test also runs on a database without Words.
  if to_regclass('public.person') is not null then
    execute 'insert into public.person (name, email) values ($1, $2) returning id'
      into admin_person using 'RLS test admin', admin_email;
    execute 'insert into public.person (name, email) values ($1, $2) returning id'
      into member_person using 'RLS test member', member_email;
  end if;

  insert into auth.users (id, email, aud, role) values
    (admin_id,  admin_email,  'authenticated', 'authenticated'),
    (member_id, member_email, 'authenticated', 'authenticated');
  insert into public.admins (user_id) values (admin_id);

  insert into public.series (name, kind, active)
    values ('RLS test active', 'sunday', true) returning id into active_id;
  insert into public.series (name, kind, active)
    values ('RLS test inactive', 'wednesday', false) returning id into inactive_id;
  insert into public.series_questions (series_id, question)
    values (active_id, 'RLS test question') returning id::text into question_id;

  if has_recipients then
    -- The member is assigned to the active series; a removed person exists.
    execute 'insert into public.series_recipients (series_id, person_id) values ($1, $2)'
      using active_id, member_person;
    execute 'insert into public.person (name, email, removed_at) values ($1, $2, now())'
      using 'RLS test removed', removed_email;
    execute 'select id from public.person where is_congregation limit 1' into congregation;

    -- The function's shape: exactly these four columns, security definer,
    -- search_path pinned.
    if pg_get_function_result('public.ask_pastor_candidates()'::regprocedure)
       <> 'TABLE(id uuid, name text, email text, is_church_admin boolean)' then
      failures := failures || ('ask_pastor_candidates() returns '
        || pg_get_function_result('public.ask_pastor_candidates()'::regprocedure));
    else
      passed := passed + 1;
    end if;
    if not exists (select 1 from pg_proc
                   where oid = 'public.ask_pastor_candidates()'::regprocedure
                     and prosecdef and proconfig @> array['search_path=""']) then
      failures := failures || 'ask_pastor_candidates() is not security definer with search_path pinned'::text;
    else
      passed := passed + 1;
    end if;
  end if;

  -- Checks -------------------------------------------------------------------
  -- expect: 'rows=N' (statement succeeded and touched/returned N rows)
  --      or 'refused' (SQLSTATE 42501: no privilege, or row-level security)
  for c in
    select * from (values
      -- signed in, NOT an admin: no questions, no series writes
      ('member', 'cannot read any question',
         'select * from public.series_questions', 'rows=0'),
      ('member', 'cannot read the test question by id',
         format('select * from public.series_questions where id::text = %L', question_id), 'rows=0'),
      ('member', 'cannot mark a question answered',
         format('update public.series_questions set answered = true where id::text = %L', question_id), 'rows=0'),
      ('member', 'cannot insert a question',
         format('insert into public.series_questions (series_id, question) values (%s, %L)', active_id, 'member q'), 'refused'),
      ('member', 'cannot delete questions',
         'delete from public.series_questions', 'refused'),
      ('member', 'cannot create a series',
         'insert into public.series (name, kind, active) values (''member series'', ''sunday'', true)', 'refused'),
      ('member', 'cannot rename a series',
         format('update public.series set name = %L where id in (%s, %s)', 'hijacked', active_id, inactive_id), 'rows=0'),
      ('member', 'cannot activate a series',
         format('update public.series set active = true where id = %s', inactive_id), 'rows=0'),
      ('member', 'cannot delete a series',
         format('delete from public.series where id = %s', active_id), 'refused'),
      ('member', 'sees only the active test series',
         format('select * from public.series where id in (%s, %s)', active_id, inactive_id), 'rows=1'),
      ('member', 'cannot see the admins list',
         'select * from public.admins', 'rows=0'),
      ('member', 'cannot add themselves as admin',
         format('insert into public.admins (user_id) values (%L)', member_id), 'refused'),
      ('member', 'is_admin() is false',
         'select 1 where public.is_admin()', 'rows=0'),
      -- anon (the public site)
      ('anon', 'cannot read questions',
         'select * from public.series_questions', 'refused'),
      ('anon', 'cannot ask about an inactive series',
         format('insert into public.series_questions (series_id, question) values (%s, %L)', inactive_id, 'anon q'), 'refused'),
      ('anon', 'cannot ask without a series',
         'insert into public.series_questions (question) values (''anon q'')', 'refused'),
      ('anon', 'can ask about an active series',
         format('insert into public.series_questions (series_id, question) values (%s, %L)', active_id, 'anon q'), 'rows=1'),
      ('anon', 'sees only the active test series',
         format('select * from public.series where id in (%s, %s)', active_id, inactive_id), 'rows=1'),
      ('anon', 'cannot create a series',
         'insert into public.series (name, kind) values (''anon series'', ''sunday'')', 'refused'),
      -- admin: positive controls, so the checks above cannot pass vacuously
      ('admin', 'can read the test question',
         format('select * from public.series_questions where id::text = %L', question_id), 'rows=1'),
      ('admin', 'can mark it answered',
         format('update public.series_questions set answered = true where id::text = %L', question_id), 'rows=1'),
      ('admin', 'sees the inactive series too',
         format('select * from public.series where id in (%s, %s)', active_id, inactive_id), 'rows=2'),
      ('admin', 'can create a series',
         'insert into public.series (name, kind) values (''admin series'', ''wednesday'')', 'rows=1'),
      ('admin', 'can rename and activate a series',
         format('update public.series set name = %L, active = true where id = %s', 'renamed', inactive_id), 'rows=1')
    ) as t(who, label, q, expect)
    -- series_recipients and ask_pastor_candidates(), once that migration ran
    union all
    select * from (values
      -- signed in, NOT an admin
      ('member', 'cannot read series recipients',
         'select * from public.series_recipients', 'rows=0'),
      ('member', 'cannot add a recipient',
         format('insert into public.series_recipients (series_id, person_id) values (%s, %L)', inactive_id, member_person), 'refused'),
      ('member', 'cannot remove a recipient',
         'delete from public.series_recipients', 'rows=0'),
      ('member', 'cannot change a recipient',
         format('update public.series_recipients set series_id = %s', inactive_id), 'refused'),
      ('member', 'cannot call ask_pastor_candidates()',
         'select * from public.ask_pastor_candidates()', 'refused'),
      -- anon
      ('anon', 'cannot read series recipients',
         'select * from public.series_recipients', 'refused'),
      ('anon', 'cannot add a recipient',
         format('insert into public.series_recipients (series_id, person_id) values (%s, %L)', active_id, admin_person), 'refused'),
      ('anon', 'cannot remove recipients',
         'delete from public.series_recipients', 'refused'),
      ('anon', 'cannot call ask_pastor_candidates()',
         'select * from public.ask_pastor_candidates()', 'refused'),
      -- admin: positive controls
      ('admin', 'can read the test recipient',
         format('select * from public.series_recipients where series_id = %s', active_id), 'rows=1'),
      ('admin', 'can add a recipient',
         format('insert into public.series_recipients (series_id, person_id) values (%s, %L)', inactive_id, admin_person), 'rows=1'),
      ('admin', 'can remove a recipient',
         format('delete from public.series_recipients where series_id = %s and person_id = %L', active_id, member_person), 'rows=1'),
      ('admin', 'candidates include both test people',
         format('select * from public.ask_pastor_candidates() where email in (%L, %L)', admin_email, member_email), 'rows=2'),
      ('admin', 'candidates mark the church admin',
         format('select * from public.ask_pastor_candidates() where email = %L and is_church_admin', admin_email), 'rows=1'),
      ('admin', 'candidates mark the non-admin',
         format('select * from public.ask_pastor_candidates() where email = %L and not is_church_admin', member_email), 'rows=1'),
      ('admin', 'candidates exclude removed people',
         format('select * from public.ask_pastor_candidates() where email = %L', removed_email), 'rows=0'),
      ('admin', 'candidates exclude the whole-church placeholder',
         format('select * from public.ask_pastor_candidates() where id = %L', congregation), 'rows=0'),
      ('admin', 'still cannot change a recipient in place (delete and re-add instead)',
         format('update public.series_recipients set series_id = %s', inactive_id), 'refused')
    ) as r(who, label, q, expect)
    where has_recipients
  loop
    begin
      perform set_config('request.jwt.claims', json_build_object(
        'sub', case c.who when 'admin' then admin_id when 'member' then member_id end,
        'role', case c.who when 'anon' then 'anon' else 'authenticated' end)::text, true);
      -- older auth.uid() implementations read this setting instead
      perform set_config('request.jwt.claim.sub', case c.who
        when 'admin' then admin_id::text when 'member' then member_id::text else '' end, true);
      execute format('set local role %I', case c.who when 'anon' then 'anon' else 'authenticated' end);

      if c.q ~* '^\s*select' then
        -- x::text forces every selected expression to be evaluated
        execute format('select coalesce(sum(1 + 0 * length(x::text)), 0) from (%s) x', c.q) into n;
      else
        execute c.q;
        get diagnostics n = row_count;
      end if;
      -- Undo this check's writes and its role switch, keep the result.
      raise exception using errcode = 'P0001', message = '__ok__' || n;
    exception when others then
      get stacked diagnostics state = returned_sqlstate;
      got := case
        when sqlerrm like '\_\_ok\_\_%' then 'rows=' || substr(sqlerrm, 7)
        when state = '42501' then 'refused'
        else 'error ' || state || ': ' || sqlerrm
      end;
    end;

    if got = c.expect then
      passed := passed + 1;
    else
      failures := failures || format('[%s] %s: expected %s, got %s', c.who, c.label, c.expect, got);
    end if;
  end loop;

  -- Report, and roll back everything above ------------------------------------
  if cardinality(failures) = 0 then
    raise exception 'RLS TEST PASSED: % checks. (Reported as an error on purpose: it rolls back the test data.)', passed;
  else
    raise exception 'RLS TEST FAILED: % passed, % failed: %',
      passed, cardinality(failures), array_to_string(failures, ' | ');
  end if;
end;
$$;
