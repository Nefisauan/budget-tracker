create table if not exists public.orbit_ledgers (
  profile_name text primary key,
  pin text not null,
  ledger jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.orbit_ledgers enable row level security;

drop policy if exists "orbit public read" on public.orbit_ledgers;
create policy "orbit public read"
on public.orbit_ledgers for select
to anon
using (true);

drop policy if exists "orbit public insert" on public.orbit_ledgers;
create policy "orbit public insert"
on public.orbit_ledgers for insert
to anon
with check (true);

drop policy if exists "orbit public update" on public.orbit_ledgers;
create policy "orbit public update"
on public.orbit_ledgers for update
to anon
using (true)
with check (true);
