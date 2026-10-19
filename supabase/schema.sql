-- ViralX — Supabase schema. Paste into Supabase → SQL Editor → Run (safe to re-run).
-- Tables: leads (contact + launch forms), newsletter, projects (client portal).

-- ---------------------------------------------------------------- leads
create table if not exists public.leads (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 200),
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company      text,
  category     text,
  platforms    text[],
  budget       text,
  launch_date  date,
  message      text check (char_length(message) <= 5000),
  source       text
);
alter table public.leads enable row level security;
drop policy if exists "anyone can submit a lead" on public.leads;
create policy "anyone can submit a lead" on public.leads for insert to anon, authenticated with check (true);
-- No select policy: leads are only readable from the Supabase dashboard / service role.

-- ---------------------------------------------------------------- newsletter
create table if not exists public.newsletter (
  email       text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at  timestamptz not null default now(),
  source      text
);
alter table public.newsletter enable row level security;
drop policy if exists "anyone can subscribe" on public.newsletter;
create policy "anyone can subscribe" on public.newsletter for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------- client projects
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  title        text not null check (char_length(title) between 1 and 160),
  category     text,
  package      text,
  formats      text[],
  launch_date  date,
  brief        text check (char_length(brief) <= 8000),
  links        text,
  status       text not null default 'brief' check (status in ('brief', 'production', 'review', 'delivered'))
);
create index if not exists projects_user_idx on public.projects (user_id, created_at desc);
alter table public.projects enable row level security;

drop policy if exists "own projects: read"   on public.projects;
drop policy if exists "own projects: create" on public.projects;
drop policy if exists "own projects: edit"   on public.projects;
drop policy if exists "own projects: delete" on public.projects;
create policy "own projects: read"   on public.projects for select to authenticated using (user_id = auth.uid());
-- New briefs always start in 'brief'; only the studio (dashboard / service role) moves status forward.
create policy "own projects: create" on public.projects for insert to authenticated with check (user_id = auth.uid() and status = 'brief');
create policy "own projects: edit"   on public.projects for update to authenticated using (user_id = auth.uid() and status = 'brief') with check (user_id = auth.uid() and status = 'brief');
create policy "own projects: delete" on public.projects for delete to authenticated using (user_id = auth.uid() and status = 'brief');
