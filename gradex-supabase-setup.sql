-- Gradex: Supabase setup for project dlabuggatsuhbwuixpvd
-- Paste into Supabase → SQL Editor → New query → Run. Safe to re-run.
--
-- What it does:
--   * profiles      one row per account: name, email, role, signed-up time
--                   (filled automatically the moment someone clicks "Create account")
--   * scores        a student's saved marks
--   * feedback      student / faculty feedback
--   * interventions teacher intervention tracker
-- Passwords are never stored in these tables. Supabase Auth keeps them hashed
-- in its own auth.users table (Authentication → Users in the dashboard).

-- ============ PROFILES ============
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'student' check (role in ('student','teacher','admin')),
  student_id  text,
  created_at  timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles enable row level security;

-- current user's role (security definer avoids RLS recursion)
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles: staff read all" on public.profiles;
create policy "profiles: staff read all" on public.profiles
  for select to authenticated using (public.my_role() in ('teacher','admin'));
-- No insert/update policy on purpose: users can't give themselves a role.
-- Change roles from the SQL editor (see the bottom of this file).

-- save every new sign-up into profiles automatically
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- backfill anyone who signed up before this ran
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)), 'student'
from auth.users u
on conflict (id) do update set email = excluded.email;

-- ============ SCORES ============
create table if not exists public.scores (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  scores      jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.scores enable row level security;

drop policy if exists "scores: own rows" on public.scores;
create policy "scores: own rows" on public.scores
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ FEEDBACK ============
create table if not exists public.feedback (
  id          text primary key,
  type        text,
  sid         text,
  cls         text,
  subj        text,
  rating      numeric,
  text        text,
  by_name     text,
  created_at  timestamptz not null default now()
);
alter table public.feedback enable row level security;

drop policy if exists "feedback: signed-in read" on public.feedback;
create policy "feedback: signed-in read" on public.feedback
  for select to authenticated using (true);

drop policy if exists "feedback: signed-in insert" on public.feedback;
create policy "feedback: signed-in insert" on public.feedback
  for insert to authenticated with check (true);

-- ============ INTERVENTIONS ============
create table if not exists public.interventions (
  id          text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.interventions enable row level security;

drop policy if exists "interventions: staff all" on public.interventions;
create policy "interventions: staff all" on public.interventions
  for all to authenticated
  using (public.my_role() in ('teacher','admin'))
  with check (public.my_role() in ('teacher','admin'));

-- make the new tables visible to the website immediately
notify pgrst, 'reload schema';

-- ============ MAKE SOMEONE A TEACHER OR ADMIN ============
-- update public.profiles set role = 'admin'   where email = 'you@example.com';
-- update public.profiles set role = 'teacher' where email = 'teacher@example.com';

-- ============ SEE WHO HAS SIGNED UP ============
-- select full_name, email, role, created_at from public.profiles order by created_at desc;
