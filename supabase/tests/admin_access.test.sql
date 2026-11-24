-- Access test for the series / series_questions / admins rules.
--
-- Run AFTER the migration, in the Supabase SQL editor or with psql.
--
-- Everything happens inside one DO block that always ends by raising an
-- exception, so every row it creates (test users, series, a question) is
-- rolled back, on any database, every time. The exception message is the
-- report:
--     RLS TEST PASSED: 24 checks ...   (expected, nothing was changed)
--     RLS TEST FAILED: ...             (lists each failing check)
--
-- Each check runs as a database role the way the Supabase API runs a request:
-- SET ROLE anon/authenticated plus the JWT claims auth.uid() reads.
-- "member" is a signed-in user who is NOT in public.admins, such as anyone
-- with a GracePlace Words account.
--
-- Note: if another app has a trigger on auth.users inserts that fails for a
-- bare test user, this test stops with that trigger's error instead.

do $$
declare
  admin_id    uuid := gen_random_uuid();
  member_id   uuid := gen_random_uuid();
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
  insert into auth.users (id, email, aud, role) values
    (admin_id,  'rls-test-admin-'  || admin_id  || '@example.invalid', 'authenticated', 'authenticated'),
    (member_id, 'rls-test-member-' || member_id || '@example.invalid', 'authenticated', 'authenticated');
  insert into public.admins (user_id) values (admin_id);

  insert into public.series (name, kind, active)
    values ('RLS test active', 'sunday', true) returning id into active_id;
  insert into public.series (name, kind, active)
    values ('RLS test inactive', 'wednesday', false) returning id into inactive_id;
  insert into public.series_questions (series_id, question)
    values (active_id, 'RLS test question') returning id::text into question_id;

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
