-- ============================================================
-- TicketBook – Migration 012: Robust temporary usernames
-- ============================================================
-- handle_new_user() derived the temporary username straight from
-- the email prefix, which made the insert (and therefore the whole
-- sign-up) fail when:
--   - the prefix was already taken (john@gmail.com, john@yahoo.com)
--   - it was shorter than 3 chars (username_length check)
--   - it had capitals: the regex replaced them with '_' before lower()
-- Social sign-in makes collisions far more likely. The username is
-- temporary either way: new users pick theirs on the username screen.
--
-- display_name/avatar_url also fall back to Google's 'name'/'picture'
-- metadata keys.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_username text;
begin
  v_base := left(
    regexp_replace(lower(coalesce(split_part(new.email, '@', 1), '')), '[^a-z0-9_]', '_', 'g'),
    20
  );
  if char_length(v_base) < 3 then
    v_base := 'user';
  end if;

  v_username := v_base;
  while exists (select 1 from public.users where username = v_username) loop
    v_username := v_base || '_' || substr(md5(random()::text), 1, 6);
  end loop;

  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    v_username,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
